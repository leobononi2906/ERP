# Centro de Comando do CEO — Desenho do Sistema

> Sistema automatizado de gestão do Grupo Bononi.
> Objetivo: tirar o CEO da consulta de dashboard e colocá-lo na tomada de decisão.
> Criado: 15/08/2026 — Leonardo Bononi

---

## 1. O problema

Os números existem e estão corretos, mas moram em 3-4 dashboards diferentes.
Para responder uma pergunta simples de gestão ("como foi a semana?"), é preciso
entrar em vários lugares e cruzar de cabeça. Resultado: a leitura demora, às
vezes não acontece, e a decisão atrasa.

**O gargalo não é falta de dado. É falta de consolidação e de ritual.**

Dashboard é ferramenta de consulta — quem consulta é operador. Gestor recebe e
decide. Enquanto for preciso *entrar* em algum lugar para saber como foi a
semana, o CEO segue na operação de olhar número.

## 2. Vantagem inicial

A maior parte do dado já está no ERP (Supabase, schema `"Teste ERP"`):
Vendas, Orçamentos, OS, Estoque, Financeiro (CR/CP, Caixa, Cheques),
Distribuição de Serviços, Devoluções, Comissões, Precificação, RH/Folha.

Ou seja: **não é preciso "entregar os dados toda segunda"** para a maior parte.
O sistema puxa. Só três fontes vêm de fora.

## 3. Decisões tomadas (15/08/2026)

| Decisão | Escolha |
|---|---|
| Onde o relatório chega | **Página web (link)** — visual, histórico, abre no celular |
| Fontes externas ao ERP | E-commerce, Atendimento/WhatsApp, Metas e Orçamento |
| Prioridade nº 1 | **Resultado consolidado** — faturamento, margem e resultado de todos os canais num lugar só |
| Estratégia de partida | Piloto manual com dados do ERP antes de automatizar |

---

## 4. Arquitetura — 5 camadas

### Camada 1 — Cubo único de KPI (fonte de verdade)

Camada consolidada no Supabase na granularidade `dia × empresa × canal × métrica`.

Objetivo: qualquer número, em qualquer relatório, sai sempre do mesmo lugar.
Acaba o problema de dois dashboards mostrarem valores diferentes para a mesma
coisa.

- Tabela/view de KPI diário, alimentada por RPCs (lógica no banco, não no front)
- Dimensões: dia, empresa, canal (loja / distribuição / e-commerce / serviços), vendedor, curva ABC
- Toda métrica declarada com sua regra de cálculo — sem ambiguidade

### Camada 2 — Portas de entrada (o que está fora do ERP)

Três níveis, do melhor para o pior:

1. **API da plataforma** — automático, sem toque humano (alvo final)
2. **Arquivo no Google Drive** — pasta fixa, lida automaticamente (bom para o piloto)
3. **Colar no chat** — manual, aceitável só no começo

Fontes a integrar: e-commerce, ferramenta de atendimento, planilha de metas.

### Camada 3 — Comitê de Segunda (o ritual)

Toda segunda de manhã, automático. **Uma página**, quatro blocos:

1. **Como foi a semana** — 3 linhas, não 3 páginas
2. **O que mudou de comportamento e por quê** — a análise, não a tabela
3. **O que exige decisão sua** — opção A/B e recomendação
4. **O que já foi preparado/executado**

Comparações obrigatórias em todo número: semana anterior, mesmo período do ano
passado, e meta.

### Camada 4 — Livro de Decisões e Programas

A peça que separa relatório bonito de gestão de verdade.

Toda decisão vira registro com **dono, prazo e métrica de sucesso**. O relatório
da semana seguinte cobra o andamento automaticamente:

> "Programa de recompra de cliente inativo — 3ª semana. Meta 40 clientes,
> realizado 22. Causa provável: lista sem telefone válido."

Sem essa camada, relatório vira entretenimento.

### Camada 5 — Alerta por exceção (durante a semana)

O que mais tira o CEO da operação: o número chama, ele não vai atrás do número.

Dispara só fora da curva:
- Cliente curva A sem comprar há X dias
- Margem de venda abaixo do piso
- Ruptura de estoque em produto curva A
- Inadimplência acelerando
- OS/orçamento parado há mais de X dias

**Silêncio = está tudo dentro do esperado.** Silêncio é liberdade.

---

## 5. Painel nº 1 — Resultado Consolidado (prioridade declarada)

Estrutura alvo: P&L gerencial por canal, lado a lado.

| Bloco | Métricas |
|---|---|
| Receita | Faturamento bruto, devoluções, faturamento líquido, por canal |
| Margem | CMV, margem bruta R$ e %, margem por canal e por curva |
| Volume | Nº de pedidos/OS, ticket médio, itens por pedido |
| Comercial | Vendas por vendedor vs. meta, clientes ativos, novos, recuperados, perdidos |
| Caixa | Entradas, saídas, saldo, a receber vencido, a receber a vencer |
| Estoque | Valor total, cobertura em dias, ruptura em curva A, estoque parado |

Cada número com três comparativos: **semana anterior · mesmo período ano anterior · meta**.

---

## 6. Roadmap de implantação

### Fase 0 — Piloto (1 semana) ← ESTAMOS AQUI
Montar o relatório de segunda **uma vez, na mão**, só com dados do ERP.
Objetivo: descobrir de verdade quais são os 10 números que importam.
Automatizar o relatório errado é o jeito mais caro de errar.

### Fase 1 — Cubo de KPI
Consolidar no Supabase as métricas validadas no piloto. Definir e documentar a
regra de cálculo de cada uma.

### Fase 2 — Página web + automação semanal
Publicar o painel e agendar a geração automática toda segunda.

### Fase 3 — Fontes externas
Entrar e-commerce, atendimento e metas. Começar por arquivo no Drive, evoluir
para API.

### Fase 4 — Livro de Decisões + alerta por exceção
Fechar o ciclo: número → decisão → dono → cobrança → resultado.

---

## 7. Insumos que dependem do Leonardo

| Insumo | Por quê | Status |
|---|---|---|
| **Metas por canal/vendedor/mês** | Sem meta, número não vira decisão. É o insumo mais importante. | Pendente |
| Plataforma de e-commerce | Definir se tem API ou se vai por arquivo | Pendente |
| Ferramenta de atendimento | Idem | Pendente |
| Definição de "canal" | Como separar loja / distribuição / e-commerce / serviços no ERP | Pendente |

---

## 8. Riscos e armadilhas

- **Sem meta declarada, o relatório vira boletim.** "Vendemos 320 mil" não diz
  nada. "320 contra meta de 380, terceira semana abaixo" diz tudo.
- **Dado que entra torto sai torto.** Se e-commerce e loja classificam produto
  ou cliente de forma diferente, o consolidado dá número errado com cara de
  certo. Conferir na Fase 0.
- **Excesso de métrica mata o ritual.** Se a página de segunda tiver 60 números,
  ninguém lê. O alvo é ~10 números na primeira dobra.
- **Relatório sem cobrança não muda nada.** A Camada 4 não é opcional.
