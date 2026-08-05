# BACKLOG — ERP Bononi

> Consolidado em **2026-08-05** a partir do review do dono (Leo). Reconciliado com o que **já existe**
> (ver `STATUS.md` e `STATUS-ATUAL.md`) para não refazer. Fonte de contexto: `docs/STATUS.md`.
> Status: 🟢 feito · 🟡 refinar (já existe base) · 🔵 novo · ⏳ fase futura.

---

## 0. Correções de banco aplicadas nesta sessão (Supabase — compartilhado com produção)

| Fix | O que era | Situação |
|-----|-----------|----------|
| `erp_usuario_salvar` | `id:0` caía em UPDATE (não inseria) → usuário novo sumia | 🟢 corrigido (INSERT + grava grupos/habilidades/segmento/comissões). Bate com o front real. |
| Caixa (`erp_fechar_caixa`, `erp_movimento_caixa`) | 2 overloads ambíguos → HTTP 300; a inline logava em coluna inexistente | 🟢 duplicatas removidas; ficam os wrappers → `fn_fechar_caixa`/`fn_movimento_caixa`. Bate com `financeiro/Caixa.jsx`. |
| `separacao_confirmar_devolucao` | Usava colunas inexistentes | 🟢 reescrita — porém é **função morta** (a devolução real usa `erp_devolucao_*` + `Devolucoes.jsx`). Sem impacto. |

> **Nota:** o `erp_log` de 7 args (que travava venda/orçamento em 03/08) **já tinha sido corrigido** pela migration 44 do time. Conversão de orçamento está OK — só retestar.

---

## 1. Pedidos do dono (priorizados)

### 1.1 🔵 Navegação — aba **Cadastro** logo abaixo de **Dashboard** na sidebar
- Reordenar o menu (`src/App.jsx`): mover o hub **Cadastros** para logo abaixo de Dashboard.
- Baixo risco, só ordem de itens.

### 1.2 🟡 Busca por **código do ERP** nas telas (Clientes, Produtos)
- Já existe `BuscaServidor` (`ui.jsx`) buscando por campo (nome/referência/cód. barras) via `erp_clientes_buscar`/`erp_produtos_buscar`.
- **Pedido:** manter o seletor de tipo (**padrão "Nome"**) e, **ao lado**, um campo para digitar o **código** (cliente/produto) — agilidade para vendedor/lançador que já sabe o código.
- ⚠️ `clientes.codigo` é **integer** → castar `codigo::text` no ILIKE (armadilha já registrada no STATUS).

### 1.3 🟡 Produto — unificar preços/fiscal e corrigir o "preço de venda"
- Hoje há o bloco **"Preços e fiscal"** + a seção **"Preços por empresa/tabela"** (Markup/Margem/Manual — já entregue).
- **Pedido:** juntar num **bloco único**; o **"Preço de venda" do bloco fiscal está conceitualmente errado** — quem vale é a **tabela por empresa**. Tornar informativo/derivado da tabela padrão.

### 1.4 🔵 Produto — **tributação por empresa** (checkbox de empresas)
- Modelo Firebird: `TBL_PRODUTO` (1) + `TBL_PRODUTO_DADOS` (N por empresa) — tributação varia por CNPJ.
- Já mapeado como **pendência #4** no `STATUS-ATUAL.md`: back suporta (`produtos_fiscal_empresa`), falta UI (hoje a aba fiscal é global).
- **Pedido:** checkbox das **empresas em que o produto está disponível**; só as marcadas abrem **precificação + tributação por empresa**. Reusar `erp_preco_empresa_salvar`, `produtos_fiscal_empresa`, `erp_fiscal_empresa_salvar`.

### 1.5 🔵 Produto — **Foto** e **Localização**
- **Foto:** bucket Storage do Supabase + coluna/tabela; upload na aba do produto.
- **Localização:** endereçamento de estoque (rua/prateleira/nível) por centro — acelera picking na Separação. (Firebird: `TBL_LOCALIZACAO`, `CHLOCALIZ1..4`.)

### 1.6 🔵 Estoque — **uso interno** (saída para consumo)
- Lançar saída com **colaborador solicitante** + **departamento destino**.
- Reusar o motor de requisição interna (`fn_solicitar_produto`/`fn_atender_solicitacao`) e/ou `erp_estoque_ajuste`. Saída sempre pelo motor único (`erp_baixar_estoque`) → grava Kardex.

