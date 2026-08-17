# 🚪 Comece aqui — Onboarding do ERP Bononi

> Se você é novo no projeto, **leia este documento primeiro, inteiro.** Ele te orienta, te dá o mapa e aponta os buracos onde todo mundo tropeça. Leva ~20 min. Depois siga a ordem de leitura no fim.

---

## 1. O que é o ERP Bononi (em 1 minuto)

O Grupo Bononi está construindo seu **ERP próprio** para substituir o sistema legado (**Firebird**, um sistema de terceiros com ~280 tabelas). O novo é um app **web** (React) sobre um banco **PostgreSQL** (hoje no Supabase, futuramente em servidor interno). Cobre: cadastros, OS (ordem de serviço), vendas, orçamentos, estoque, compras, financeiro e fiscal — para **9 empresas/CNPJs** (multi-empresa PR/SC/SP).

**Estado:** ~50 telas construídas e no ar (ambiente de teste). Ainda **não** está rodando a operação real — o go-live começará por um **piloto (Truckprest)**. Ver `IMPLANTACAO_TRUCKPREST.md`.

---

## 2. O modelo mental (como o sistema é montado)

- **Front:** React 18 + Vite 5 + Tailwind. Uma SPA (`src/App.jsx`) com sidebar; cada tela é uma página em `src/pages/`.
- **Back:** PostgreSQL via **Supabase**. **Toda a lógica de negócio vive em RPCs** (funções no banco) — o front só chama e mostra. Se for mexer numa regra, quase sempre é numa RPC, **não** no front.
- **Schema:** as tabelas do ERP ficam no schema **`"Teste ERP"`** (sempre com aspas). Não confundir com as views `vw_*` (que são de outros sistemas, replicadas do Firebird, só leitura).
- **Deploy:** push na branch **`main`** → publica na **Vercel** (produção de teste). ⚠️ Push na main = no ar. Revisar antes.
- **Produção futura:** servidor **interno (on-premise)**, PostgreSQL puro. Por isso nada depende de recurso exclusivo do Supabase.

---

## 3. Onde está cada coisa (acessos)

| O quê | Onde |
|---|---|
| Código | GitHub `leobononi2906/ERP` (clone local em `C:\CLAUDE\Projetos GitHub\ERP`) |
| Banco | Supabase, projeto `vishxwdxqiygbxmtpfoy`, schema `"Teste ERP"` |
| App (teste) | Vercel — `erp-five-chi.vercel.app` |
| Login de teste | `Leonardo` / (senha com o Leo) — grupo Administrador |
| Sistema legado | Firebird em `C:\CLAUDE\ERP FIREBIRD\` (referência p/ migrar regras) |
| Skills de apoio | `bononi-erp` (o que o ERP é) + `bononi-padrao` (como codar) |

---

## 4. As armadilhas — leia ANTES de tocar em código

Todo mundo tropeça nestas. Sabendo, você economiza horas:

1. **Confira o schema real no Supabase antes de codar.** Nunca confie de memória no nome de uma coluna. O erro nº 1 do projeto é codar contra coluna que não existe.
2. **`git fetch` antes de editar.** O clone local costuma ficar **atrás** do GitHub — já causou falsos "trabalho perdido". Puxe antes.
3. **RPC vive em `"Teste ERP"`, mas o front chama via `public`.** Toda RPC nova precisa de um **wrapper em `public`** (o front bate no schema public). Ver `erp-rpc-schema-public-wrapper`.
4. **Duas tabelas de módulo:** `modulos` (chave minúscula) **e** `modulos_sistema` (código MAIÚSCULO). Módulo novo tem que entrar nas **duas**, com a mesma id — senão o menu some até pro admin.
5. **Overloads de RPC → HTTP 300.** Se existir a função com assinaturas diferentes (json/jsonb, nº de args), o PostgREST não sabe qual chamar. Cuidado com `os_salvar` (tem overload 18/19 args).
6. **`vite build` NÃO pega identificador indefinido em runtime.** Compila, mas a tela fica branca no navegador (ex.: `C.surface` que não existe). Sempre **abra a tela** depois de mexer. Já existe um ErrorBoundary global que mostra o erro em vez de tela branca.
7. **Multi-empresa:** o id de empresa do Firebird (`CHDADOS`) é **diferente** do id novo. Nunca assuma que batem.

---

## 5. As 9 empresas

| id | Fantasia | UF | Regime |
|---|---|---|---|
| 1 | Bononi PR | PR | Lucro Real |
| 2 | Bononi SC | SC | Lucro Real |
| 3 | MLB PR | PR | Presumido |
| 4 | MLB SC | SC | Presumido |
| 5 | **Truckprest** (piloto) | PR | Simples |
| 6 | Op. Logístico | PR | Presumido |
| 7 | Battogo | PR | (será extinta — ignorar) |
| 8 | Santa Tereza | SC | Lucro Real |
| 9 | MLB SP | SP | Presumido |

---

## 6. Ordem de leitura (depois deste doc)

**Essenciais (leia nesta ordem):**
1. `GLOSSARIO.md` — o "internês" da empresa (boqueta, gôndola, prisma, pátio…). **Sem isso o resto não faz sentido.**
2. Skill `bononi-erp` + `bononi-padrao` — o que o ERP é e como se coda aqui.
3. `GUIA-PRODUCAO-ERP.md` — como o go-live acontece (visão de negócio).
4. `IMPLANTACAO_TRUCKPREST.md` — o roteiro do primeiro piloto.
5. `CADERNO_IDEIAS.md` — o backlog vivo + as decisões já tomadas (o "porquê" das coisas).

**Referência (consulte quando precisar):**
- `BACKLOG.md` — backlog de desenvolvimento.
- `FISCAL_TRIBUTARIO.md` + `MIGRACAO_FISCAL_FIREBIRD.md` — tudo de fiscal.
- `RH_DP.md` — módulo RH (gerencial, não folha legal).
- `SEGURANCA_FURO2_JWT.md` — plano de segurança (permissões, JWT/RLS).
- `schema/` — documentação do schema.

**Histórico (contexto, NÃO precisa ler pra começar):**
- `STATUS.md`, `STATUS-ATUAL.md`, `HANDOFF_2026-08-*.md`, `erp_*.07.2026*.md`, `ANALISE_COMPLETA.md`, `ROADMAP.md`, `BRIEFING_*.md` — notas datadas do desenvolvimento.

---

## 7. Como o trabalho flui hoje

- O **Leo** é o dono do produto (decide prioridades, conhece o negócio).
- Uma sessão de IA **"Cérebro de implantação"** analisa, documenta e decide (mantém o `CADERNO_IDEIAS.md`).
- Uma sessão de IA **"ERP"** constrói (recebe specs prontas e executa; push na main).
- **Nada vai pra construção sem passar pelo caderno e ser decidido.**

> Este documento é vivo. Se algo aqui estiver desatualizado, corrija — é a porta de entrada de todo mundo que chega.
