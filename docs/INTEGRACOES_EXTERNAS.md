# Integrações externas — como o ERP recebe dados (Bling, ML, marketplaces)

> Pergunta do Leo (18/08): "como vamos receber dados externos, ex. Bling, vendas do ML etc." Este doc é o plano. **Descoberta central: NÃO é do zero — o grupo já tem uma integração madura rodando no mesmo Supabase.**

## O que JÁ existe (inventário)
Edge Functions ativas + tabelas neste projeto (`vishxwdxqiygbxmtpfoy`), do ecossistema de dashboards:
- **Bling (hub):** `bling-callback` (OAuth), `bling-proxy` (token c/ cache+lock), `bling-sync`, `exp-sync-bling`, `exp-sync-itens`, `exp-import-bling-historico`, `bling-callback-expedicao`. Landing: **`exp_bling_pedidos_raw`** (pedidos crus), `exp_bling_sync_control`, `bling_produtos_sync`, `bling_sync_log`, `exp_bling_contas`.
- **`exp-sync-erp`** ⚠️ já existe — provável embrião do consumidor pro ERP. **Examinar antes de construir.**
- **Marketplace/ecom:** `ecom_pedidos`, `vw_ecom_marketplace`, `fin_vendas_canal`, `Ecomm_UMBLER`, `umbler-intake`, `fetch-comercial`.

## Recomendação de arquitetura
1. **Bling é o HUB.** ML, Shopee, site, etc. já entram no Bling (que também emite NF e agrega pedidos). **NÃO reintegrar cada marketplace** direto — puxa tudo do Bling. Um conector, não N.
2. **A ingestão já roda** (OAuth + proxy + sync + landing cru). O trabalho do ERP é o **CONSUMIDOR/RECONCILIAÇÃO**, não a captura.
3. **Fluxo:** `exp_bling_pedidos_raw` (cru) → camada de mapeamento → materializa no ERP (venda + baixa estoque + título/financeiro). **Idempotente por id externo** (upsert, nunca duplica pedido). Webhook (`bling-callback`) pra quase-tempo-real + **cron de reconciliação** como rede de segurança.
4. **Mapeamentos que precisam ser resolvidos:** SKU do Bling ↔ `produtos` do ERP; canal/loja ↔ `empresa`; cliente do marketplace ↔ `clientes` (ou cliente genérico do canal).

## Pontos de atenção / decisões do Leo (ANTES de construir)
- **Fonte da verdade do ESTOQUE** 🔴 o mais crítico: hoje o Bling controla estoque dos marketplaces. Se o ERP também controlar, os dois brigam / baixa dobrada. Decidir: (a) ERP passa a ser a fonte e empurra saldo pro Bling, ou (b) Bling continua dono do estoque de marketplace e o ERP só espelha. Não dá pra ter dois donos.
- **O que o pedido de marketplace vira no ERP?** Venda completa (com financeiro + comissão) ou só movimento de estoque + receita por canal? Provável: vira **venda** já FATURADA (o marketplace já recebeu), gerando título conforme repasse.
- **NF:** quem emite? Se é o Bling, o ERP não emite de novo — só registra.
- **Produtos/preços:** sincronizar cadastro Bling↔ERP (SKU, preço, foto) — já há `bling_produtos_sync`.

## Próximos passos (quando for construir)
1. **Ler o `exp-sync-erp`** e o schema de `exp_bling_pedidos_raw` — ver o que já faz.
2. Definir com o Leo as 4 decisões acima (principalmente estoque).
3. Construir a camada de reconciliação (RPC/cron): raw → venda/estoque/financeiro do ERP, idempotente.
4. Painel de "pedidos externos" no ERP (status da sync, erros, não-conciliados).

**Status: PLANO. Não construir ainda — depende das decisões (sobretudo fonte da verdade do estoque).**
