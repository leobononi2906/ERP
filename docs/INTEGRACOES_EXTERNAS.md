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

## Próximos passos (quando for construir)
1. **Ler o `exp-sync-erp`** e o schema de `exp_bling_pedidos_raw` — ver o que já faz.
2. Definir com o Leo as 4 decisões acima (principalmente estoque).
3. Construir a camada de reconciliação (RPC/cron): raw → venda/estoque/financeiro do ERP, idempotente.
4. Painel de "pedidos externos" no ERP (status da sync, erros, não-conciliados).

**Status: PLANO. Não construir ainda — depende das decisões (sobretudo fonte da verdade do estoque).**
