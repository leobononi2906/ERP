# Rascunho — Plano de Contas (para o contador ajustar)

> Base: as 33 contas que já existem no ERP + o que falta pro negócio do grupo. **Nada aplicado no banco.** É rascunho pra debate.
> Convenção: **(NOVO)** = sugestão que ainda não existe. Códigos podem ser renumerados pelo contador.
> Regra de ouro: **canal (loja/online/distribuição) NÃO é conta — é centro de custo.** A receita é uma só; o corte por canal vem da outra dimensão. (ver `SPEC_CLASSIFICACAO_FINANCEIRA.md`)

## Decisões fechadas pelo Leo (19/08)
1. **Garantia, troca, descarte, peças usadas em garantia** → cada um tem **natureza de operação própria**; classificação resolvida **na operação** (não no produto).
2. **Impostos sobre vendas** (ICMS/ST, PIS, COFINS, IPI) → entram como **DEDUÇÕES da receita** (bloco 1.2), não como despesa operacional.
3. **Receita fica junta** (não quebra por família). O corte **Nacional × Importado** continua vindo do **produto/grupo/subgrupo**, como já é hoje.
4. **DRE editável** (linhas montáveis sem código, como no `bononi-dashboard`) — ver seção no fim.

---

## 1. RECEITAS
```
1        RECEITAS
1.1      Receita Bruta de Vendas
1.1.1    Venda de Produtos
1.1.1.1    Venda Produtos Nacional
1.1.1.2    Venda Produtos Importados
1.1.2    Venda de Serviços
1.1.3    Receita de OS
1.1.4    Receita de Frete
1.2      (NOVO) Deduções de Vendas          ← reduz a receita (contra-receita)
1.2.1      (NOVO) Devoluções de Vendas
1.2.2      (NOVO) Cancelamentos / Estornos de Venda
1.2.3      (NOVO) Impostos sobre Vendas (ICMS/ST, PIS, COFINS, IPI)   [DECIDIDO: fica aqui, como dedução]
1.2.4      (NOVO) Simples Nacional sobre Vendas   [se Simples, imposto sobre receita = dedução — confirmar com contador]
1.3      Outras Receitas                     [era 1.2 hoje]
1.3.1      Juros Recebidos
1.3.2      Descontos Obtidos
```

## 2. DESPESAS
```
2        DESPESAS
2.1      Custo de Mercadorias
2.1.1      CMV — Custo das Mercadorias Vendidas     ← lançado automático na venda (ver nota A)
2.2      (NOVO) Despesas Comerciais / de Vendas
2.2.1      (NOVO) Comissões de Vendedores
2.2.2      (NOVO) Taxas de Marketplace (Mercado Livre, etc.)
2.2.3      (NOVO) Taxas de Cartão / Adquirente
2.2.4      (NOVO) Marketing e Anúncios (Ads)
2.2.5      (NOVO) Frete sobre Vendas (frete pago pela empresa)
2.2.6      (NOVO) Cortesias / Brindes / Bonificações   ← CASA DA "CORTESIA" (ver nota B)
2.3      Despesas Operacionais / Administrativas   [era 2.2 hoje]
2.3.1      Folha de Pagamento
2.3.2      Aluguel
2.3.3      Energia Elétrica
2.3.4      Telefone e Internet
2.3.5      Material de Escritório
2.3.6      Combustível e Transporte
2.4      Despesas Financeiras                 [era 2.3 hoje]
2.4.1      Juros Pagos
2.4.2      Tarifas Bancárias
2.4.3      Multas e Penalidades
2.5      Tributos e Obrigações (NÃO ligados a venda)   [era 2.4 hoje]
2.5.1      ISSQN (sobre serviços)          [contador: pode ser dedução se incide sobre a receita de serviço]
2.5.2      INSS (patronal / folha)
2.5.3      FGTS
2.5.4      Outras obrigações
   (Simples Nacional e impostos sobre venda saíram daqui → viraram DEDUÇÃO em 1.2)
```

## 3. TRANSFERÊNCIAS (neutro — não entra no resultado)
```
3        TRANSFERÊNCIAS
3.1      Transferência entre Contas
```

---

## Notas de desenho (o "porquê")

