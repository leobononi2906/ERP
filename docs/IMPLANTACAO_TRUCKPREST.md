# Roteiro de Virada — Piloto Truckprest

> Plano de go-live do **primeiro piloto** do ERP, na **Truckprest** (empresa id 5, CNPJ 57.129.987, PR, **Simples Nacional**). Montado pela sessão *Cérebro de implantação* (13–16/08/2026).
> **Por quê Truckprest:** tem a operação completa (OS, solicitação de peças, boqueta, remessa/retorno, estoque) e é Simples (fiscal mais simples). Valida quase tudo com o menor risco fiscal.

---

## Princípios (a regra do jogo)

1. **Firebird continua ligado** o tempo todo — é a rede de segurança. Só desliga quando a Truckprest estiver 100% provada.
2. **Rodar em PARALELO:** por semanas, o mesmo lançamento entra nos dois sistemas e a gente compara.
3. **Operação ANTES de emissão fiscal:** liga o fluxo interno (OS, peças, estoque, remessa) primeiro; a **nota (NFS-e/NF-e) é o ÚLTIMO** passo, homologada.
4. **Um módulo de cada vez** — nunca tudo no mesmo dia. Cada fase tem critério de aceite antes de avançar.
5. **Plano de volta** por módulo: se der ruim, volta pro Firebird naquele módulo.

---

## Fase 0 — Pré-requisitos (antes de ligar qualquer coisa)

| Item | Responsável | Aceite |
|---|---|---|
| **Decisão de infra:** o piloto roda no **servidor interno** (alvo real) ou no **Supabase atual** (mais rápido de começar)? Recomendo on-prem, pra testar o ambiente junto — mas exige PostgreSQL instalado + migrations aplicadas + backup. | Leo + TI | Ambiente escolhido e no ar |
| **Backup automático testado** (restaurar de verdade) | TI | Restauração feita 1× com sucesso |
| **Migração de dados da Truckprest** do Firebird: clientes, produtos, **saldos de estoque**, **títulos em aberto** | Dev + Leo | **Números batem** com o Firebird (conferência lado a lado) |
| **Usuários da Truckprest → grupos de permissão** (vendedor, técnico/pátio, boqueta, financeiro, gestão de estoque) | Leo | Cada um vê/faz só o que deve |
| **Key user** nomeado na Truckprest (1 pessoa que aprende fundo e treina) | Leo | Pessoa definida |

> Nada avança pra Fase 1 sem os **saldos de estoque conferidos** — é o que mais causa dor se feito às pressas.

---

## Fase 1 — Cadastros (fundação)

**Objetivo:** clientes, produtos e estoque da Truckprest corretos no ERP.
- Validar **clientes** (código sequencial = igual ao Firebird), **produtos** (código + referência + localização), **saldos de estoque** por centro.
- Conferir **perfis de pagamento** dos clientes (à vista / prazo).

**Aceite:** amostra de clientes e produtos conferida; saldo de estoque bate com o Firebird.
**Rollback:** trivial (só consulta; nada operou ainda).

---

## Fase 2 — Operação (SEM emitir nota) — o coração do piloto

Ligar em sub-etapas, cada uma rodando em paralelo ao Firebird:

**2a. Ordem de Serviço** — abertura, apontamento, distribuição, pátio, precificação.
- Aceite: uma OS real aberta e tocada de ponta a ponta no ERP, igual ao Firebird.

**2b. Solicitação de peças + Boqueta (picking) + baixa de estoque**
- Solicita peça → consolida em **picking** → boqueta separa e **valida (baixa o estoque ali)**.
- Aceite: peça solicitada, separada e baixada; **saldo de estoque continua batendo** com o Firebird.

**2c. Remessa / Retorno**
- Remessa de peça/equipamento e o retorno correspondente, com controle de pendência.
- Aceite: um ciclo remessa→retorno fechado corretamente.

**Rollback de toda a Fase 2:** volta a operar aquele fluxo no Firebird; o ERP fica só em conferência.

---

## Fase 3 — Financeiro (interno, sem banco ainda)

