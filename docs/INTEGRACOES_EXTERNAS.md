# Integrações externas — como o ERP recebe dados (Bling, ML, marketplaces)

> Pergunta do Leo (18/08): "como vamos receber dados externos, ex. Bling, vendas do ML etc." Este doc é o plano. **Descoberta central: NÃO é do zero — o grupo já tem uma integração madura rodando no mesmo Supabase.**

## O que JÁ existe (inventário)
Edge Functions ativas + tabelas neste projeto (`vishxwdxqiygbxmtpfoy`), do ecossistema de dashboards:
- **Bling (hub):** `bling-callback` (OAuth), `bling-proxy` (token c/ cache+lock), `bling-sync`, `exp-sync-bling`, `exp-sync-itens`, `exp-import-bling-historico`, `bling-callback-expedicao`. Landing: **`exp_bling_pedidos_raw`** (pedidos crus), `exp_bling_sync_control`, `bling_produtos_sync`, `bling_sync_log`, `exp_bling_contas`.
- **`exp-sync-erp`** — LIDO (18/08): NÃO é o consumidor do ERP novo. É o sync da **EXPEDIÇÃO/logística** — puxa docs faturados da réplica Firebird (`vw_comercial_docs_faturados`) pro picking (`exp_documentos`/`exp_itens`) e **EXCLUI marketplaces** (`VENDEDORES_MKT` = ML Bononi, ML Battogo, Shopee, ML Full). Não serve de base.
- **`exp_bling_pedidos_raw`** = a FONTE REAL: **1316 pedidos** com `payload` completo do Bling (`id_pedido_bling`, `numero_pedido`, `payload`, `importado`, `exp_documento_id`, `recebido_em`). Hoje é consumido pela expedição; **o ERP novo ainda NÃO lê daqui**. É deste payload que a reconciliação do ERP deve nascer.
- **Marketplace/ecom:** `ecom_pedidos`, `vw_ecom_marketplace`, `fin_vendas_canal`, `Ecomm_UMBLER`, `umbler-intake`, `fetch-comercial`.

## Recomendação de arquitetura
1. **Bling é o HUB.** ML, Shopee, site, etc. já entram no Bling (que também emite NF e agrega pedidos). **NÃO reintegrar cada marketplace** direto — puxa tudo do Bling. Um conector, não N.
2. **A ingestão já roda** (OAuth + proxy + sync + landing cru). O trabalho do ERP é o **CONSUMIDOR/RECONCILIAÇÃO**, não a captura.
3. **Fluxo:** `exp_bling_pedidos_raw` (cru) → camada de mapeamento → materializa no ERP (venda + baixa estoque + título/financeiro). **Idempotente por id externo** (upsert, nunca duplica pedido). Webhook (`bling-callback`) pra quase-tempo-real + **cron de reconciliação** como rede de segurança.
4. **Mapeamentos que precisam ser resolvidos:** SKU do Bling ↔ `produtos` do ERP; canal/loja ↔ `empresa`; cliente do marketplace ↔ `clientes` (ou cliente genérico do canal).

## Modelo DEFINIDO pelo Leo (18/08) ✅ — decisões resolvidas
Fluxo é **um só sentido: Bling → ERP**. Por pedido de marketplace que chega:
- **Estoque:** o Bling **baixa o estoque no ERP** (o ERP é o estoque; o pedido do Bling dispara a baixa). Sentido único = **sem baixa dobrada**. Não há o problema de "dois donos".
- **Venda + Financeiro:** pra cá vem **a venda** (registrada como canal marketplace/Bling) **e o financeiro** (título). Provavelmente já como venda faturada/paga conforme o repasse.
- **NF:** **emitida no Bling** — o ERP **NÃO reemite**, só registra a referência.
- **Produtos/preços:** sincronizar cadastro Bling↔ERP (SKU, preço, foto) — já há `bling_produtos_sync`.

**Consequência p/ a construção:** a camada de reconciliação do ERP consome o pedido cru (`exp_bling_pedidos_raw`) e materializa: (1) baixa estoque, (2) cria venda (canal), (3) gera título. Idempotente por id do pedido Bling. Sem NF.

## 🧪 Diagnóstico real (18/08) + CAMADA DE TRATAMENTO (pedido do Leo)
Problema do Leo: "qualquer erro no Bling vem tudo zuado pro ERP". Rodei um diagnóstico nos **303 payloads** com conteúdo:
- **205 (68%) SEM ITENS** — o maior problema. O Bling emite o pedido ANTES dos itens chegarem.
- **75 (25%) sem documento do cliente.**
- 0 com total inválido · **1 SKU não mapeado** (o mapa `bling_produtos_sync` cobre bem).
- **Só 43 (14%) passariam limpos.**

