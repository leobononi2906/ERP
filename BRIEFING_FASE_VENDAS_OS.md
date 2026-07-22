# BRIEFING — FASE VENDAS / OS / ORÇAMENTOS
> ERP Bononi — 21/07/2026
> Escopo fechado com o Leo. Executar na ordem dos blocos (1 → 6).
> Relatórios de comissão NÃO entram nesta fase — apenas gravar os dados corretamente.

## Regras gerais (valem para todos os blocos)
- Schema: `"Teste ERP"` (projeto Supabase `vishxwdxqiygbxmtpfoy`)
- Antes de codar: conferir schema real das tabelas via MCP — nunca confiar de memória
- Todo SQL novo (CREATE/ALTER/função): mostrar ao Leo antes de executar
- Seguir CLAUDE.md do repo + design system existente (ui.jsx)
- Toda listagem: `.range(0, 9999)` mínimo (paginação real fica na fase de produção)
- Toda tela respeita permissões do login (visualizar/incluir/editar/excluir/aprovar)
- Multi-empresa: filtrar por empresa

---

## BLOCO 1 — Ligar o que já existe

### 1.1 Orçamento → boqueta
- Hoje: `orcamento_converter_venda` baixa estoque direto.
- Mudar: conversão cria a venda e os itens PRODUTO viram solicitação na Separação
  (mesmo fluxo de `venda_solicitar_item`). Vendedor aprova e imprime na boqueta.
- Itens SERVIÇO: continuam direto na venda. **Serviço de venda/orçamento nunca vira OS.**

### 1.2 Áreas de Serviço na OS
- Novo cadastro: **Áreas de Serviço** (ex.: Auto Elétrica, Radiador, Tacógrafo, Mecânica...).
  Campos: código, nome, situação. CRUD simples na seção Cadastros.
- Ao lançar serviço na OS, o vendedor escolhe a ÁREA de forma bem intuitiva
  (cards/botões grandes, igual ao seletor de tipo de OS) + descrição em texto livre.
- O serviço nasce PENDENTE já vinculado à área.
- Tela Distribuição OS: agrupar/filtrar os serviços pendentes por área, para o
  gestor distribuir dentro do setor correto. O quadro de distribuição é do GESTOR
  (todos podem ver, só gestor distribui). Distribuição automática fica para depois.

### 1.3 Política de desconto nas telas
- RPCs `erp_politica_desconto_*` já existem. Falta o frontend validar.
- Na Venda e no Orçamento: ao aplicar desconto no item, validar contra a política
  (hierarquia: produto > subgrupo > grupo; por grupo de acesso do usuário e tabela de preço).
- Se exceder o máximo: bloquear e exibir o limite permitido. Aprovação de gestor
  na hora pode ficar para iteração seguinte se complicar.

---

## BLOCO 2 — Tabelas de preço com exceções

Hierarquia de resolução do preço (o mais específico ganha):
1. Preço específico **cliente + produto**
2. Tabela de preço vinculada ao **cliente**
3. Tabela **geral** (padrão da empresa)

- Criar estrutura de exceções (ex.: tabela `precos_excecoes`: id_cliente, id_produto,
  preco, vigência, situação) — conferir se algo parecido já existe antes de criar.
- Vendas e Orçamentos passam a resolver o preço por essa hierarquia ao lançar item.
- Tela de manutenção das exceções (pode ser aba dentro do cliente e/ou do produto).

---

## BLOCO 3 — Crédito configurável

Nova tela de **Configuração de Crédito** (Sistema/Administração), com regras configuráveis:
- Limite de crédito por cliente (campo no cadastro do cliente, se ainda não houver)
- Bloquear venda a prazo com título vencido há mais de X dias (X configurável)
- Quais modalidades consomem limite (padrão: boleto, crediário, cheque pré.
  À Vista e Cartão NÃO consomem)
