# Caderno de Ideias — Gestão / Implantação ERP

> Backlog de ideias do Leo, **analisadas contra o que já existe** antes de mandar construir.
> Mantido pela sessão *Cérebro de implantação*. Status: 💡 a discutir · ✅ já existe · 🔴 gap confirmado · 🟡 existe parcial.
> Convenção: nada vai pra construção sem passar por aqui e ser decidido com o Leo.

---

## 2026-08-13 — rodada 1

### 1. 💡 Sistema de NOTIFICAÇÕES genérico (sino unificado)
**Ideia (Leo):** aproveitar a base das *liberações remotas* e montar notificações pra várias áreas — **encomenda**, **OS finalizada**, **avisos internos**, etc.

**O que já existe:** tabela `autorizacoes` — e ela já é **quase genérica**: `tipo, modulo, id_empresa, id_solicitante, origem, id_origem, numero_origem, titulo, descricao, detalhes(jsonb), status, id_aprovador, motivo, decidido_em, expira_em`. Já tem o **sino** no topo (`SinoAutorizacoes.jsx`, poll 25s).

**Análise:** `autorizacoes` é orientada a **APROVAÇÃO** (tem aprovador, decisão, expira). Notificação é **INFORMATIVA/broadcast** (tem destinatário + lido/não-lido, sem decisão). Ciclos de vida diferentes → **não empilhar tudo em `autorizacoes`**.

**Recomendação:** criar tabela irmã `notificacoes` (`id, tipo, id_empresa, destinatario/papel, titulo, corpo, origem, id_origem, link, lido_em, criado_em, expira_em`) e **reusar o mesmo sino** como uma **caixa unificada com 2 fluxos**: (a) *"pendências que EXIJO decidir"* = `autorizacoes`; (b) *"avisos"* = `notificacoes`. Uma notificação pode **apontar** pra uma autorização. Gatilhos por evento (encomenda aprovada, OS faturada, etc.) inserem em `notificacoes`.
**Decisão pendente:** destino da notificação — por **usuário**, por **papel/grupo**, ou por **área**? (define o schema do destinatário).

### 2. ✅ Fornecedor vinculado ao produto — JÁ EXISTE
**Ideia (Leo):** temos fornecedor vinculado ao produto?
**Resposta:** **Sim.** Tabela `produto_fornecedores` (`id_fornecedor`, `referencia_fornecedor`, + `principal`). Entregue em 11/08 (seção "Fornecedores" no cadastro do produto — `FornecedoresProduto`, RPC `erp_produto_fornecedores_listar`).
**Ação:** nada a construir. Só **confirmar no uso real** que a UI está mostrando e que dá pra marcar o fornecedor principal.

### 3. 🔴 Código SEQUENCIAL do produto (importar do sistema antigo) — GAP PARCIAL
**Ideia (Leo):** temos `referencia`; precisamos de um **código sequencial** — o mesmo que vamos **importar do sistema antigo** — e isso vale também pra **clientes, fornecedores** etc.

**O que já existe:**
- `clientes.codigo` (integer) ✅ e `fornecedores.codigo` (integer) ✅ — prontos pra receber o CODIGO legado.
- `produtos` tem `id`, `referencia`, `codigo_barras` — **mas NÃO tem uma coluna `codigo`** sequencial. ❌

**Análise/Gap:** o produto **não** preserva o código sequencial do Firebird hoje. `id` é chave técnica (surrogate), não serve como "código do produto" que o balcão digita/importa. Firebird usa `CODIGO` (integer) como código de negócio.

**Recomendação:** adicionar `produtos.codigo` (integer, único por empresa/global) e **garantir na migração** que os 3 (produto/cliente/fornecedor) **importam o CODIGO legado** — sem re-sequenciar, senão quebra referência de quem decorou código. Ligar isso ao pedido do backlog "busca por código" (item 1.2).

### 4. 🔴 LOCALIZAÇÃO — precisamos de mais de uma — GAP
**Ideia (Leo):** localização precisamos de **mais de uma**.

**O que já existe:** `produtos.localizacao` é **um único texto livre**. Existe `centros_estoque` (multi-centro) e `estoque_saldos` por centro.

**O que o Firebird tinha:** `TBL_PRODUTO_DADOS` com **`CHLOCALIZ1..4`** (4 níveis estruturados de localização, por empresa) + `LOCALIZACAO` varchar(80). Ou seja, o legado já era **multi-nível**.

**Análise/Gap:** hoje o novo só guarda 1 localização em texto. Não cobre "mais de uma" nem endereçamento estruturado (rua/prateleira/nível) que acelera o picking na Separação.

**Recomendação:** trocar o texto único por tabela `produtos_localizacao` (`id_produto, id_centro_estoque, endereco/rua/prateleira/nivel, principal`), permitindo **N localizações por produto** (inclusive por centro). Migrar `CHLOCALIZ1..4` do Firebird. Liga com o backlog 1.5 (foto/localização) e com a Separação.

