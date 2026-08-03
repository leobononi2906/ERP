# Estado atual do ERP — atualizado em 2026-08-03

> Documento de continuidade: resume o que existe hoje, o que foi entregue na última sessão e o que está pendente. Leia isto antes de continuar o desenvolvimento.

## Contexto de infraestrutura
- **Repositório do app**: `leobononi2906/ERP` (React 18 + Vite 5). Produção publica da branch **`main`** na Vercel (projeto `erp`, domínio `erp-five-chi.vercel.app`).
- **Banco**: Supabase projeto `vishxwdxqiygbxmtpfoy`, schema **`Teste ERP`**. ⚠️ O Supabase é **ambiente de TESTE**. **Produção será em servidor interno (on-premise)** — por isso tudo é PostgreSQL puro/portável. Ver `docs/GUIA-PRODUCAO-ERP.md`.
- **Login de teste**: `Leonardo` / `Bononi@2026` (grupo Administrador).
- **Padrões de código**:
  - `src/config.js`: `rpc(fn, body)`, cores `C`, `fmtBRL`, `num`, `mono`. Login via RPC `login_erp`.
  - Permissões chegam em `usuario.permissoes` com chaves minúsculas (`vendas`, `produtos`, `estoque`, `separacao`, `compras`, `financeiro`, `relatorios`…), cada uma com flags `visualizar/incluir/editar/excluir/aprovar/exportar`.
  - `src/ui.jsx`: `cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton, SelectBusca`.
  - `src/print.jsx`: impressão (documentos + etiquetas Code128) — funções puras.
  - `src/nav.js`: navegação com contexto entre páginas (`irPara(pagina, ctx)` + evento `erp-nav`).
  - `src/EtiquetasLoteModal.jsx`: modal de etiquetas em lote (reutilizado em Produtos e Entradas).

## Entregue na sessão de 2026-08-03 (PRs #1–#12, todos em produção)

### Relatórios e DRE
- Página **Relatórios** (`src/pages/Relatorios.jsx`): abas Vendas, Compras, Produtos, Clientes — cada uma com seletor de modelo/agrupamento + filtros, tabela genérica, Exportar CSV e Imprimir. Aba **DRE** (demonstração do resultado).
- RPCs: `erp_rel_vendas`, `erp_rel_compras`, `erp_rel_produtos`, `erp_rel_clientes`, `erp_dre`.

### Produtos
- **Preços por empresa/tabela** (seção no editor): por empresa e por tabela de preço, escolha **Markup / Margem fixa / Preço manual**; usa `produto_precos_dados` e `produto_preco_salvar`.
- **IPI** exibido na aba fiscal (vem do grupo tributário).
- **Etiquetas** (Code128, térmica 50×30mm): botão na lista e **modal de lote com quantidade editável por item** (caso da entrada de mercadoria).

### Cadastros
- **Clientes**: validação de **CPF/CNPJ**, máscara de telefone, **busca de CNPJ** (BrasilAPI), limite de crédito só editável por quem tem aprovação, **cliente criado por vendedor nasce sem crédito**; vendedores podem incluir cliente.
- **Veículos**: máscara e validação de **placa** (antiga e Mercosul).

### Impressão
- `src/print.jsx`: **Venda/Recibo**, **OS** (com assinatura), **etiqueta de produto** e **etiqueta de expedição**. Botões nas telas de Venda, OS e Produtos.

### Entradas (NF) — menu Compras
- `src/pages/Entradas.jsx`: recebimento unificado (Compra, Retorno, Devolução, Bonificação, Importação) via Tipo de Operação. **Vincula pedido de compra** → ao finalizar, o pedido vira **RECEBIDO**. Finalizar dá entrada no estoque (custo médio) e opcionalmente gera conta a pagar. Botão de etiquetas com itens recebidos. Usa `erp_entrada_dados/_salvar/_finalizar/_cancelar`, `erp_pedido_compra_detalhe`.

