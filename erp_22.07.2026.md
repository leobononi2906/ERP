# ERP Bononi — Snapshot 22/07/2026 (sessão noturna autônoma)

Execução autorizada por Leo dos 6 blocos do BRIEFING_FASE_VENDAS_OS.md.
Backend 100% no Supabase (14 migrations) + frontend completo (builds ok).

## O que entrou

### Bloco 1 — Orçamento → boqueta, áreas, política de desconto
- `orcamento_converter_venda` v2: PRODUTO vira solicitação de Separação (boqueta), SERVIÇO entra direto. Retorna `numero_sep`.
- Áreas de serviço = tabela `grupos_servico` (+ coluna `codigo`). CRUD na tela Serviços (botão "Áreas de Serviço").
- `os_servicos.id_area`; form de serviço na OS tem cards de área; Distribuição tem coluna e filtro por área.
- Política de desconto valida em TODOS os lançamentos (orçamento, venda serviço, venda produto/boqueta):
  hierarquia produto > subgrupo > grupo > geral, por grupo de acesso do usuário.
  Sem política cadastrada = sem limite. Estourou: quem tem `aprovar` pode liberar na hora (confirm);
  liberação logada em log_acessos como DESCONTO_LIBERADO.

### Bloco 2 — Preço por cliente+produto
- Tabela `precos_cliente_produto` + tela **Preços Especiais** (Cadastros).
- `erp_resolver_preco`: CLIENTE_PRODUTO > tabela do cliente > preço geral. Vendas e Orçamentos usam ao
  selecionar produto (label mostra a origem do preço).

### Bloco 3 — Crédito configurável
- `erp_config` (tabela + RPCs) com aba **Configurações** na Administração:
  `credito_bloqueia_vencido` (S/N), `credito_dias_tolerancia` (nº), `credito_permite_liberacao` (S/N), `op_custo_modo`.
- `venda_faturar` / `os_faturar`: bloqueio por vencido+tolerância e por limite; gestor com `aprovar` pode
  liberar (logado CREDITO_LIBERADO). Limite continua valendo só para pagamento a prazo.

### Bloco 4 — Itens de consumo
- `os_pecas.consumo` + `expedicoes_itens.consumo` + `ordens_servico.valor_consumo`.
- Checkbox "Item de consumo" no Solicitar Peça da OS; passa pela Separação (badge CONSUMO); valor = custo
  médio; NÃO soma no valor cobrado da OS e NÃO gera comissão. `os_recalcular_totais` centraliza os totais.
- FIX importante: `erp_separacao_entregar` agora baixa o estoque na ENTREGA (antes a boqueta reservava e a
  baixa nunca acontecia — gap pré-existente corrigido).

### Bloco 5 — Encomendas
- Tabelas `fornecedores` + `encomendas`; tela **Encomendas** (Comercial) com KPIs e fluxo:
  COTACAO → COTADA → EM_COMPRA → RECEBIDA (ou REPROVADA/CANCELADA).
- Botão "Encomendar" na Venda (form inline) e na OS (aba Peças).
- Aprovar gera item na venda/OS + pedido_compra automático (PC-YYMM-####). Receber dá entrada pelo custo
  real e já reserva para a venda. Faturamento bloqueado enquanto houver encomenda pendente.

### Bloco 6 — Produção (OP) dentro da OS
- `produtos.produzido` (checkbox no cadastro) + `produtos_composicao` (peças/serviços, custo de referência,
  seção Composição no form do produto).
- "Lançar Produção" na aba Peças da OS → item os_pecas produzido (status PENDENTE) → aparece na
  **Distribuição** (roxo, junto com serviços, filtrável por área) → gestor distribui → colaborador aponta
  horas (play/stop na própria linha) → "Concluir": produto entra no estoque e sai na hora para a OS.
- Custo configurável (`op_custo_modo`): COMPOSICAO (referência) ou REAL (consumo vinculado à produção).
- Consumo pode ser vinculado a uma produção específica (select no modal de peça).
- Faturamento da OS bloqueado com produção não concluída.

## Fixes de bugs pré-existentes
1. `OrdensServico.jsx` chamava `os_faturar` com parâmetros posicionais errados — faturamento de OS estava
   quebrado. Corrigido para `{ p: {...} }`.
2. `rpc()` no config.js engolia o erro real do banco ("HTTP 400"); agora mostra a mensagem.
3. Boqueta não baixava estoque na entrega (ver Bloco 4).

## Comissões
os_faturar já gerava comissão de técnico (serviço e peça) e vendedor — mantido; consumo excluído da base.
Relatórios de comissão ficam para depois (dados sendo gravados em `comissoes`).

## Pendências para o Leo testar (checklist no relatório da sessão)
- Nenhuma política de desconto cadastrada ainda ⇒ hoje ninguém tem limite. Cadastrar na aba
  Política de Desconto da Administração.
- Cadastrar fornecedores antes de cotar encomendas.
- Marcar produtos produzidos + montar composições.
- Token do GitHub usado nesta sessão deve ser trocado (ficou registrado em chat).