---

### Resumo da rodada 1
| # | Ideia | Estado | Ação |
|---|---|---|---|
| 1 | Notificações genéricas (sino) | 💡 base existe (`autorizacoes`) | criar `notificacoes` irmã + sino unificado |
| 2 | Fornecedor no produto | ✅ pronto | só validar no uso |
| 3 | Código sequencial (import legado) | 🟡 cliente/fornec ok, **produto falta** | add `produtos.codigo` + preservar na migração |
| 4 | Localização múltipla | 🔴 gap | `produtos_localizacao` N por produto/centro |

**Nada disso foi mandado pra construção ainda — está aqui pra discutirmos.**

---

## 2026-08-13 — rodada 1: SPECS prontas p/ construção (aguardando "ok" do Leo)

> Cada uma com um **default recomendado** pra decisão não travar. Tudo reversível.

### Spec 1 — Notificações (sino unificado)
- **Tabela nova** `notificacoes`: `id, tipo, id_empresa, id_destinatario(null), papel_destino(null), area_destino(null), titulo, corpo, origem, id_origem, link_pagina, link_ctx(jsonb), prioridade, lido_em(null), criado_em, expira_em`.
- **Default de destino (recomendado):** **híbrido** — dá pra mandar por **usuário** OU por **papel/grupo** (o mais flexível; começa simples, cresce sem migrar).
- **Sino unificado:** reusa `SinoAutorizacoes.jsx` → 2 abas: **Pendências** (`autorizacoes`, exige decidir) + **Avisos** (`notificacoes`, marca lido). Badge = não-lidas + pendentes.
- **RPCs:** `erp_notificar(jsonb)` (genérica, qualquer módulo dispara), `erp_notificacoes_listar(ator)`, `erp_notificacao_marcar_lida(id, ator)`.
- **Gatilhos iniciais (começar com 3):** encomenda aprovada · OS faturada/finalizada · separação pronta. Depois: título vencido, autorização pendente, avisos internos manuais.
- **Esforço:** baixo-médio (a base do sino já existe).

### Spec 3 — Código sequencial do produto  ⚠️ atualizado: infra já existe
- **A concorrência JÁ está resolvida.** Existe `erp_proximo_numero(entidade, id_empresa)` + tabela `sequencias` + trigger `trg_numero_documento`. A função usa `INSERT … ON CONFLICT DO UPDATE … RETURNING` = **atômica** (trava a linha; dois lançamentos simultâneos pegam números distintos; sem buraco porque é transacional). Todo documento (venda/OS/orçamento/encomenda/título/devolução) já tem coluna `numero` gerada assim, **por empresa**.
- **O que falta pro PRODUTO:** (a) `ALTER TABLE produtos ADD COLUMN codigo integer` + índice único **global** (produto é cadastro base, empresa nula → contador global); (b) gerar via **`erp_proximo_numero('produto')`** — reusar, não reinventar; (c) na migração, **setar o contador pra começar depois do maior CODIGO legado** (`sequencias.ultimo = max(codigo importado)`), pra novo produto continuar a sequência sem colidir.
- **Cliente/fornecedor:** já têm `codigo` — mas hoje usam **sequência nativa** (`clientes_codigo_seq`/`fornecedores_codigo_seq`, que pode dar buraco em rollback). Na migração, `setval` pra continuar do máximo legado. **Decisão menor (a discutir):** se quiser cliente/fornecedor também **gapless** igual aos documentos, unificar os 3 em `erp_proximo_numero`.
- **Liga com** busca por código (backlog 1.2).
- **Esforço:** baixo (1 coluna + reusar a função + ajustar o start na migração).

### Spec 4 — Localização múltipla
- **Tabela nova** `produtos_localizacao`: `id, id_produto, id_centro_estoque, rua, prateleira, nivel, endereco_livre, principal(bool), criado_em`. Permite **N por produto/centro**.
- **Migração:** `CHLOCALIZ1..4` do Firebird (são FKs → resolver contra `TBL_LOCALIZACAO`) viram rua/prateleira/nível; `LOCALIZACAO` varchar → `endereco_livre`. O `produtos.localizacao` (texto único atual) vira o "principal" durante a transição.
- **UI:** aba no produto lista as localizações + marca principal; **Separação** mostra a principal pra acelerar o picking.
- **Esforço:** médio (tabela + migração + UI + tocar Separação).

---

## Capturado — a discutir (sem análise ainda)
- **#5 — Busca de produtos** (a tela do print): a sessão ERP anotou como item #11 dela. Trazer o print/critério (buscar por código + nome + referência + cód. barras, padrão "Nome") pra eu detalhar. Liga com Spec 3 (código) e com backlog 1.2.
