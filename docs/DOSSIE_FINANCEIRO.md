# Financeiro do ERP — Guia de Discussão para Implantação

> **Para quê é este documento:** você já usa o app e sabe operá-lo. Aqui **não** vamos re-explicar as telas — vamos **discutir item por item** o que o Financeiro precisa. Percorra a lista, e em cada ponto marque a sua decisão. No fim (Parte C) tem o molde do **relatório** que você me devolve: o que a gente **vai implementar**, o que **não vai**, o que **tem saída** e o que **não tem saída**.
>
> **Você não altera nada** — só lê, debate (pode colar trechos daqui numa IA para discutir) e decide.
>
> Como marcar cada item:
> `[ ] Implementar` · `[ ] Não implementar` · `[ ] Já atende (deixa como está)` · `[ ] Sem saída hoje` — e **Prioridade: Alta / Média / Baixa**.
> Sempre que puder, escreva **como é na sua rotina** (o "porquê"), que é o que vale pra gente.
>
> Levantamento real em 19/08/2026 (feito no código e no banco).

---

## Parte A — Contexto em 30 segundos

- A **estrutura** do financeiro está madura: contas a pagar/receber, baixa, estorno, aprovação, caixa, cheques, contas bancárias, plano de contas (DRE) e centros de custo. A tabela de títulos já prevê **boleto, juros, multa, competência e conciliação de cartão**.
- Mas **ainda quase não rodou**: hoje há **70 títulos, 2 baixas, 0 cheques, 1 caixa** — tudo de teste. O financeiro só ficou realmente operável depois de 17/08 (foram corrigidos bugs que o mantinham parado).
- **Ou seja:** é a hora certa de você dizer o que fica, o que muda e o que falta — mudar agora custa pouco.

Legenda de situação usada abaixo:
**✅ Já existe** · **🟡 Pedido/decidido, ainda não feito** · **💡 Ideia/fase futura** · **⚠️ Risco/lacuna**

---

## Parte B — Grelha de discussão (item por item)

### Bloco 1 — Receber (Contas a Receber)

**1.1 — Meios de recebimento (dinheiro/PIX/cartão/boleto/cheque)**
Hoje o título nasce com vencimento e você baixa manualmente escolhendo a conta. **Discussão:** quais meios pesam mais e como cada um deveria dar baixa?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Obs.: ______________________

**1.2 — ⚠️ Cadastro por código à mão**
Criar título avulso pede o **código do cliente digitado** (sem busca por nome). Risco de lançar no cliente errado. **Discussão:** precisa de busca por nome?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Obs.: ______________________

**1.3 — ⚠️ Juros e multa automáticos por atraso**
Hoje juros/multa/desconto são digitados **na mão** na hora de receber. **Discussão:** qual a regra da casa (multa %, juros ao dia) e deveria ser automático?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Regra hoje: ______________________

**1.4 — 🟡 Usar saldo de crédito do cliente para abater título**
Existe o crédito do cliente (devoluções etc.), mas ainda **não há botão** para usar esse saldo abatendo um título. **Discussão:** precisa?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Obs.: ______________________

**1.5 — 💡 Boleto bancário registrado (arquivo do banco / CNAB / PDF)**
Hoje o sistema gera o **título com vencimento**, mas **não** o boleto oficial do banco. **Discussão:** vocês precisam emitir boleto registrado? Qual banco/convênio?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Banco/convênio: ______________________

**1.6 — 💡 Baixa por retorno do banco (arquivo de retorno / conciliação de recebíveis)**
Baixar vários recebimentos de uma vez, a partir do arquivo que o banco devolve. **Discussão:** hoje quantas baixas/dia? Vale automatizar?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Volume/dia: ______________________

### Bloco 2 — Pagar (Contas a Pagar)

**2.1 — Fluxo cadastrar → aprovar → pagar**
Hoje um título a pagar precisa ser **aprovado** antes de liberar o pagamento. **Discussão:** esse fluxo reflete a rotina? Quem faz cada etapa?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Quem cadastra/aprova/paga: ______________________

**2.2 — ⚠️ Alçada de aprovação (limite por pessoa/valor)**
Hoje **aprova qualquer valor**, sem limite. **Discussão:** precisa de alçada (ex.: acima de X só fulano aprova)?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Limites desejados: ______________________

**2.3 — Anexar nota/comprovante ao título; agendamento em lote**
Hoje não há anexo nem pagamento agendado em lote. **Discussão:** precisa anexar documento? Pagar vários de uma vez por data?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Obs.: ______________________

### Bloco 3 — Caixa da loja

**3.1 — ⚠️ Caixa "escondido" (sem botão no menu)**
A tela de Caixa funciona, mas **hoje não abre pelo menu do Financeiro**. **Discussão:** confirmar que precisa de porta de entrada (óbvio, mas registrar).
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

**3.2 — Conferência às cegas no fechamento**
Ao fechar, o operador digita quanto contou **sem ver** o esperado; o sistema mostra a diferença. **Discussão:** atende? A justificativa de diferença deveria ser **obrigatória**?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Obs.: ______________________

**3.3 — 🟡 Caixa "só teclado" (rápido no balcão)**
Pedido do balcão: operar caixa sem mouse. **Discussão:** prioridade real?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

### Bloco 4 — Cheques

**4.1 — Carteira, compensar, devolver (com estorno do título)**
Já existe; devolver cheque **estorna** o recebimento do título ligado. **Discussão:** atende à rotina de cheques?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Obs.: ______________________

**4.2 — ⚠️ Repassar cheque a terceiro (endosso)**
Existe o status "Repassado", mas **não há ação** para repassar/endossar. **Discussão:** vocês repassam cheque a fornecedor?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