- Permitir ou não liberação por gestor (exceção na hora, com senha/permissão "aprovar")

Aplicação:
- Na Venda e na OS, ao escolher pagamento a prazo: validar saldo de limite
  (limite − títulos em aberto a prazo) e situação de inadimplência.
- Se bloqueado: mensagem clara com o motivo; se a config permitir, gestor libera na hora.

---

## BLOCO 4 — Itens de consumo (OS)

- Colaborador (serviço ou produção) solicita via boqueta um item marcado como **CONSUMO**.
- Comportamento: baixa estoque, **soma no custo da OS**, mas:
  - NÃO aparece na NF de venda
  - NÃO compõe o valor cobrado do cliente
- Vale para a OS toda (serviços e itens de produção).
- Na tela da OS: seção separada "Itens de Consumo" visível no detalhe (custo interno).
- Flag na solicitação da Separação para diferenciar consumo de peça normal.

---

## BLOCO 5 — Encomenda (compra pontual para cliente)

Fluxo:
1. Vendedor abre **solicitação de cotação** a partir da Venda/OS (item ainda não estocado)
2. Compras recebe, cota com fornecedor e devolve preço/prazo ao vendedor
3. Vendedor aprova → o item entra na Venda/OS com status AGUARDANDO ENCOMENDA
   e vira **pedido de compra** automaticamente
4. Mercadoria chega → entrada grava o **custo real** no item e libera o faturamento
5. Item chegado fica **reservado automaticamente** para aquela venda
6. Se o cliente desistir após a compra feita: item vai para o estoque normal
   (libera reserva), venda/OS registra o cancelamento do item

Observação: este bloco antecipa parte do módulo Compras (pedido de compra + entrada).
Construir o mínimo necessário: fornecedor (cadastro básico se não existir),
pedido de compra da encomenda e entrada com atualização de custo/estoque.
A tela cheia de Compras (cotações gerais, mapa comparativo, demanda) fica para a fase Compras.

---

## BLOCO 6 — OP: produto produzido dentro da OS

**OP não é módulo separado.** É um item de PRODUTO dentro da OS que é produzido na oficina.

Fluxo:
1. Vendedor lança na OS um produto marcado como **produzido** (flag no cadastro do produto)
2. O item entra na **distribuição** igual serviço: cai na área correta, gestor atribui
3. Colaboradores fazem **apontamento de horas** no item (play/stop, mesmo mecanismo dos serviços)
4. Componentes: colaborador solicita **livremente pela boqueta** durante a produção
   → viram itens de consumo da OS (Bloco 4). NÃO há baixa automática por composição.
5. Ao concluir: produto acabado faz **entrada no estoque** e **saída imediata** para a OS

Custo do produto acabado na entrada — **CONFIGURÁVEL** (config geral do sistema):
- Opção A (padrão): custo da **composição** do produto
- Opção B: custo **real** (consumo da boqueta + horas apontadas)
- Guardar os dois valores no item para comparativo (enxergar desperdício), independente da opção.

Comissionamento (só GRAVAR nesta fase, relatório depois):
- Cada colaborador que apontou horas no item produzido recebe comissão **rateada
  pelas horas trabalhadas** sobre o valor do item
- Colaboradores de serviço: comissão pelo valor do serviço avaliado, rateada por horas
- Garantir que fique gravado: quem apontou, horas de cada um, valor avaliado/valor do item

### Composição (cadastro do produto)
- Aba **Composição** no cadastro de Produtos: lista de peças + serviços que formam
  o **custo de referência** do produto
- SEM vínculo com baixa de estoque — é só cálculo de custo
- Recalcular o custo de referência quando a composição mudar

---

## Ordem de execução e critério de pronto
1 → 2 → 3 → 4 → 5 → 6. Cada bloco testado com dados reais antes do próximo.
Ao concluir cada bloco: commit descritivo + atualizar snapshot erp_dd.mm.aaaa.md no repo.
