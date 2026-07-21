# ANALISE COMPLETA — ERP BONONI · 21/07/2026

---

## 1. SISTEMA ATUAL (Firebird — SGA_BONONI)

### Numeros do banco real (1.86 GB)

| Tabela | Registros | Area |
|--------|-----------|------|
| TBL_CLIENTE | **67.377** | Cadastro |
| TBL_PRODUTO | **18.979** | Cadastro |
| TBL_SERVICO | **14.487** | Cadastro |
| TBL_VENDA | **12.598** | Comercial |
| TBL_ITENS_VENDA | **39.279** | Comercial |
| TBL_OS | **8.976** | Servicos |
| TBL_ORCAMENTO | 198 | Comercial |
| TBL_ORC_VENDA | **3.326** | Comercial |
| TBL_COMPRA | **2.978** | Compras |
| TBL_ITENS_COMPRA | **7.552** | Compras |
| TBL_PEDIDO_COMPRA | **1.162** | Compras |
| TBL_NF_2 | **14.194** | Fiscal |
| TBL_NFC | 84 | Fiscal |
| TBL_BOLETO | **13.708** | Financeiro |
| TBL_CONTAS | **1.628** | Financeiro |
| TBL_CHEQUE | 103 | Financeiro |
| TBL_MOVIMENTO | **74.423** | Estoque |
| TBL_ITENS_MOV | **111.849** | Estoque |
| TBL_MOV_PROD | **18.325** | Estoque |
| TBL_VEICULO | **3.638** | Frota |
| TBL_EXPEDICAO | **6.708** | Logistica |
| TBL_PATRIMONIO | **1.040** | Patrimonio |
| TBL_CENTRO_CUSTO | 169 | Financeiro |
| TBL_USUARIO | 153 | Acesso |

**Total de tabelas:** ~280
**Stored Procedures:** 196
**Triggers:** 570

### Areas cobertas no Firebird (que o Grupo Bononi realmente usa)

1. **Cadastros** — Clientes (67K), Produtos (19K), Servicos (14K), Veiculos (3.6K), Fornecedores, Funcionarios
2. **Comercial** — Orcamentos, Vendas (12.6K), Itens de Venda (39K), Orcamentos de Venda (3.3K), Vendas Perdidas, Comissoes
3. **Ordens de Servico** — OS (9K), Pecas OS, Servicos OS, Apontamento de funcionario/maquina, Fotos OS
4. **Compras** — Cotacoes, Pedidos de Compra (1.2K), Compras (3K), Itens de Compra (7.5K)
5. **Fiscal/NF** — NF (emissao), NF_2 (entrada, 14.2K), NFC (cupom, 84), CCe, SAT, MDF-e, XML NFe, Lotes NF, WebService NF
6. **Financeiro** — Contas a Pagar/Receber (1.6K), Boletos (13.7K), Cheques, Caixa, Conciliacao, Renegociacao, Estorno, Fatura (OS/Venda/Compra/NF)
7. **Estoque** — Movimentos (74K), Itens Mov (112K), Mov Prod (18K), Centro Estoque, Balanco, Conferencia, Expedicao (6.7K), Reserva
8. **Frota** — Veiculos (3.6K), Custos Veic, Despesas Veic, Mov Veic, Combustivel
9. **Contratos** — Contratos, Planos, Situacao, Reajustes, Programacao
10. **Patrimonio** — Patrimonio (1K), Mov Patrimonio, Emprestimo/Devolucao
11. **CRM/Processos** — Processos, Fases, Gatilhos, Follow-up, Agenda, Visitas
12. **Configuracao** — Permissoes, Layouts, Relatorios, Config Email/SMS/WhatsApp/Boleto, Auditoria, Logs

### Procedures mais relevantes (196 total)