**Camada de tratamento (validar ANTES de virar venda no ERP):**
1. **Gate de completude/validação** por pedido: exige `itens` não-vazio + `contato.numeroDocumento` + `total>0` + todo SKU mapeado em `bling_produtos_sync` + `situacao` válida (só faturado/atendido) + idempotência por `id_pedido_bling`.
2. **Incompleto (sem itens) NÃO entra** — vai pra fila de **RE-BUSCA**: busca o pedido completo no Bling via `bling-proxy` e revalida na próxima rodada (não descarta, não ingere zuado).
3. **Inválido de verdade** (SKU inexistente, sem cliente após re-busca) → **QUARENTENA** (tabela `bling_pedidos_quarentena` com motivo) + tela de revisão. Nunca entra no ERP automático.
4. **Só o pedido COMPLETO E VÁLIDO** materializa: venda (canal) + título + concilia baixa de estoque.

Mapa payload Bling → ERP: `contato{nome,numeroDocumento,tipoPessoa}`→cliente; `itens[].codigo`(SKU)→`bling_produtos_sync`→produto; `itens[]{quantidade,valor}`→itens da venda; `total`→título; `loja.unidadeNegocio`→empresa; `notaFiscal`→referência (Bling emite); `parcelas`→condição/títulos; `situacao`→gate.

## 🧱 PADRÃO REUSÁVEL de integração (decisão do Leo: serve pra qualquer API futura)
A camada NÃO é "do Bling" — é um **framework de ingestão**. Nova API = trocar só o conector, mantendo as etapas:
1. **Landing raw** por fonte: payload cru + `id_externo` + flag `importado` (Bling: `exp_bling_pedidos_raw`).
2. **Validador por fonte** — função `<fonte>_pedido_validar(payload)` com o MESMO contrato de saída: `{ok, acao: INGERIR|REBUSCAR|QUARENTENA, motivos[]}`.
3. **Quarentena ÚNICA e genérica:** `public.bling_pedidos_quarentena` agora tem coluna **`fonte`** (BLING e futuras). Uma tela de revisão só, filtrando por fonte.
4. **Materializador por fonte:** mapeia payload → venda/cliente/estoque/financeiro do ERP. **Idempotente por (fonte, id_externo).**
5. **Re-busca por fonte:** chama a API da fonte (Bling: `bling-proxy`) pros incompletos.
> Ao integrar outra API (ex.: site próprio, ERP de parceiro), reaproveita 2–5 e escreve só o validador + o mapeamento daquela fonte.

## 👤 Regra do cliente (marketplace) — decisão do Leo
Ao materializar, se o cliente do pedido não existe no ERP, **CRIA automaticamente** a partir do `contato` do payload (nome + `numeroDocumento`):
- **Confirmado** (situação ATIVO — não precisa validar cadastro; veio do marketplace).
- **Categoria = MARKETPLACE** (marcar o canal de origem).
- **SEM limite de crédito** (`limite_credito=0`, `permite_prazo=false`) — o marketplace já recebeu, não há risco de crédito.
Isso também derruba parte da quarentena "sem_documento_cliente" quando o doc vier no contato.

## ✅ CONSTRUÍDO E TESTADO 18/08 (ambiente de teste com dados do Bling)
- **Catálogo de teste:** 29 produtos do Bling criados no ERP (`erp_produto_salvar`; código sequencial próprio, `referencia`=SKU Bling, nome+preço do payload). + estoque/custo de teste (50 un, custo 55%) no centro principal da empresa 1.
- **Faturamento → DRE provado ponta a ponta:** venda de teste 473 (nº 000223) com 2 produtos do Bling, faturada à vista. Resultado: **Receita** "Venda Produtos Nacional" R$4.166,26 (rateio → plano de contas), **Título** 1/1 PAGO, **CMV** R$2.291,44, **Margem 45%** (R$1.874,82). O ambiente serve pra testar produto+faturamento+DRE.
- **Camada de tratamento (validação + quarentena) — CONSTRUÍDA:**
  - `public.erp_bling_pedido_validar(payload jsonb)` → classifica: **INGERIR** (ok), **REBUSCAR** (sem itens — Bling manda antes dos itens), **QUARENTENA** (sem doc cliente / SKU não mapeado / total inválido), com motivos.
  - Tabela `public.bling_pedidos_quarentena` (id_pedido_bling, numero, acao, motivos, resolvido).
  - **Rodado nos 303:** 43 INGERIR · 205 REBUSCAR · 55 QUARENTENA → 260 barrados foram pra quarentena. **Nada zuado entra automático.**
- **Falta (próxima peça):** o materializador (INGERIR → cria venda/título/estoque idempotente por id_pedido_bling), o job de RE-BUSCA (chama bling-proxy), cron, e a tela de quarentena.

## Próximos passos (quando for construir)
1. **Ler o `exp-sync-erp`** e o schema de `exp_bling_pedidos_raw` — ver o que já faz.
2. Definir com o Leo as 4 decisões acima (principalmente estoque).
3. Construir a camada de reconciliação (RPC/cron): raw → venda/estoque/financeiro do ERP, idempotente.
4. Painel de "pedidos externos" no ERP (status da sync, erros, não-conciliados).

**Status: PLANO. Não construir ainda — depende das decisões (sobretudo fonte da verdade do estoque).**