**Objetivo:** o dinheiro da operação aparece certo.
- **Títulos** (contas a receber/pagar) gerados pela venda/OS com **vencimento certo** (condição de pagamento).
- **Caixa da loja** (frente de balcão) fechando.
- **Boleto bancário (CNAB) NÃO entra agora** — só o título/parcela com vencimento. Registro no banco é fase posterior.

**Aceite:** títulos e caixa de um período batem com o Firebird.
**Rollback:** financeiro segue no Firebird.

---

## Fase 4 — Fiscal / Emissão (o ÚLTIMO passo, homologado)

Só depois das fases 1–3 estáveis e conferidas. **Aqui é o único ponto com o fisco — não apressar.**

**Pré-requisitos fiscais (Truckprest, Simples):**
- Certificado digital **A1** da Truckprest.
- **Inscrição municipal** (Umuarama) + CNPJ regular na prefeitura.
- Credenciamento **SEFAZ-PR** (p/ NF-e de remessa/retorno de peças, modelo 55).
- **Provedor de transmissão** contratado (confirmar que cobre **NFS-e de Umuarama**).
- Contador validou a tributação (Simples: CSOSN, DAS; monofásico/ST das peças).

**NFS-e só existe em Umuarama:** só as empresas de Umuarama emitem serviço; fora de Umuarama não há NFS-e. Então NFS-e = **um único município**. (NF-e de mercadoria continua multi-empresa PR/SC → provedor se justifica por ela de qualquer forma.)

**Provedor recomendado (NÃO integrar direto):** Umuarama roda **Ginfes V3.00** (cancelamento só administrativo, não via webservice) e está **migrando pro padrão NACIONAL** (por etapas, sem prazo). Integração direta seria **jogada fora** na virada. Um **provedor (Focus / NFE.io / Tecnospeed)** emite no Ginfes hoje e **troca sozinho pro Nacional** quando virar — sem retrabalho. **Focus** tem guia dedicado de Umuarama = candidato líder.

**Sobre "esperar o modelo nacional" (instinto do Leo): faz sentido E não bloqueia.** Fiscal é a ÚLTIMA fase; até chegar aqui, o Nacional pode já estar no ar. E o provedor **cavalga a transição** — você não escolhe "esperar" vs "provedor": o provedor É o que deixa a espera indolor. Emite no que Umuarama aceitar hoje e migra pro Nacional quando ele ficar bom.

**Ordem:**
1. **NFS-e (serviço/instalação — Umuarama), via provedor:** homologar, conferir ISS com o contador. Deixar o provedor lidar com Ginfes-hoje / Nacional-amanhã.
2. **NF-e (remessa/retorno/peças, modelo 55):** homologar na SEFAZ-PR, conferir impostos.
3. Só então **emitir "pra valer"**.

**Aceite:** nota homologada, impostos conferidos pelo contador, XML guardado (5 anos, no ERP).
**Rollback:** emitir pelo sistema atual enquanto reajusta.

---

## Checklist "virar a chave" (por módulo, antes de cada corte)

- [ ] Dados migrados e **conferidos** (bate com o Firebird)
- [ ] Usuários e permissões configurados
- [ ] Key user **treinado** nesse módulo
- [ ] **Backup** rodando e já testado
- [ ] Impressões conferidas (OS, recibo, etiquetas)
- [ ] (Se envolve nota) NF-e/NFS-e **homologada** + impostos conferidos
- [ ] Plano de volta pro Firebird nesse módulo
- [ ] Alguém de **plantão** nos primeiros dias

---

## Decisões pendentes do Leo

1. **Infra do piloto:** servidor interno (recomendado) ou Supabase atual?
2. **Data de corte** aproximada da Fase 2a (OS) — o primeiro "a partir de tal dia, OS da Truckprest no ERP".
3. **Key user** da Truckprest (quem).
4. **Provedor de emissão** (só na Fase 4) — Focus / NFe.io / Tecnospeed (confirmar NFS-e Umuarama).

> Este roteiro é vivo — revisar a cada fase concluída.
