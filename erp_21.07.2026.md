# ERP Bononi — Snapshot 21/07/2026 (v2)

## Estado atual do projeto

### Stack
- React 18 + Vite 5 + Supabase (PostgreSQL)
- Schema: `"Teste ERP"` (projeto `vishxwdxqiygbxmtpfoy`)
- Deploy: Vercel (erp-five-chi.vercel.app)
- Repo: github.com/leobononi2906/ERP (branch main)
- Ultimo commit: `ce2f71a` — feat: OS/Servicos, sidebar colapsivel, CRUD servicos, tipos operacao entrada/saida, vendas via separacao

### Modulos funcionais (15)
1. **Dashboard** — visao geral
2. **Clientes** — CRUD completo
3. **Produtos** — CRUD com grupos/subgrupos/tabelas preco
4. **Veiculos** — CRUD
5. **Orcamentos** — criacao, itens, status
6. **Vendas** — pedidos, faturamento, **produtos agora vao para Separacao** (servicos continuam direto)
7. **Ordem de Servico** — tipo OS obrigatorio (cards), servicos com status/data_inicio, apontamentos com usuario real, solicitar peca via Separacao, avaliar servicos, faturar OS
8. **Distribuicao OS** (NOVO) — coordenador distribui servicos pendentes para tecnicos, auto-refresh 30s
9. **Servicos** (NOVO) — CRUD catalogo de servicos (codigo, nome, preco, unidade, grupo)
10. **Tipos de Operacao** — entrada E saida unificados, com centro de custo e categoria despesa (DRE)
11. **Estoque** — saldos, kardex, centros, ajuste manual
12. **Separacao** — fila, picking item a item, entrega, recebe solicitacoes de Vendas e OS
13. **Financeiro** — contas receber/pagar, caixa, cheques, contas financeiras, centros custo, plano contas
14. **Fiscal** — em breve
15. **Administracao** — CRUD grupos, usuarios (multiplos grupos), permissoes por modulo, politica de desconto

### Sidebar
- Colapsivel por grupos: Comercial (Orcamentos, Vendas, OS, Distribuicao OS), Cadastros (Clientes, Produtos, Veiculos, Tipos de Operacao, Servicos), Estoque (Estoque, Separacao), Financeiro, Sistema (Administracao)
- Dashboard no topo fora de grupo
- Auto-expande grupo da pagina ativa
- Permissoes verificadas por item individual

### Sistema de autenticacao
- Login com senha criptografada (pgcrypto bcrypt)
- `login_erp` retorna usuario + grupos + permissoes consolidadas + politicas desconto
- Menu lateral filtrado por permissoes reais
- Permissoes: visualizar, incluir, editar, excluir, aprovar, exportar, ajustar_estoque, dar_desconto
- Usuario pode ter multiplos grupos de acesso (N:N)
- ATOR usa `usuario.id` do login em todos os modulos (fix aplicado)
- Usuario Leonardo: login `Leonardo` / senha `bononi2024`

### Tabelas principais do modulo auth
- `"Teste ERP".usuarios` — id, nome, login, senha_hash, email, perfil, segmento, id_pessoa, id_centro_custo, comissoes
- `"Teste ERP".grupos_acesso` — 10 grupos configurados
- `"Teste ERP".grupos_permissoes` — permissoes por grupo x modulo
- `"Teste ERP".usuarios_grupos` — N:N usuario-grupo
- `"Teste ERP".modulos` — 18 modulos registrados
- `"Teste ERP".segmentos` — Online, Loja, Distribuicao
- `"Teste ERP".politica_desconto` — desconto maximo por grupo acesso + grupo/subgrupo produto + tabela preco

### RPCs criadas nesta sessao (21/07 v2)
- `os_servico_salvar(p_id_os, p_id_servico, p_descricao, p_quantidade, p_valor_unitario, p_valor_total, p_id_tecnico, p_status, p_id)` — insere/atualiza servico e recalcula totais da OS
- `os_solicitar_peca(p_id_os, p_id_produto, p_quantidade, p_valor_unitario, p_id_usuario)` — cria expedicao no modulo Separacao vinculada a OS
- `os_distribuicao_dados(p_id_empresa)` — retorna servicos pendentes de todas OS + lista tecnicos
- `os_distribuir_servico(p_id_servico_os, p_id_tecnico, p_id_usuario)` — atribui tecnico e muda status para EM_EXECUCAO
- `os_avaliar_servicos(p_id_os, p_servicos, p_id_usuario)` — avalia horas/valores e recalcula totais
- `servico_salvar(p_id, p_codigo, p_nome, p_descricao, p_preco, p_unidade, p_situacao, p_id_grupo)` — CRUD servicos
- `venda_solicitar_item(p_id_venda, p_id_produto, ...)` — insere item na venda + cria expedicao para Separacao (sem movimentar estoque direto)
- `tipos_saida_salvar(p)` — atualizado para aceitar tipo (ENTRADA/SAIDA), atualiza_custo, id_centro_custo, id_categoria_despesa