**A) CMV é automático, não vem da cascata.** Cada item vendido gera **duas pernas**: a **receita** (pela cascata: natureza→produto→subgrupo→grupo) e o **custo (CMV)**, que é sempre lançado na conta **2.1.1** com base no custo médio do produto. O plano de contas resolvido pela cascata é o da **receita/despesa da operação** — o CMV o sistema posta sozinho. (Por isso o custo zerado hoje derruba o DRE — depende de Compras alimentar o custo real.)

**B) Cortesia = o exemplo que trava a regra.** Uma operação de **cortesia** tem natureza própria que aponta pra **2.2.6 (Cortesias/Brindes)** — e isso **sobrepõe** o produto. Não gera receita; pode gerar CMV (saiu do estoque). É o caso clássico de "a natureza manda em tudo".

**C) Deduções de Vendas (1.2).** Hoje os dashboards do grupo já calculam faturamento **líquido = bruto − devolução**. Ter as deduções como grupo próprio deixa o DRE bater com esses números. O contador decide se impostos sobre venda ficam aqui (dedução da receita) ou em 2.5 (despesa) — muda a cara do DRE.

---

## Mapa Natureza da operação → Conta (a definir com você)
A cascata começa na **natureza da operação**. Sugestão de amarração (ajustável):

| Natureza da operação | Conta sugerida |
|---|---|
| Venda de produto | 1.1.1 Venda de Produtos |
| Venda de serviço | 1.1.2 Venda de Serviços |
| Ordem de Serviço | 1.1.3 Receita de OS |
| Frete cobrado | 1.1.4 Receita de Frete |
| **Cortesia / brinde** | **2.2.6 Cortesias/Brindes** |
| Bonificação | 2.2.6 (ou conta própria) |
| Devolução de venda | 1.2.1 Devoluções de Vendas |
| **Garantia** (peça/produto usado em garantia) | definido na própria natureza (tipo de operação) |
| **Troca** | definido na própria natureza (tipo de operação) |
| **Descarte de produto** | definido na própria natureza (tipo de operação) |
| Transferência entre empresas/contas | 3.1 Transferência entre Contas |

> **CONFIRMADO (19/08):** garantia e troca **não têm nada a mexer** — quem manda é o **tipo de entrada/saída (natureza da operação)**, que já aponta a conta. A cascata **não olha o produto** nesses casos. Só falta o contador dizer **qual conta** cada natureza usa (sugestão: bloco "2.6 Perdas e Garantias"), mas o mecanismo está fechado.

Quando a natureza **não** define (operação genérica de venda), cai pro **produto → subgrupo → grupo**.

**D) Receita separada por família de produto? — DECIDIDO: começa JUNTA.**
A receita fica no genérico **1.1.1 Venda de Produtos**. O corte que já existe — **Nacional × Importado** — continua vindo do **produto/grupo/subgrupo** (como hoje). Quebra por família de produto só nos relatórios de produto, não no DRE. Sub-contas de receita só se o contador pedir depois.

---

## DRE editável (portado do bononi-dashboard)
O DRE **não** é fixo no código — é **montável**, no mesmo modelo do dashboard atual:
- **Linhas do DRE** = `dre_config_grupos` (ordem, ativo, e linhas **calculadas por fórmula**, ex.: Lucro Bruto = Receita − CMV).
- **O que cada linha soma** = `dre_config_vinculos` — no ERP, os vínculos apontam pro **plano de contas** (a natureza).
- **Corte por canal** = filtro/coluna por **centro de custo** (Loja física / Online / Distribuição / Administrativo).
- **Dois regimes** (competência × caixa), como o dashboard já faz.
Resultado: você/contador arruma o formato do DRE **sem programador** — arrasta linhas, cria totais, escolhe o que entra em cada uma.

---

## Decisões que ainda faltam (com o contador)
1. **Contas das operações especiais**: em que conta caem Garantia, Troca, Descarte (sugestão: bloco "2.6 Perdas e Garantias").
2. **ISSQN**: dedução (sobre receita de serviço) ou despesa?
3. **Simples Nacional**: confirmar como dedução da receita (se o grupo é Simples).
4. Confirmar as contas **(NOVO)** que fazem sentido (comissão, taxas MP/cartão, ads, cortesia).
5. Ok **renumerar** pra encaixar as novas, ou manter códigos atuais e anexar no fim?
6. **De-para natureza → conta** completo (a tabela acima é sugestão).
