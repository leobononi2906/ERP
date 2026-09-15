# ERP Bononi — Instrucoes para o Claude Code

> **Estado atual, pendencias e dev-log: `docs/STATUS.md`.** Este arquivo e so o que e estavel.
> Contexto do grupo e regras de banco: skill `bononi-contexto`. Consultar o banco:
> `consultar-banco`. Publicar: `publicar-e-conferir`. Registrar: `registrar-status`.
> (As skills `bononi-padrao` e `bononi-erp`, citadas em docs antigos, viraram a `bononi-contexto`
> e seus arquivos em `references/`.)

## Projeto
- **Nome:** ERP Grupo Bononi
- **Stack:** React 18 + Vite 5 + Supabase (PostgreSQL)
- **Schema Supabase:** `"Teste ERP"` (dentro do projeto de PRODUCAO `vishxwdxqiygbxmtpfoy`, que e
  compartilhado com todos os outros apps do grupo — ver Regras importantes)
- **Deploy:** Vercel (erp-five-chi.vercel.app)
- **Repo:** https://github.com/leobononi2906/ERP
- **Clone nesta maquina (`ecommerce06`):** `C:\Aplicações da bononi\ERP`. Os caminhos
  `C:\CLAUDE\...` citados aqui e nos docs sao da maquina do Leo e **nao existem nesta**.
- **Dono:** Leonardo Bononi (leobononi2906)

## Idioma
- Sempre responder em portugues brasileiro (PT-BR)
- Codigo e comentarios podem ser em portugues

## Estrutura do projeto
```
src/
  App.jsx          — SPA com sidebar, navegacao por useState
  config.js        — URL/KEY Supabase, helpers (fmtBRL, num, rpc), cores/tema
  ui.jsx           — Design system proprio (Card, Badge, Campo, Skeleton, etc.)
  main.jsx         — Entry point
  pages/
    Login.jsx, Dashboard.jsx, Clientes.jsx, Produtos.jsx,
    Veiculos.jsx, Orcamentos.jsx, Vendas.jsx, TiposOperacao.jsx,
    OrdensServico.jsx, Financeiro.jsx
    financeiro/    — ContasReceber, ContasPagar, Caixa, Cheques,
                     ContasFinanceiras, CentrosCusto, PlanoContas
```

## Banco de dados
- Backend: Supabase (PostgreSQL) com RPCs (funcoes) para toda logica de negocio
- Schema: `"Teste ERP"` — SEMPRE usar aspas duplas no nome do schema
- Sistema legado: Firebird (SGA_BONONI) em `C:\CLAUDE\ERP FIREBIRD\` — referencia para migrar regras
- Toda logica de negocio DEVE ficar nas RPCs do PostgreSQL, NAO no frontend

## Padroes de codigo
- UI: usar componentes de `ui.jsx` (Card, Badge, Campo, Secao, Skeleton, Aviso)
- Cores/tema: usar constantes de `config.js` (COR, cardStyle, etc.)
- Chamadas ao banco: usar helper `rpc()` de config.js ou fetch com headers Supabase
- useEffect: sempre usar flag de cleanup (`let a = true; return () => a = false`)
- Permissoes: todo modulo deve verificar `PERMS` do grupo do usuario

## Regras importantes
1. **SQL dentro do schema `"Teste ERP"`: aplicar direto, sem mostrar antes — so informar o que foi
   feito.** Este ERP ainda esta sendo construido e o schema e dele; a autonomia aqui e de proposito.
   **O limite e a borda do schema.** O `"Teste ERP"` mora dentro do projeto Supabase de PRODUCAO,
   compartilhado com todos os apps do grupo. Entao qualquer coisa FORA dele — `public.vw_*`,
   `geral_*`, tabelas de outro app (`exp_`, `prt_`, `assist_`, `cob_`, `fin_`…), extensao, role,
   cron, `DROP`/`DELETE` em massa — segue a regra do grupo: monta, testa, e **passa por revisao
   antes de aplicar**, mostrando o que vai ser feito (skill `bononi-contexto`, §0.3).
   `SELECT` e sempre livre, em qualquer schema.
2. NAO refatorar codigo que ja funciona alem do minimo necessario
3. NAO mexer em views `vw_*` nem tabelas de outros sistemas
4. NAO criar arquivos desnecessarios — preferir editar os existentes
5. Conferir o schema real no Supabase antes de codar — NUNCA confiar de memoria
6. Range de listagens: usar `Range: 0-9999` (padrao atual, sera migrado para paginacao)

## Documentos de referencia (nesta pasta)
- `ANALISE_COMPLETA.md` — Analise do Firebird (280 tabelas, volumes, comparativo)
- `ROADMAP.md` — Fases de desenvolvimento e prioridades
- `BRIEFING_MODULO_SEPARACAO.md` — Proximo modulo a implementar
- `erp_20.07.2026.md` — Snapshot/diario do desenvolvimento

## Banco Firebird (referencia do sistema atual)
O ERP legado (SGA) e a referencia para migrar as regras de negocio. ~280 tabelas, 196 procedures,
570 triggers. Volumes: 67K clientes, 19K produtos, 74K movimentos, 14K NFs.

- **Copia offline:** `C:\CLAUDE\ERP FIREBIRD\SGA_BONONI - Copia.FDB` — **so na maquina do Leo**,
  nao existe nesta. Ferramenta: `isql.exe` do Firebird 2.5 (`-user SYSDBA -password masterkey`).
- 🚫 **O Firebird de PRODUCAO (`192.168.0.5:3050`, `SGA_BONONI.FDB`) e SO LEITURA.** Nunca
  `CREATE`/`ALTER`/`DROP`, nem indice, nem trigger, nem "view inofensiva" — inclusive por SSH.
  Se faltar campo ou dataset, a saida e uma extracao propria (`SELECT`) no replicador, nunca
  mexer no Firebird em si. Uma copia local nao e o de producao: confira em qual voce esta antes
  de rodar qualquer coisa que nao seja `SELECT`.