### Mudancas no banco (21/07 v2)
- `os_servicos` ganhou colunas: `data_inicio timestamptz`, `id_usuario_distribuiu integer`
- `tipos_saida` ganhou colunas: `tipo varchar(10)` (ENTRADA/SAIDA), `atualiza_custo boolean`, `id_centro_custo integer`, `id_categoria_despesa integer`
- `grupos_produto` ganhou colunas: `id_centro_custo integer`, `id_categoria_despesa integer`
- Registros de `tipos_entrada` migrados para `tipos_saida` com tipo='ENTRADA'
- `public.login_erp` agora delega para `"Teste ERP".login_erp` (fix schema)

### Fluxo OS completo (novo)
1. Vendedor abre OS → seleciona tipo OS (cards clicaveis, obrigatorio) + cliente + veiculo
2. Adiciona servicos (texto livre, rapido) → cada um vira item com status PENDENTE e data_inicio
3. Solicita pecas → botao "Solicitar Peca" cria expedicao no modulo Separacao
4. Coordenador na tela "Distribuicao OS" → ve todos servicos pendentes → atribui tecnico → status EM_EXECUCAO
5. Tecnico executa servico → apontamentos (play/stop) registram horas com usuario real
6. Avaliador → botao "Avaliar Servicos" → revisa horas e valores por servico → confirma
7. Faturar OS → modal com forma/condicao pagamento → OS status FATURADA

### Fluxo Vendas (atualizado)
- Produto: vendedor adiciona item → `venda_solicitar_item` insere na venda + cria solicitacao na Separacao (sem movimentar estoque)
- Servico: vendedor adiciona item → `venda_lancar_item` fluxo direto (servico nao precisa de separacao)
- Faturar: modal com forma/condicao pagamento (ja existia)
- Comissao, tabela de preco, vendedor: ja existem no form de venda

### RPCs completas do sistema (~55 funcoes)
**Auth:** login_erp, erp_admin_dados, erp_grupo_salvar, erp_grupo_permissoes, erp_grupo_permissoes_salvar, erp_usuario_salvar, erp_politica_desconto_salvar, erp_politica_desconto_listar, erp_politica_desconto_excluir
**Dashboard:** dashboard_resumo
**Cadastros:** clientes_dados, cliente_salvar, produtos_dados, produto_salvar, servico_salvar
**Orcamentos:** orcamentos_dados, orcamento_salvar, orcamento_lancar_item, orcamento_remover_item, orcamento_aprovar, orcamento_reprovar, orcamento_converter_venda
**Vendas:** vendas_dados, venda_salvar, venda_lancar_item, venda_solicitar_item, venda_remover_item, venda_faturar, venda_cancelar
**OS:** os_servico_salvar, os_solicitar_peca, os_distribuicao_dados, os_distribuir_servico, os_avaliar_servicos, os_faturar, os_cancelar, os_lancar_peca, os_remover_peca
**Tipos Operacao:** tipos_saida_salvar
**Estoque:** erp_estoque_dados, erp_estoque_kardex, erp_estoque_ajuste, erp_centro_estoque_salvar
**Separacao:** erp_separacao_dados, erp_separacao_assumir, erp_separacao_detalhe, erp_separacao_confirmar, erp_separacao_cancelar, erp_separacao_entregar
**Financeiro:** erp_titulos_listar, erp_titulo_salvar, erp_aprovar_titulo, erp_baixar_titulo, erp_estornar_baixa, erp_titulos_baixas_listar, erp_contas_financeiras_listar, erp_conta_financeira_salvar, erp_transferir_contas, erp_extrato_conta, erp_caixas_listar, erp_abrir_caixa, erp_fechar_caixa, erp_movimento_caixa, erp_caixa_movimentos_listar, erp_cheques_listar, erp_cheque_compensar, erp_cheque_devolver, erp_plano_contas_listar, erp_plano_conta_salvar, erp_centros_custo_listar, erp_centro_custo_salvar