### 1.7 🔵 Cadastro de **Departamento** com **centro de custo**
- Departamento deve ter **centro de custo** vinculado (base para resultados por centro de custo).
- Tabela `departamentos` existe — verificar/adicionar `id_centro_custo`.

### 1.8 🟡 Financeiro — **prazos de pagamento** gerando parcelas corretas
- Ex.: **30/60 → um título a 30d e outro a 60d**.
- Reusar `fn_gerar_titulos_receber` (respeita `condicoes_pagamento` + `condicoes_pagamento_parcelas`). **Verificar** se as parcelas por condição estão cadastradas/geram nos vencimentos certos.

### 1.9 🔵 Financeiro — **cartão / NSU**
- Lançar **NSU** quando o pagamento for cartão (Firebird: aba "Transação Cartão" — NSU, Núm. Transação, Dt. Conciliação).
- ⏳ Aguardando as **imagens** do dono para detalhar campos/fluxo.

### 1.10 🔵 Financeiro — separar **Caixa da loja** do Financeiro geral
- O **caixa de frente de loja** (`fn_*_caixa`) é operação diária de balcão; deve ser **item próprio** (fora do hub Financeiro geral), com fluxo keyboard-first.

### 1.11 🟡 Orçamento — **página única** nos moldes de Vendas + cabeçalho
- Vendas já é página única com cabeçalho forte. Aplicar o mesmo em **Orçamento** (e OS) — pendência já citada no STATUS ("cabeçalho forte + página única na OS e Orçamento").
- Repensar o **cabeçalho-padrão** (o dono achou o atual ruim) antes de replicar.

---

## 2. ⭐ Padrão transversal — Operação por TECLADO (keyboard-first)

Inegociável nas telas de **operação** (OS, Venda, Orçamento, Balcão/Caixa, Separação, Entrada). Ref.: skill `bononi-erp` → `references/automacoes.md` §4.
- Mapa único de atalhos em `config.js → ATALHOS`, hook `useHotkeys`, campos com `data-campo`.
- `F2` Novo · `F3` Buscar · `F4` Combo · `F6` Add item · `F9` Finalizar/faturar · `F10` Salvar · `Esc` Cancelar · `Alt+P/C/Q` foco Produto/Cliente/Qtd.
- Grid de itens por **setas ↑/↓ + Enter**; Enter na última coluna = adiciona e volta o foco (lançamento em cadeia); **leitor de código de barras** = digita + Enter no campo Produto.
- Modal com foco automático no 1º campo; Enter confirma, Esc fecha; nunca `confirm()` nativo.

---

## 3. Já entregue (contexto — NÃO refazer)
Preços por empresa/tabela (Markup/Margem/Manual); Devoluções com aval da boqueta (`erp_devolucao_*`, `Devolucoes.jsx`, saldo em `clientes_creditos`); Relatórios + DRE; Entradas de NF + conferência; Consulta de Preços; Pátio/Prismas/Precificação/Comissão por apontamento; Produtos → Composição + MO; busca servidor por campo; Vendas página única; permissões em árvore; baixa de estoque no faturamento (migration 45).

## 4. Fases futuras (lacunas vs Firebird)
NF-e efetiva + entrada de nota + manifestação do destinatário; boletos (CNAB); tela de emissão de Pedido de Compra; aplicações veiculares por ano; conciliação bancária; go-live no servidor interno (ver `GUIA-PRODUCAO-ERP.md`). **Não trazer:** PAF-ECF/ECF, motor de relatórios antigo, mensageria legada.

---

## Ordem de execução sugerida
1. 1.1 (sidebar) + 1.2 (busca por código) — rápidos, baixo risco.
2. 1.3 + 1.4 (produto: unificar preços + tributação por empresa) — pedido central.
3. 1.6 + 1.7 (uso interno + departamento/centro de custo).
4. 1.8 (prazos 30/60) e 1.10 (caixa da loja separado).
5. 1.5 (foto/localização), 1.11 (orçamento página única), 1.9 (cartão/NSU — após imagens).
6. Aplicar keyboard-first (§2) nas telas de operação conforme forem tocadas.
