# ROADMAP — ERP BONONI

> Baseado na analise do sistema Firebird (SGA_BONONI) e do ERP novo (Supabase/React).
> Atualizado: 21/07/2026

---

## FASE 0 — CORRECOES CRITICAS (antes de tudo)

- [ ] Implementar paginacao real (substituir `Range: 0-9999`)
- [ ] Verificar/ativar RLS em todas as tabelas do Supabase
- [ ] Integrar `supabase.auth` e remover `ATOR = 2` hardcoded
- [ ] Clonar repo Git localmente
- [ ] Revisar seguranca das chaves no config.js

---

## FASE 1 — ESTOQUE (base para tudo)

### Por que primeiro?
Separacao, Compras e Fiscal dependem de estoque funcional. No Firebird sao 74K movimentos + 112K itens — e o modulo mais movimentado.

### Tabelas necessarias (Supabase)
- `centros_estoque` — depositos por empresa (ja existe parcialmente)
- `estoque_saldos` — estoque_atual, estoque_reservado, estoque_disponivel, custo_medio, por produto+centro
- `estoque_movimentos` — Kardex: tipo, origem, quantidade, estoque_anterior, estoque_posterior, custo
- `estoque_reservas` — reservas por separacao/venda

### Telas
- Painel de Saldos (por centro, empresa, produto) com busca e filtros
- Kardex do Produto (historico de movimentos)
- Ajustes de Estoque (entrada/saida manual com justificativa)
- Balanco/Inventario (conferencia fisica)
- Centros de Estoque (CRUD)

### RPCs
- `erp_estoque_saldos_listar` — com filtros e paginacao
- `erp_estoque_kardex` — movimentos de um produto
- `erp_estoque_ajuste` — entrada/saida com registro no Kardex
- `erp_estoque_balanco` — conferencia e ajuste em lote

---

## FASE 2 — SEPARACAO (briefing pronto)

> Detalhes completos em `BRIEFING_MODULO_SEPARACAO.md`

- Fila de Separacao (boqueta)
- Validacao item a item
- Reservas de estoque
- Vendas perdidas
- Movimentacoes internas
- Gondola (centro especial)

---

## FASE 3 — COMPRAS

### Fluxo (igual ao Firebird)
Cotacao → Pedido de Compra → Entrada (NF de entrada)

### Tabelas
- `fornecedores` — cadastro completo (CNPJ, IE, endereco, contatos)
- `cotacoes` + `cotacoes_itens` + `cotacoes_fornecedores`
- `pedidos_compra` + `pedidos_compra_itens`
- `entradas` + `entradas_itens` — vinculo com NF de entrada

### Telas
- Fornecedores (CRUD)
- Cotacoes (multiplos fornecedores por cotacao)
- Mapa de Cotacao (comparativo de precos)
- Pedidos de Compra (conversao de cotacao)
- Entradas (registro de NF + entrada no estoque)
- Demanda de Compra (baseado em vendas perdidas + estoque minimo)

### RPCs
- `erp_cotacao_salvar`, `erp_cotacao_converter_pedido`
- `erp_pedido_compra_salvar`, `erp_pedido_compra_converter_entrada`
- `erp_entrada_salvar` (gera movimento de estoque + atualiza custo medio)
- `erp_demanda_compra` (calcula necessidade de compra)

---

## FASE 4 — FISCAL (minimo viavel)

### Escopo minimo
- Emissao de NF-e (SEFAZ)
- Emissao de NFC-e (cupom fiscal)
- DANFE (PDF)
- Cancelamento e CCe

### Tabelas
- `notas_fiscais` — numero, serie, chave_acesso, xml, status_sefaz, protocolo
- `notas_fiscais_itens` — impostos calculados (ICMS, IPI, PIS, COFINS, ST)
- `configuracao_fiscal` — CST, CFOP, aliquotas por UF, CSOSN

### Integracao
- API de emissao NF-e (Focus NFe, Tiny, ou similar)
- Certificado digital A1
- Calculo tributario baseado nas 196 procedures do Firebird (referencia)

### Fase 2 Fiscal (futuro)
- NFS-e (servicos)
- MDF-e (transporte)
- SPED Fiscal/Contribuicoes
- Apuracao ICMS/PIS/COFINS

---

## FASE 5 — RELATORIOS E BI

### Relatorios essenciais
- DRE (Demonstrativo de Resultado)
- Faturamento por periodo/vendedor/empresa
- Comissoes de vendedores
- Estoque valorizado
- Posicao financeira (CR/CP)
- Fluxo de caixa projetado
- Curva ABC de produtos
- Clientes inadimplentes
- Eficiencia de vendedor (equivalente ao Firebird)
- Vendas perdidas (alimentado pela Separacao)

### Ferramenta
- Recharts (ja instalado) para graficos no Dashboard
- Exportacao CSV/PDF para relatorios detalhados

---

## FASE 6 — COMPLEMENTOS FINANCEIROS

- Geracao de boletos (integracao bancaria)
- Conciliacao bancaria (importar OFX/CNAB)
- Renegociacao de titulos
- Fluxo de caixa projetado
- DRE automatico baseado em Plano de Contas

---

## FASE 7 — MODULOS SECUNDARIOS

### Frota
- Custos de veiculo (combustivel, manutencao, pneus)
- Despesas por veiculo
- Controle de KM

### Patrimonio
- Cadastro de bens
- Depreciacao
- Emprestimo/devolucao

### CRM
- Pipeline de vendas
- Follow-up
- Agenda
- Visitas

### Contratos
- Contratos recorrentes
- Reajustes automaticos
- Programacao de faturamento

---

## RESUMO DE PRIORIDADE

| Fase | Modulo | Dependencia | Impacto |
|------|--------|-------------|---------|
| 0 | Correcoes criticas | Nenhuma | Seguranca e performance |
| 1 | Estoque | Fase 0 | Base para Separacao e Compras |
| 2 | Separacao | Fase 1 | Operacao diaria da boqueta |
| 3 | Compras | Fase 1 | Ciclo de suprimentos |
| 4 | Fiscal | Fase 3 | Faturamento legal |
| 5 | Relatorios | Fases 1-4 | Gestao e tomada de decisao |
| 6 | Complementos Fin. | Fase 4 | Automacao financeira |
| 7 | Secundarios | Fase 5 | Funcionalidades de apoio |