### Bloco 5 — Bancos e conciliação

**5.1 — Contas, extrato e transferência entre contas**
Já existe; transferência entre contas é como se move dinheiro entre empresas. **Discussão:** atende?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Obs.: ______________________

**5.2 — 💡 Conciliação bancária (importar extrato / OFX)**
Hoje **não existe**. **Discussão:** é essencial no começo ou pode vir depois?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Como concilia hoje: ______________________

**5.3 — 💡 Fluxo de caixa projetado**
Prever quando cada recebimento cai (usando prazo médio da forma; cartão ~30 dias). Hoje não há. **Discussão:** precisa da projeção?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

### Bloco 6 — Faturamento ↔ Financeiro (o coração)

**6.1 — 🟡 Popup "Movimento Financeiro" ao Faturar**
Ao faturar venda/OS, abrir uma janela **antes de finalizar** com: parcelas editáveis, opção de gerar boleto, rateio pro DRE e NSU do cartão. É a definição de "faturado" do grupo. **Discussão:** é isso mesmo que o Financeiro quer ver no ato de faturar?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — O que não pode faltar nesse popup: ______________________

**6.2 — 🟡 Conciliação de cartão (NSU/transação)**
Amarrar a venda no cartão com o NSU/transação para depois conferir com a operadora. **Discussão:** precisa?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

**6.3 — 💡 Pedidos de marketplace (Bling) virando financeiro**
Trazer o pedido do marketplace e gerar automaticamente venda + baixa de estoque + título. O ERP **ainda não lê** esses pedidos. **Discussão:** o Financeiro precisa desses títulos dentro do ERP?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

### Bloco 7 — Resultado (DRE) e classificação

**7.1 — DRE por competência × caixa (alternar)**
Os dois campos existem no título, mas o DRE **ainda não alterna** entre os dois regimes. **Discussão:** você precisa dos dois? Qual é o principal?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Regime principal: ______________________

**7.2 — ⚠️ Custo (CMV) pode sair zerado no DRE**
Enquanto não houver entradas de mercadoria com custo real, o custo sai subestimado e o resultado parece "bom demais". **Discussão:** ciente? Depende da implantação de Compras/estoque.
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

**7.3 — 🟡 Provisões (ex.: trabalhistas) no DRE por competência**
Ainda não entram. **Discussão:** precisa provisionar?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

**7.4 — Editar/inativar Plano de Contas e Centros de Custo**
Hoje as duas telas **só criam** (não editam/inativam). **Discussão:** precisa editar/inativar pela tela?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

### Bloco 8 — Controle e segurança

**8.1 — ⚠️ Permissões nas ações financeiras (segregação de função)**
Hoje ações sensíveis (baixar, estornar, aprovar pagamento, transferir, abrir/fechar caixa, devolver cheque) **não checam quem pode fazer**. Não há separação entre quem cadastra, quem aprova e quem paga. **Discussão:** como deve ser a separação de funções no Financeiro?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Quem pode o quê: ______________________

**8.2 — 🟡 Unificar a geração de título**
Hoje há **dois caminhos** para gerar título (faturamento x rotina de parcelas); podem nascer diferentes. Unificação já decidida, falta fazer. **Discussão:** só registrar/confirmar.
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

### Bloco 9 — Relatórios (liste os que faltam)

**9.1 — Relatórios que o Financeiro não pode viver sem**
Ex.: fluxo de caixa, inadimplência/aging, DRE mensal, posição bancária, recebimentos por forma. **Discussão:** liste os obrigatórios e diga quais já existem/atendem.
Relatórios essenciais: ______________________________________________
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___

### Bloco 10 — Multi-empresa

**10.1 — Regras por empresa (contas próprias, transferências entre elas)**
Título só baixa em conta da própria empresa; mover entre empresas é por transferência. **Discussão:** reflete como o grupo opera?
`[ ] Implementar [ ] Não [ ] Já atende [ ] Sem saída` — Prioridade: ___ — Obs.: ______________________

---

## Parte C — Molde do relatório final (o que você me devolve)

Depois de discutir, resuma nas quatro caixas abaixo (pode copiar e preencher):

### 1) VAMOS IMPLEMENTAR (prioridade Alta → Baixa)
| Item (nº da grelha) | O quê | Por quê (rotina) | Prioridade |
|---|---|---|---|
|  |  |  |  |

### 2) NÃO VAMOS IMPLEMENTAR (por ora)
| Item | Motivo |
|---|---|
|  |  |

### 3) JÁ ATENDE (deixa como está)
| Item | Observação |
|---|---|
|  |  |

### 4) SEM SAÍDA HOJE / DEPENDE DE OUTRA COISA
| Item | Do que depende (banco, Compras, integração, fornecedor externo…) |
|---|---|
|  |  |

**Fecho do relatório — as 3 primeiras coisas a funcionar na implantação:**
1. ______________________
2. ______________________
3. ______________________

---

## Glossário rápido
- **Título:** conta a pagar ou a receber (vencimento, valor, parcela).
- **Baixa / Estorno:** registrar o pagamento-recebimento / desfazê-lo.
- **Competência × Caixa:** mês a que a receita/despesa pertence × dia em que o dinheiro entrou/saiu.
- **DRE:** resultado (receitas − custos − despesas).
- **CNAB / boleto registrado:** arquivo que o banco exige para emitir boletos oficiais e devolver os pagamentos.
- **Conciliação:** casar o extrato do banco com os lançamentos do sistema.
- **NSU:** número que identifica uma transação de cartão.
- **Alçada:** limite de valor que cada pessoa pode aprovar.

---

*Documento de discussão — nada é alterado a partir daqui. O próximo passo é você devolver a Parte C preenchida para priorizarmos a implantação.*