| Procedure | Funcao |
|-----------|--------|
| CALCULA_COMPRA/NF/NF_2/ORCAMENTO/OS | Calculo tributario completo |
| CALCULA_ST | Substituicao tributaria |
| CALCULA_PESO | Calculo de peso |
| GERA_ESTOQUE_ENTRADA/SAIDA | Movimentacao de estoque |
| GERA_EXPEDICAO | Criacao de expedicao |
| GERA_CONFERENCIA | Conferencia de estoque |
| FLUXO_ESTOQUE* (4 variantes) | Relatorios de estoque |
| CONVERTE_ORC_VENDA/ORC_OS | Conversao de orcamentos |
| CONVERTE_COTACAO_PEDIDO | Fluxo de compras |
| BAIXA_OS | Baixa de ordem de servico |
| BALANCO/BALANCO_OS | Balanco contabil |
| CHEQUES | Gestao de cheques |
| CONTABILIZA_PRODUTO_OS/VENDA | Contabilizacao |
| DEMONSTRATIVO_RESULTADO* | DRE |
| EFICIENCIA_VENDEDOR | Relatorio vendedor |
| CLIENTE_SEM_COMPRA | CRM/reativacao |
| FATOR_HORA | Calculo de horas OS |
| CORRIGE_ESTOQUE | Ajuste de estoque |
| APURA_ICMS/IPI/PIS_COFINS* | Apuracao fiscal SPED |

---

## 2. ERP NOVO (Supabase/React — Estado Atual)

### Tech Stack
- **Frontend:** React 18 + Vite 5 (SPA)
- **Backend/DB:** Supabase (PostgreSQL) — schema `"Teste ERP"`
- **UI:** Design system proprio (ui.jsx) + Lucide React + Recharts
- **Deploy:** Vercel (erp-five-chi.vercel.app)
- **Sem:** TypeScript, React Router, Redux/Zustand, testes

### Modulos ja construidos (7 commits, 2 dias)

| Modulo | Status | Complexidade |
|--------|--------|-------------|
| Login | OK | Basico |
| Dashboard | OK | Graficos + fallback |
| Clientes | OK | CRUD completo + ViaCEP |
| Produtos | OK | CRUD + tributacao |
| Veiculos | OK | CRUD vinculado a cliente |
| Orcamentos | OK | Lista/Form/Detalhe/Aprovacao/Conversao |
| Vendas | OK | CFOP automatico + Faturamento |
| Tipos Operacao | OK | CRUD |
| Ordens de Servico | OK | Servicos + Pecas + Apontamentos |
| Financeiro CR | OK | Titulos + Baixas + Estorno |
| Financeiro CP | OK | Titulos + Baixas + Estorno |
| Contas Financeiras | OK | CRUD |
| Caixa | OK | Abertura/Fechamento/Sangria/Suprimento |
| Cheques | OK | Modulo separado |
| Plano de Contas | OK | Hierarquico |
| Centros de Custo | OK | CRUD |
| **Estoque** | EM BREVE | — |
| **Fiscal** | EM BREVE | — |
| **Separacao** | PLANEJADO | Briefing pronto |

### Logica de negocio no banco (RPCs PostgreSQL)

~30 funcoes RPC ja criadas cobrindo: CRUD de cadastros, fluxo orcamento→venda, faturamento, baixa de titulos com estorno, caixa, plano de contas hierarquico.

---

## 3. AVALIACAO: A BASE E SOLIDA?

### O QUE ESTA BEM (manter)

1. **Arquitetura backend-first** — Regras de negocio nas RPCs do PostgreSQL, nao no frontend. Correto para ERP. Escala.
2. **Supabase/PostgreSQL** — Banco robusto, suporta milhoes de registros com indices adequados. Superior ao Firebird para web.
3. **Design system proprio** — UI consistente sem dependencia de Material UI ou similar. Leve e rapido.
4. **Modulo financeiro completo** — CR, CP, Caixa, Cheques, Plano de Contas hierarquico, Centros de Custo. Raro ver isso tao cedo num projeto.
5. **Permissoes por grupo** — Ja implementado em todos os modulos.
6. **CFOP automatico** — Resolve por UF cliente vs empresa.
7. **Fluxo Orcamento→Venda** — Processo comercial correto.
8. **Cleanup de useEffect** — Evita memory leaks. Bom padrao.

### O QUE PRECISA CORRIGIR (riscos)

| Risco | Severidade | Solucao |
|-------|-----------|---------|
| `Range: 0-9999` em todas as queries | **CRITICO** | Implementar paginacao real (cursor ou offset+limit). Com 67K clientes, vai travar. |
| Chave Supabase no codigo | **ALTO** | Normal para publishable key, MAS exige RLS em TODAS as tabelas. Verificar se esta ativo. |
| `ATOR = 2` hardcoded | **ALTO** | Derivar do usuario autenticado via `supabase.auth`. Essencial para auditoria. |
| Sem TypeScript | **MEDIO** | Migrar gradualmente. Pelo menos tipar as interfaces das RPCs e modelos. |
| Sem React Router | **BAIXO** | Para ERP interno, navegacao por estado funciona. Mas impede bookmarks e deep links. |
| Sem testes | **MEDIO** | Criar testes para RPCs criticas (baixa de titulos, faturamento, estoque). |
| Sem gerenciador de estado | **MEDIO** | Dados recarregados em cada tela. Considerar cache com React Query ou SWR. |

