# erp_22.07.2026 — Sistema de Descontos + Promoções

**Commit:** `1c55ff5`
**Escopo:** Política de desconto vista/prazo, promoções, validação em tempo real

---

## 1. O que entrou

### Política de desconto (expandida)
- **Limites separados à vista e a prazo** — antes era um campo só (`desconto_maximo`), agora são `desconto_maximo_vista` e `desconto_maximo_prazo`.
- **Produto específico** — nova coluna `id_produto` na `politica_desconto`. Hierarquia de resolução: PRODUTO > SUBGRUPO > GRUPO > REGRA GERAL.
- **Múltiplos grupos de acesso** — se o usuário pertence a mais de um grupo, o sistema pega o **maior limite** (mais permissivo).
- **Tela Administração > Política de Desconto** — formulário atualizado com campos Vista %, Prazo %, seletor de produto, e tabela mostrando escopo hierárquico.

### Condição de pagamento na abertura da venda
- Campo **Condição de Pagamento** (À vista / parcelado) agora é definido **na criação da venda**, não só no faturamento.
- Isso permite validar o desconto correto (vista vs prazo) desde o primeiro item.
- Exibido no cabeçalho do detalhe da venda.

### Validação de desconto em tempo real (Vendas + Orçamentos)
- Ao selecionar um produto, o frontend consulta `erp_consultar_limite_desconto` e mostra:
  - Limite disponível ao lado do campo "Desc %"
  - Borda **verde** se dentro do limite, **vermelha** se acima
  - **"Sem desconto"** se o produto tem `bloquear_desconto = true`
  - **"Promo"** se o produto está em promoção ativa
- Campo de desconto desabilitado para produtos com desconto bloqueado.

### Bloquear desconto no produto
- Novo campo `bloquear_desconto` (boolean) no cadastro de produto.
- Checkbox na tela: "Bloquear desconto — nenhuma política se aplica, desconto sempre 0%".
- Quando marcado, a RPC `erp_validar_desconto` retorna `origem: BLOQUEADO` e não permite nenhum desconto.

### Promoções (tela nova — Comercial)
- **Tabelas:** `promocoes` + `promocao_itens`
- **CRUD completo:** nome, vigência (data início/fim obrigatória), ativo, desconto adicional máximo, observação.
- **Itens da promoção:** produto com tipo PRECO_FIXO ou PERCENTUAL. Preço original gravado como snapshot.
- **Alerta** na lista quando promoções estão prestes a vencer (3 dias).
- **KPIs:** qtd de itens, vigência, desconto adicional.
- Promoção ativa **sobrepõe** a hierarquia normal de desconto. O vendedor só pode dar desconto adicional até o `desconto_adicional_maximo` da promoção (default 0 = nenhum).

### Recalcular preços
- Nova RPC `venda_recalcular_precos` — quando muda o cliente ou a tabela de preço numa venda existente, recalcula os preços unitários de todos os itens PRODUTO via `erp_resolver_preco` e registra no log de auditoria.

---

## 2. Migration SQL

**Arquivo:** `supabase/migrations/20260722_descontos_promocoes.sql`

Precisa rodar no **Supabase SQL Editor** (schema "Teste ERP").

Conteúdo:
1. ALTER `politica_desconto`: +`id_produto`, rename `desconto_maximo` → `desconto_maximo_vista`, +`desconto_maximo_prazo`
2. ALTER `produtos`: +`bloquear_desconto`
3. CREATE `promocoes` + `promocao_itens`
4. CREATE/REPLACE `erp_validar_desconto(p_id_usuario, p_id_produto, p_percentual, p_a_vista)`
5. CREATE/REPLACE `erp_consultar_limite_desconto(p_id_usuario, p_id_produto)`
6. CREATE/REPLACE RPCs CRUD promoções (salvar, listar itens, item salvar/excluir, excluir)
7. CREATE/REPLACE `erp_politica_desconto_salvar` e `_listar` (novos campos)
8. CREATE/REPLACE `venda_recalcular_precos`

---

## 3. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/App.jsx` | +import Promocoes, +menu Comercial, +rota |
| `src/pages/Administracao.jsx` | AbaDesconto: vista/prazo, produto específico, escopo hierárquico |
| `src/pages/Vendas.jsx` | Condição pagamento na abertura, feedback desconto, consulta limite, recalcular preços |
| `src/pages/Orcamentos.jsx` | Feedback desconto em tempo real, consulta limite |
| `src/pages/Produtos.jsx` | +checkbox bloquear_desconto no form |
| `src/pages/Promocoes.jsx` | **NOVO** — tela completa CRUD promoções |
| `supabase/migrations/20260722_descontos_promocoes.sql` | **NOVO** — toda a migration |

---

## 4. O que falta para funcionar

1. **Rodar a migration** no Supabase SQL Editor
2. Verificar se `produto_salvar` faz passthrough do campo `bloquear_desconto` — se a RPC usa INSERT/UPDATE genérico do JSON, funciona automaticamente; senão, adicionar o campo
3. **Cadastrar as políticas de desconto** na tela Administração:
   - Vendedores: 8% vista / 3% prazo
   - Gerentes: 11% vista / 6% prazo
   - Diretoria: definir
4. Marcar produtos que **não aceitam desconto** (checkbox no cadastro)
5. Criar as primeiras promoções de teste

---

## 5. Regras de negócio consolidadas

### Hierarquia de desconto
```
PROMOÇÃO ativa  →  substitui tudo, limite = desconto_adicional_maximo
    ↓ (sem promoção)
BLOQUEADO       →  bloquear_desconto = true no produto, limite = 0%
    ↓
PRODUTO         →  política com id_produto preenchido
    ↓
SUBGRUPO        →  política com id_subgrupo_produto
    ↓
GRUPO PRODUTO   →  política com id_grupo_produto
    ↓
REGRA GERAL     →  política com tudo NULL
    ↓
SEM POLÍTICA    →  sem limite (perigoso)
```

### Vista vs Prazo
- Definido na **abertura da venda** pela condição de pagamento
- `id_condicao_pagamento = NULL` → à vista
- `id_condicao_pagamento preenchido` → a prazo
- Limites diferentes para cada modalidade

### Múltiplos grupos
- Usuário em Vendedores (8% vista) + Gerentes (11% vista) → vale 11%

### Aprovação
- Se `requer_aprovacao = true` e desconto > limite: bloqueia
- Usuário com `pode_aprovar` pode liberar na hora (já implementado desde a sessão anterior)