### Tipos de Operação restritos
- Operações como Garantia/Bonificação/Remessa marcadas como **restritas**: vendedor comum não usa (só quem tem aprovação em Vendas). Flag `tipos_saida.restrito`, `erp_pode_tipo_restrito`, bloqueio em `venda_salvar`, toggle em TiposOperacao.

### Devoluções (Comercial) — com aval da boqueta
- `src/pages/Devolucoes.jsx`: devolução é **nova transação** (não altera a venda/OS). Inicia pela Venda/OS (botão **Devolver** → puxa cliente + itens) ou pela própria tela. Total ou parcial.
- **Fluxo em 2 etapas**: **Rascunho → Aguardando boqueta → Confirmada**.
  - **Vendedor** cria e **Solicita** (envia à boqueta). Não gera saldo.
  - **Boqueta = Separação**: só quem tem **permissão de Separação (aprovar)** clica **Confirmar recebimento** → dá entrada no estoque e gera o **saldo a favor do cliente**.
- **Saldo a favor do cliente** (tabela `clientes_creditos`): é saldo financeiro; **uso é manual, operação do Financeiro** (sem abatimento automático no faturamento).
- **Crédito na Venda**: a tela de Vendas mostra, para o cliente selecionado, **disponível a prazo** (limite − em aberto), **limite**, **em aberto**, **saldo a favor** e **alerta de vencidos** (via `erp_cliente_credito`, que reusa `erp_validar_credito`).
- **NF-e de devolução**: gancho (campos gravados; sem emitir).
- RPCs: `erp_devolucao_dados/_origem/_salvar/_solicitar/_confirmar/_cancelar`, `erp_cliente_credito`.

## Migrations (banco)
Aplicadas no Supabase (fonte da verdade). Arquivos em `supabase/migrations/`:
- `34` `erp_rel_vendas` · `35` compras/produtos/clientes · `36` `erp_dre` — **aplicadas no Supabase; arquivos não versionados neste repo** (foram salvos por engano em outro repositório). Reexportar do banco antes do go-live no servidor interno.
- `37` tipos_saida.restrito · `38` erp_usuario_pode + regra de crédito do cliente · `39` devoluções (tabelas `devolucoes`, `devolucoes_itens`, `clientes_creditos` + RPCs) · `40` `erp_cliente_credito` (painel de crédito) · `41` devolução com aval da boqueta.
- `42` conferência de recebimento (`quantidade_conferida` + `erp_entrada_conferir`; finalizar baixa pela qtd conferida) · `43` `erp_estoque_parado` · `44` fix da sobrecarga de auditoria `erp_log` (7 args) · `45` **baixa de estoque no faturamento** (triggers `trg_venda_baixa_estoque` / `trg_os_baixa_estoque` → `erp_baixar_estoque`, idempotente por `movimentou_estoque`).

## Entregue na sessão de 2026-08-03 (continuação — Compras, estoque, fixes)

### Compras (novas telas no menu Compras)
- **Demanda / Sugestão** (`src/pages/Demanda.jsx`): reposição (mín/máx) e giro (consumo) com filtros
  (empresa, modo, grupo/subgrupo, fornecedor, urgência, busca, janela/lead/estoque desejado); edição
  inline de mín/máx (`erp_produto_estoque_limites`); marca itens, ajusta qtd/fornecedor e **gera
  pedido(s) de compra** (um por fornecedor) via `erp_demanda_gerar_pedidos` → navega para Pedidos.
- **Pedidos de Compra** (`src/pages/PedidosCompra.jsx`): lista + editor (cabeçalho + itens), status
  Pendente → Aprovado → Enviado, cancelar; trava em Recebido/Parcial/Cancelado; mostra qtd recebida.
  Usa `erp_pedido_compra_dados/_salvar/_status/_cancelar`.