---

## 4. ROADMAP — O QUE FALTA CONSTRUIR

### Comparacao: Firebird (atual) vs ERP Novo

| Area | Firebird | ERP Novo | Gap |
|------|----------|----------|-----|
| Cadastros | Completo | 80% | Falta: Fornecedores, Funcionarios, Transportadoras |
| Comercial | Completo | 90% | Falta: Tabelas de preco avancadas, Cotas vendedor |
| OS | Completo | 85% | Falta: Fotos OS, Integracao OS |
| Compras | Completo | 0% | **TODO**: Cotacoes, Pedidos, Entrada NF |
| Fiscal | Completo (NF-e, NFC-e, NFS-e, MDF-e, SPED) | 0% | **TODO**: Emissao de NF-e, apuracao ICMS/PIS/COFINS |
| Financeiro | Completo | 70% | Falta: Boletos, Conciliacao bancaria, DRE |
| Estoque | Completo | 10% | **TODO**: Saldos, Movimentos, Kardex, Balanco |
| Separacao/Expedicao | Completo (6.7K registros) | PLANEJADO | Briefing pronto |
| Frota | Completo | 0% | Veiculos existe, falta custos/despesas |
| Contratos | Completo | 0% | Baixa prioridade |
| Patrimonio | Completo (1K registros) | 0% | Baixa prioridade |
| CRM/Processos | Completo | 0% | Media prioridade |
| Relatorios | 50+ relatorios | 0% | **TODO**: DRE, Faturamento, Estoque, Vendedor |

### Prioridade sugerida (proximos modulos)

1. **Estoque** (base para Separacao e Compras)
2. **Separacao** (briefing ja pronto, depende de Estoque)
3. **Compras** (Cotacao → Pedido → Entrada)
4. **Fiscal** (NF-e minimo para faturar)
5. **Relatorios** (DRE, Faturamento, Estoque)
6. **Boletos/Conciliacao** (complemento financeiro)
7. **Fornecedores/Transportadoras** (cadastros de apoio)
8. **Frota/Patrimonio/CRM** (fase 2)

---

## 5. RECOMENDACOES TECNICAS

### Imediato (antes de continuar desenvolvendo)

1. **Paginacao** — Substituir `Range: 0-9999` por paginacao real em todas as listagens
2. **RLS** — Garantir Row Level Security em todas as tabelas do Supabase
3. **Autenticacao** — Integrar `supabase.auth` e derivar ATOR da sessao
4. **Git local** — Clonar o repo para ter o codigo localmente: `git clone https://github.com/leobononi2906/ERP "C:\CLAUDE\Projetos GitHub\ERP"`

### Curto prazo

5. **TypeScript** — Migrar arquivos gradualmente (renomear .jsx → .tsx)
6. **React Query** — Cache e invalidacao automatica de dados
7. **Indices no Supabase** — Criar indices compostos para queries frequentes (titulos por status+empresa, estoque por produto+centro)

### Medio prazo

8. **Testes das RPCs** — pgTAP ou testes via Supabase CLI
9. **CI/CD** — GitHub Actions para build + deploy automatico
10. **Backup automatico** — Supabase ja faz, mas configurar point-in-time recovery

---

## 6. VOLUME ESTIMADO PARA PRODUCAO

Baseado nos dados reais do Firebird, o ERP novo precisa suportar:

| Metrica | Volume atual | Projecao 3 anos |
|---------|-------------|----------------|
| Clientes | 67K | 100K+ |
| Produtos | 19K | 25K |
| Movimentos estoque/mes | ~6K | ~10K |
| Vendas/mes | ~1K | ~2K |
| Titulos financeiros | ~15K | ~50K |
| NF-e/mes | ~1.2K | ~2K |
| Usuarios simultaneos | ~20 | ~50 |

**PostgreSQL/Supabase aguenta tranquilo** — mas com paginacao obrigatoria e indices corretos.
O Firebird com 1.86 GB ja mostra sinais de limite. O PostgreSQL nao tera esse problema.
