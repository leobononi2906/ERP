# ERP Bononi — Instrucoes para o Claude Code

## Projeto
- **Nome:** ERP Grupo Bononi
- **Stack:** React 18 + Vite 5 + Supabase (PostgreSQL)
- **Schema Supabase:** `"Teste ERP"` (projeto `vishxwdxqiygbxmtpfoy`)
- **Deploy:** Vercel (erp-five-chi.vercel.app)
- **Repo:** https://github.com/leobononi2906/ERP
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
1. Aplicar SQL direto no Supabase — NAO precisa mostrar antes, so informar o que foi feito
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
- Caminho: `C:\CLAUDE\ERP FIREBIRD\SGA_BONONI - Copia.FDB`
- Ferramenta: `"C:\Program Files (x86)\Firebird\Firebird_2_5\bin\isql.exe" -user SYSDBA -password masterkey`
- ~280 tabelas, 196 procedures, 570 triggers
- Volumes: 67K clientes, 19K produtos, 74K movimentos, 14K NFs