- **Estoque Parado** (`src/pages/EstoqueParado.jsx`): produtos com saldo e **sem saída** no período;
  filtros empresa/grupo/subgrupo/dias, KPIs (produtos, valor imobilizado, qtd), CSV. RPC `erp_estoque_parado`.

### Conferência de recebimento (Entradas de NF) — migration 42
- Contagem física (modo **cego** opcional) antes de finalizar, com revisão de **divergências**. O
  estoque entra pela **quantidade conferida** (fallback = qtd da NF). Front: `ConferenciaModal` em
  `Entradas.jsx`; RPC `erp_entrada_conferir`.

### OS — serviço a partir do cadastro
- `OrdensServico.jsx`: item de serviço agora tem **seletor da relação de serviços** (`servicos`),
  preenchendo descrição e valor (editável). Antes era só texto livre.

### 🐛 Fix crítico — auditoria `erp_log` (migration 44)
- Recriada a sobrecarga `erp_log(usuario, modulo, acao, tabela, registro, dados_anteriores,
  dados_novos)` que estava ausente e fazia `venda_salvar`, `orcamento_salvar/_reprovar` e
  `encomenda_aprovar` falharem. Salvamentos normalizados.

### 📦 Estoque: baixa no faturamento (regra única) — migration 45
- **Regra definida:** o estoque SAI quando a **Venda/OS é FATURADA** — trigger `AFTER UPDATE OF status`
  baixa itens de PRODUTO/peça ainda não movimentados pelo **helper único** `public.erp_baixar_estoque`
  (grava kardex + valida saldo). **Idempotente** via `movimentou_estoque` (se já saiu na separação,
  pula). Estoque insuficiente **aborta** o faturamento. Testado com rollback.
- **Mapa:** Entra = Entrada NF Finalizar (kardex + custo médio). Sai = faturamento da Venda/OS (ou
  Separação → Entregar, que também usa `erp_baixar_estoque`; Separação → Confirmar só reserva).
  Toda saída real passa por `erp_baixar_estoque` → kardex sempre gravado.

### Aberto para verificar (front)
- **Separação vinda da venda/OS não aparecia na tela** logo após criar. Backend 100% ok (a solicitação
  existe, `erp_separacao_dados` retorna, anon tem permissão). Provável **cache do bundle** — fazer
  **hard reload** (Ctrl/Cmd+Shift+R). Se persistir, pegar o erro do console (F12) da chamada
  `erp_separacao_dados`.

## Pendências / próximos passos
1. **Usar o saldo do cliente no Financeiro** (manual): botão no Contas a Receber para abater título com o saldo de `clientes_creditos`. (Automático foi descartado a pedido.)
2. **Encaminhamento pós-boqueta**: boqueta (Separação) separa; **Expedição** envia quando há transportadora; sem transportadora, a boqueta entrega direto ao Vendas/Serviço. Falta modelar esse destino.
3. **Busca de placa** (placa → dados do veículo): depende de **provedor pago** (definir + chave).
4. **Fiscal por empresa no produto** (grupo tributário/NCM/CST por CNPJ): back suporta (`produtos_fiscal_empresa`); falta a UI (hoje a aba fiscal é global).
5. **Tela de criar Pedido de Compra**: hoje a Entrada vincula pedidos existentes; falta a tela de emissão do pedido.
6. **NF-e de devolução** (emissão): gancho pronto; depende do módulo fiscal.
7. **Go-live no servidor interno**: migração de dados do Firebird, backup, homologação fiscal, treinamento. Ver `docs/GUIA-PRODUCAO-ERP.md`.

## Observação de testes
O build (`npm run build`) valida a compilação. O teste clique-a-clique não roda no ambiente isolado de desenvolvimento (o navegador não alcança o Supabase pelo proxy). Fluxos de banco (devolução, entrada, crédito) foram validados via transação com rollback. **Recomendado validar os fluxos novos no uso real.**
