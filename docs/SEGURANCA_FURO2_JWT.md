# Segurança — Furo #2 (permissão por módulo) · Plano em 2 camadas

**Contexto:** as RPCs rodam com a chave pública (anon) e são `SECURITY DEFINER`. Hoje elas confiam no `_ator` (id do usuário) que o front envia — usado principalmente para log. Quem chamar a RPC direto (fora do front) pode mandar qualquer `_ator`. As permissões por módulo (incluir/editar/excluir) eram checadas **só no front**.

---

## ✅ Camada 1 — Guard no servidor (FEITO 11/08/2026)

Função `public.erp_exigir_permissao(p_ator, p_modulo, p_acao)`:
- Barra **usuário logado (ator real)** cujo grupo **não tem** a permissão do módulo.
- `p_ator` nulo (crons/sistema) **não** é barrado — isso é a Camada 2.
- Hoje todos os usuários são admin/sem-grupo → `erp_usuario_pode` retorna `true` → **não trava ninguém**. A trava passa a valer assim que grupos restritos forem configurados.

**Plugado em:** `venda_salvar` (incluir/editar), `venda_cancelar` (excluir), `orcamento_salvar` (incluir/editar).
Erro padronizado: `SEM_PERMISSAO|<mensagem>`.

**Falta plugar (mesma linha, 1 chamada no topo):**
- `os_salvar` — ⚠️ tem **overload** 18/19 args; alinhar assinatura antes (risco de HTTP 300).
- `venda_lancar_item` / `venda_solicitar_item` / `orcamento_lancar_item` — ação `incluir`.
- `venda_faturar` / `os_faturar` — ação `editar` (ou `incluir`).
- `erp_titulo_salvar` e baixas — módulo `FINANCEIRO`.
- `produto_salvar` / `produto_empresas_salvar` / preços — módulo `PRODUTOS` / `aprovar`.
- `erp_estoque_ajuste` / `erp_saida_uso_interno` — módulo `ESTOQUE`.

**Limite conhecido:** enquanto o `_ator` for enviado pelo front (spoofável), a Camada 1 protege contra o **usuário logado de baixo privilégio** (ator real com grupo restrito), mas não contra quem forja `_ator` numa chamada crua. Isso é o que a Camada 2 fecha.

---

## 🔜 Camada 2 — JWT por usuário + RLS (a executar)

**Objetivo:** o `_ator` deixa de ser um campo "confiável" enviado pelo front — passa a vir do **token JWT** do usuário autenticado, que o Postgres lê sozinho (`auth.uid()`), impossível de forjar.

### Decisão de fundo (rever antes)
- **Regra atual "sem grupo = acesso total"** em `erp_usuario_pode`. É cômoda hoje, mas insegura. Antes de virar a chave: **atribuir grupos a todos os ~50 usuários**, senão o default precisa continuar permissivo (ou todo mundo perde acesso).

### Passos sugeridos (faseado, testável)
1. **Auth real no Supabase.** Cada usuário do ERP vira um `auth.users` (email/senha ou magic-link). Login passa a usar `supabase.auth` em vez do `erp_login` atual (ou `erp_login` passa a emitir sessão). Mapear `auth.uid()` (uuid) ↔ `usuarios.id` (int) via coluna `usuarios.auth_uid`.
2. **`erp_ator()` server-side.** Função `STABLE` que resolve `usuarios.id` a partir de `auth.uid()`. As RPCs passam a usar `erp_ator()` em vez de `p->>'_ator'` (deixa de aceitar ator do corpo).
3. **`erp_usuario_pode` sem brecha.** Trocar "sem grupo = true" por "sem grupo = só leitura" (ou negado), **depois** que todos tiverem grupo.
4. **RLS nas tabelas sensíveis** (`vendas`, `titulos`, `ordens_servico`, `estoque_*`) filtrando por empresa do usuário (`usuarios_empresas`) — defesa real mesmo se a RPC falhar.
5. **Chave `anon` deixa de escrever.** Revisar grants: leitura pública controlada, escrita só autenticada.
6. **Migração suave:** rodar Camada 2 em paralelo (aceitar `_ator` do corpo E `erp_ator()`), validar, depois remover o `_ator` do corpo.

### Riscos
- Mexe no **login** (produção). Precisa ambiente de teste + rollback.
- Reescreve o header de ~todas as mutações (trocar fonte do ator).
- Exige o cadastro de grupos concluído antes de endurecer o default.

**Recomendação:** executar a Camada 2 como projeto próprio, numa branch, com um punhado de telas piloto (Vendas) antes de propagar.
