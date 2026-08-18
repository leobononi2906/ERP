# SPEC — Faturar OS gerando NF em 2 empresas (peças × serviços)

> Pedido do Leo (17/08): no faturamento da OS, poder gerar **NF de peças numa empresa** e **NF de serviços em outra**, separando produto de serviço. **NÃO construir ainda — depende das decisões abaixo.**

## Por que faz sentido
- **Peça (produto)** sai por **NF-e** (modelo 55, ICMS) da empresa que comercializa peças.
- **Serviço (mão de obra)** sai por **NFS-e** (municipal, ISS) da empresa prestadora de serviço.
- São **naturezas fiscais diferentes** e muitas vezes **CNPJs/empresas diferentes** no grupo (ex.: uma empresa "comércio de peças", outra "serviços/oficina"). Já existe o split MLB/Truckprest na OS.

## Como o ERP está hoje
- `os_faturar(p jsonb)` fatura a OS inteira numa empresa só: gera título(s) + baixa estoque das peças + marca FATURADA. Não separa peça×serviço em NFs/empresas distintas.
- OS tem `os_pecas` (produtos) e `os_servicos` (mão de obra) separados — a base para o rateio **já existe**.
- Caixa/financeiro **por empresa** já existe (inclusive a trava de baixa por empresa que fizemos).

## Desenho proposto (a validar com o Leo)
1. **Definir as 2 empresas do rateio.** Onde amarra?
   - (a) **por OS** (campos `id_empresa_pecas` / `id_empresa_servicos` na OS), ou
   - (b) **config do grupo** (empresa padrão de peças e de serviços), ou
   - (c) **por tipo de operação**. → **decisão do Leo.**
2. **Faturar em 2 documentos:**
   - **Bloco PEÇAS** → fatura na empresa de peças: título(s) da empresa A + baixa de estoque na empresa A + **NF-e** (produto). Valor = soma `os_pecas` (consumo=false).
   - **Bloco SERVIÇOS** → fatura na empresa de serviços: título(s) da empresa B + **NFS-e** (serviço). Valor = soma `os_servicos`.
3. **Financeiro:** 2 títulos (um por empresa) — cada empresa recebe o que emitiu. Condição/forma pode ser a mesma; os títulos caem em contas da **respectiva empresa** (regra multi-empresa que já vale).
4. **NF:** emissão via API externa (Focus/NFe.io) — NF-e para peças, NFS-e para serviços. O ERP só registra as referências (2 NFs).
5. **Estoque:** baixa das peças na empresa de peças (a NF-e é dela).
6. **Comissão:** ratear por bloco (peça×serviço) mantendo o que já existe.

## Impacto técnico (quando construir)
- Nova RPC `erp_os_faturar_split(p_id_os, p_id_empresa_pecas, p_id_empresa_servicos, forma/condição, _ator)` que roda os 2 faturamentos numa transação e devolve os 2 títulos/NFs. Reusar o motor de `os_faturar` por bloco (parametrizar empresa + filtro peça/serviço).
- Front: no faturar da OS (ou na fila de Faturamento), opção "Faturar separado (peças/serviços)" com as 2 empresas.
- Encaixa na **fila de Faturamento** que acabamos de criar: o item da OS liberada pode faturar em modo split.

## Decisões pendentes do Leo
1. Onde amarra a empresa de peças e a de serviços (por OS / config / tipo)?
2. Sempre split, ou é opcional (algumas OS faturam numa empresa só)?
3. 2 títulos separados (um por empresa) — confirma?

**Status: SPEC. Aguardando as 3 decisões acima antes de construir.**
