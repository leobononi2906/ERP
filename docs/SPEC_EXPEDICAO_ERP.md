# SPEC — Expedição unificada dentro do ERP

> Criado 18/08/2026. Decisões travadas com o Leo nesta data.
> Objetivo: trazer **toda** a expedição pra dentro do ERP, aposentando o app separado `bononi-exped`.

## Por que existe (o problema)

Hoje a expedição está espalhada em **dois** lugares, e um deles depende do sistema que vamos desligar:

1. **ERP nativo** — tabela `expedicoes` / `expedicoes_itens` (schema `Teste ERP`), tela **Separação**.
   Fluxo: solicita → assume → separa (picking 78mm) → registra entrega (Vendas/Pátio).
   Nasce da Venda/OS do ERP. **1 picking por documento.**
   Não tem: picking consolidado, destino Expedição, bipagem anti-erro, nº de série, Bling.

2. **App `bononi-exped`** — tabelas `exp_*` (schema `public`), app à parte.
   Fluxo completo: picking (com `exp_pickings`/`exp_picking_docs` = agrupamento de docs), conferência cega, nº de série, etiqueta v3, romaneio, transportadora.
   **Se alimenta do Firebird** (`vw_comercial_docs_faturados`) + **Bling** — ou seja, do sistema velho.

Conforme o ERP assume o faturamento, a expedição precisa nascer **do ERP**. Daí unificar tudo aqui.

## Glossário Bononi

- **Boqueta** = a estação/pessoa **única** de separação. Ela separa e dá o **destino** de cada pedido.
- **Destino** de um pedido separado: **Balcão** (entrega na hora) · **Pátio** · **Expedição** (vai pra área de despacho).
  "Expedição" é só um **aviso/flag** de que aquele pedido segue pra ser empacotado e despachado.

## Decisões travadas (18/08)

1. **Rota/destino**: a boqueta é uma só; ela decide Balcão / Pátio / Expedição ao separar. Expedição é aviso.
2. **Picking consolidado (em lote / onda)**: marketplace tem muito pedido pequeno → precisa sair **1 picking juntando vários pedidos, somando as quantidades por produto**. A boqueta anda uma vez e pega tudo. *(Reaproveitar o conceito de `exp_pickings` + `exp_picking_docs`.)*
3. **Conferência boqueta→expedição**: assinada **no papel** (ticket de separação). **Não** precisa ERP.
4. **Anti-erro fica na EXPEDIÇÃO** (empacotar/despachar): **bipagem ao empacotar** — o operador bipa cada produto ao montar a caixa; o sistema confere contra a lista do pedido e **só deixa fechar o volume quando bate 100%**. Produto trocado fica impossível.
5. **Número de série**: para os produtos **marcados** como "exige série", bipar a etiqueta física na expedição. Resto passa direto.
6. **Bling**: pedidos já vêm faturados. *Default (ajustável):* entram como pedido normal na boqueta, agrupados no picking consolidado, e seguem pra Expedição. (Leo ainda não fechou este ponto.)
7. **Aposentar `bononi-exped`** conforme as fases sobem.

## Modelo de dados (dentro do ERP, schema `Teste ERP`)

Reaproveitar `expedicoes` / `expedicoes_itens`, que já têm:
- `expedicoes`: numero, id_empresa, id_venda, id_os, status, transportadora, rastreamento, id_separador, datas, `entregue_para`.
- `expedicoes_itens`: id_produto, id_venda_item, id_os_peca, `quantidade_pedida`, `quantidade_separada`, **`quantidade_expedida`** (já existe → serve pra bipagem), consumo, motivo_falta.

Produto para bipagem: `produtos.codigo_barras` (varchar) + `produtos.codigo` (sequencial interno) + `produtos.referencia`.

### Acréscimos previstos (a aplicar por fase)
- `expedicoes.destino` — `BALCAO` | `PATIO` | `EXPEDICAO` (default derivado: tem transportadora → EXPEDICAO; senão BALCAO; com override).
- `expedicoes.origem` — `VENDA` | `OS` | `BLING`.
- **Picking consolidado**: `erp_pickings` (numero, status, criado_por, datas) + `erp_picking_docs` (id_picking, id_expedicao) — 1 picking agrupa N expedições. Picking imprime **produtos somados** + quebra por pedido pra distribuição.
- **Expedição/volumes**: `expedicoes.qtd_volumes`, `num_nf`, `chave_nfe`; tabela de volumes/caixas se necessário.
- **Nº de série**: config `produto_exige_serie` + tabela `expedicao_series` (id_item, id_produto, serie bipada).

## Fases

- **Fase 1 — Picking consolidado + destino. ✅ FEITO (18/08).**
  Na tela **Separação**: checkbox nas linhas SOLICITADA → "Gerar picking consolidado" → cria 1 onda (`erp_pickings`) agrupando os produtos (soma qtd). View da onda mostra produtos somados + quebra por pedido, imprime bobina, e define **destino** (Balcão/Pátio/Expedição) em massa ou por pedido (`expedicoes.destino`). "Ondas em aberto" listadas no topo da fila. Backend: `erp_picking_gerar/dados/concluir/cancelar/definir_destino/erp_pickings_listar` (testados). Destino só marca roteamento — NÃO baixa estoque (isso é a Fase 2). Confirmação de separação por pedido segue no detalhe existente (botão "Separar/conferir" na onda).
- **Fase 2 — Expedição anti-erro (bipagem ao empacotar).**
  Fila de Expedição (pedidos com destino=EXPEDICAO). Tela de empacotamento: bipa produto por produto contra a lista; fecha o volume só a 100%. Produtos marcados pedem nº de série. Gera volume/etiqueta.
- **Fase 3 — Bling → fila.**
  Import dos pedidos do marketplace (Edge) pra `expedicoes` origem=BLING. Entram no picking consolidado. (Ponto de entrada exato a confirmar com o Leo.)
- **Fase 4 — Etiqueta própria + romaneio + transportadora no despacho.**
  Portar etiqueta v3 e romaneio do `bononi-exped`.

## Desligamento do `bononi-exped`
Só desligar o app quando a fase equivalente estiver no ar e testada no ERP. Ordem sugerida: manter o `bononi-exped` vivo até Fase 2 (expedição) rodar; depois migrar Bling (Fase 3) e etiqueta/romaneio (Fase 4); então tirar do ar.