### Riscos pendentes
1. **RLS desabilitado** em 128+ tabelas — qualquer pessoa com a chave publica acessa tudo
2. **Paginacao** — Range 0-9999 nao escala para 70 usuarios simultaneos
3. **Politica de desconto nao aplicada** — RPCs existem mas frontend nao valida desconto maximo
4. **Orcamentos ainda usa venda_lancar_item** — deveria usar venda_solicitar_item para produtos tambem

---

## Proximos passos (ordem de prioridade)

### 1. Aplicar politica de desconto nas vendas/orcamentos
- Quando vendedor aplica desconto, verificar politica_desconto
- Se excede o maximo, bloquear ou solicitar aprovacao de gestor
- Hierarquia: produto > subgrupo > grupo (mais especifico prevalece)
- RPCs de politica ja existem (erp_politica_desconto_*)

### 2. Orcamentos: migrar para solicitacao via Separacao
- Mesmo que Vendas: produto vai para Separacao em vez de movimentar estoque direto
- Criar RPC `orcamento_solicitar_item` similar a `venda_solicitar_item`

### 3. RLS (Row Level Security)
- Habilitar RLS em todas as tabelas do schema "Teste ERP"
- Criar policies baseadas no token/usuario
- Critico para seguranca em producao com 70 usuarios

### 4. Paginacao real
- Substituir Range 0-9999 por paginacao server-side
- Implementar em todas as listagens (clientes, produtos, vendas, etc.)

### 5. Modulo Compras
- Pedido de compra, cotacao com fornecedores
- Entrada de mercadoria integrada com estoque (usando tipos_operacao ENTRADA)
- Aprovacao de compras por gestor

### 6. Modulo Fiscal (NF-e / NFS-e)
- Emissao de notas fiscais
- Integracao SEFAZ
- Danfe/PDF

### 7. Relatorios por modulo
- Cada modulo tera relatorios proprios
- Vendedor ve so relatorios de venda
- Exportacao PDF/Excel

### 8. Preparacao para producao (70 usuarios)
- Supabase self-hosted no servidor interno (Docker)
- Connection pooling
- Indices otimizados
- Monitoramento

---

## Estrutura de arquivos
```
src/
  App.jsx              — SPA com sidebar colapsivel, navegacao por useState
  config.js            — URL/KEY Supabase, helpers (fmtBRL, num, rpc), cores/tema
  ui.jsx               — Design system (Card, Badge, Campo, Skeleton, etc.)
  main.jsx             — Entry point
  pages/
    Login.jsx
    Dashboard.jsx
    Clientes.jsx
    Produtos.jsx
    Veiculos.jsx
    Orcamentos.jsx
    Vendas.jsx           — produtos via Separacao, servicos direto
    OrdensServico.jsx    — tipo OS cards, servicos, solicitar peca, avaliar, faturar
    DistribuicaoServicos.jsx  — (NOVO) coordenador distribui servicos
    Servicos.jsx         — (NOVO) CRUD catalogo servicos
    TiposOperacao.jsx    — entrada/saida unificados, centro custo, categoria despesa
    Estoque.jsx
    Separacao.jsx
    Financeiro.jsx
    Administracao.jsx
    financeiro/
      ContasReceber.jsx
      ContasPagar.jsx
      ContasFinanceiras.jsx
      Caixa.jsx
      Cheques.jsx
      PlanoContas.jsx
      CentrosCusto.jsx
```

## Arquivos de referencia
- `CLAUDE.md` — instrucoes para o Claude Code (padroes, regras, stack)
- `ANALISE_COMPLETA.md` — analise do Firebird (280 tabelas, volumes, comparativo)
- `ROADMAP.md` — fases de desenvolvimento
- `BRIEFING_MODULO_SEPARACAO.md` — briefing do modulo separacao (ja implementado)

## Banco Firebird (sistema legado)
- Caminho: `C:\CLAUDE\ERP FIREBIRD\SGA_BONONI - Copia.FDB`
- Ferramenta: `"C:\Program Files (x86)\Firebird\Firebird_2_5\bin\isql.exe" -user SYSDBA -password masterkey`
- ~280 tabelas, 196 procedures, 570 triggers
- Referencia para migrar regras de negocio
