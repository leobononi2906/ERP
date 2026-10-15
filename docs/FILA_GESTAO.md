# Fila de gestão — ERP Bononi

> Mantida pela sessão de gestão (skill `gestao-erp`). Atualizada: **15/10/2026**.
> Cada item: **dono · parado desde · próximo passo**. Item pronto sai daqui e vai pro `STATUS.md`.

## 🚨 O alarme
- **Ninguém usa o ERP desde 19/08/2026** — último registro em `log_acessos` é 19/08 22:07; zero
  acessos e zero erros nos últimos 30 dias. **~57 dias sem teste.**
- **Construção quase parou:** desde 19/08 foram 5 commits (classificação financeira 25/08, aviso
  de testes 01/09, docs 15/09, F5 28/09). Antes disso eram 30 commits por dia.
- **Piloto Truckprest sem data de corte** (`IMPLANTACAO_TRUCKPREST.md` §decisões, item 2).

## 🔴 Esperando o Leo (decisões)
| # | Decisão | Desde | Minha recomendação |
|---|---|---|---|
| L1 | **Data de corte do piloto Truckprest** (OS da Truckprest no ERP a partir de X) | 16/08 | Marcar data e voltar a testar; sem data, o projeto não anda |
| L2 | Voltar a **usar/testar** o ERP (alguém da Truckprest abrindo OS de teste) | 19/08 | 1 pessoa, 30 min/dia, em paralelo ao Firebird |
| L3 | Contador validar as **4 planilhas fiscais** (trava carimbar 38k produtos) | 16/08 | Cobrar o contador com prazo |
| L4 | **Battogo (id 7)**: extinguir no cadastro ou apagar | 16/08 | Marcar inativa (não apagar) |
| L5 | **"Formato"** no veículo — o que é | 17/08 | Se ninguém lembrar, tirar da tela |
| L6 | Regra de **comissão de serviço**: % de cada colaborador (hoje) ou % fixo por serviço | 05/08 | Manter o de hoje |
| L7 | **Baixa de estoque** ao lançar na OS/venda ou ao faturar (hoje) | 05/08 | Manter no faturamento |
| L8 | **Provedor de consulta de placa** (Edge Function está com placeholder) | 18/08 | Escolher pelo custo; não trava nada |
| L9 | **Fotos do quadro físico** da oficina (Distribuição como painel/TV) | 18/08 | Mandar foto quando der |
| L10 | Editor de etiqueta (layout) ou só quantidade/formato | 18/08 | Só qtd/formato agora |

## 🛠️ Construção (eu faço — não depende de ninguém)
| # | Item | Desde | Próximo passo |
|---|---|---|---|
| C1 | **BUG: NF de entrada não gera contas a pagar** | 19/08 | Reproduzir em `erp_gerar_titulos_pagar` e corrigir |
| C2 | **Ocultar custo e fiscal** de quem não tem permissão (nem ver) | 19/08 | Permissão `ver_custo`/`ver_fiscal` + esconder nas telas e RPCs |
| C3 | Cliente novo pela Venda/OS com **endereço + fiscal obrigatórios** | 19/08 | Validar no salvar (front + RPC) |
| C4 | Tela de **edição de apontamentos** na OS (backend pronto) | 18/08 | Drawer só p/ `perms.aprovar` |
| C5 | **Produção com vários itens** e finalização item a item | 19/08 | Spec curta + tabela de itens |
| C6 | **Plano de performance** (sair do `Range: 0-9999`, agregação no banco) | 19/08 | Medir telas lentas primeiro |
| C7 | Cabeçalho forte/página única também na **OS e Orçamento** | 28/09 | Copiar padrão da Venda |
| C8 | Auditoria de **itens** (lançar item, baixa de título, pedido de compra) | 28/09 | Depois de C1–C3 |
| C9 | Aplicar grupo de acesso **em massa** | 28/09 | Baixa prioridade |

## 🔒 Antes de operar de verdade (gate do go-live)
- **Furo #2 de segurança**: RPCs confiam no `_ator` enviado pelo front (`SEGURANCA_FURO2_JWT.md`).
  Não pode ir pra operação real sem isso.
- Emissão de **NFS-e** pela Truckprest via provedor (Focus recomendado) — contratar.

## ✅ Conferido no banco/código em 15/10 (já existe — não cobrar)
Liberar faturamento + fila, localização múltipla (tela em Produtos), orçamento perdido.
