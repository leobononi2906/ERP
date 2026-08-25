# SPEC — Classificação financeira: Plano de Contas + Centro de Custo

> Decidido com o Leo em 19/08/2026. Este documento trava o **modelo** (o "como o sistema decide"). A lista de contas em si (o plano contábil) entra depois.
> Objetivo: todo lançamento financeiro nasce **classificado** — sabe **o quê** (plano de contas) e **de onde/qual negócio** (centro de custo) — de forma **automática** e **à prova de erro**.

## Duas dimensões, dois papéis (não confundir)

| | **Plano de contas** | **Centro de custo** |
|---|---|---|
| Responde | **O QUÊ** (natureza contábil: receita de venda, CMV, despesa com cortesia…) | **ONDE / qual negócio** (o canal) |
| Obrigatório? | **SIM — trava**: não lança entrada/saída sem ele | **NÃO** — pode ficar vazio |
| Vazio significa | (não pode ficar vazio) | **Administrativo** (overhead / sem canal) |
| Quem decide | Natureza da operação → Produto → Subgrupo → Grupo | **Departamento do vendedor** do documento |

**Por que separado:** o *mesmo produto* é vendido na loja, no online e na distribuição. O **canal não é atributo do produto** — vem de quem vendeu (departamento do vendedor). Já a *natureza contábil* é do produto/operação. Por isso as duas dimensões têm regras de resolução diferentes.

---

## 1. Plano de contas — cascata + trava

### Cascata de resolução (o primeiro preenchido vence)
```
1. Natureza da operação   (naturezas_operacao)   ← "manda em tudo"
2. Produto                (produtos)
3. Subgrupo               (do produto)
4. Grupo                  (do produto)
```
- **A natureza da operação sobrepõe sempre.** Exemplo que trava a regra: uma **operação de cortesia** cai em "Despesa com cortesias/brindes" **independente do produto** — cortesia é cortesia. Só quando a natureza **não** define um plano é que se olha o produto, depois subgrupo, depois grupo.

### Trava (não lança sem plano de contas)
- Vale nos **4 momentos** que tocam o financeiro/DRE:
  1. Faturar venda/OS
  2. Título manual (Contas a Receber / Pagar)
  3. Movimento de caixa / banco
  4. Entrada de estoque / compra
- **Garantia pra não travar o balcão:** o **Grupo** (último degrau) passa a **exigir plano de contas no cadastro**. Se todo grupo tem plano, nenhum produto fica órfão → a cascata **sempre resolve** e a trava vira **rede de segurança** (quase nunca dispara).
- Quando disparar, o erro é **amigável e aponta o culpado**: *"Produto X (grupo Y) sem plano de contas — defina no cadastro do grupo."* Nunca um erro seco pro operador.

### O que falta no banco (a aplicar)
Adicionar `id_plano_conta` em:
- `naturezas_operacao`  (prioridade 1)
- `produtos`            (prioridade 2)
- tabela de subgrupo    (prioridade 3)
- tabela de grupo       (prioridade 4) — **NOT NULL / obrigatório no cadastro**

Função única de resolução, ex. `erp_resolver_plano_conta(id_natureza, id_produto)` → devolve o `id_plano_conta` pela cascata, ou erro se vazio. Chamada por todos os pontos de lançamento.

---

## 2. Centro de custo — por departamento do vendedor

### Os centros (globais — independem de empresa)
Apenas **3 centros reais**; "Administrativo" **não é registro**, é o significado do **vazio**:
| Centro | O que cai aqui |
|---|---|
| **Loja física** | Vendas/custos originados no balcão |
| **Online** | E-commerce + marketplaces |
| **Distribuição** | Atacado / distribuidores |
| *(vazio)* → **Administrativo** | Overhead e tudo que não tem canal/vendedor |

### Resolução
```
Centro de custo = centro do DEPARTAMENTO do vendedor do documento
                  (usuarios.id_departamento → departamentos.id_centro_custo)
   se não houver vendedor/departamento  →  vazio = Administrativo
```
- A fiação **já existe**: `departamentos.id_centro_custo` e `usuarios.id_departamento` (+ `usuarios.id_centro_custo` como override direto, se um vendedor específico precisar).
- Hoje daria pra inferir por natureza de operação, mas **o driver definitivo é o departamento do vendedor** — mais fiel (o vendedor é quem carrega o canal).

### O que falta (a aplicar)
- Criar/ajustar os 3 departamentos (Loja física, Online, Distribuição) e apontar cada um pro seu `id_centro_custo`.
- Garantir que todo **vendedor** tenha `id_departamento`.
- No DRE/relatórios, agrupar `centro de custo = NULL` sob o rótulo **"Administrativo"**.

---

## Resumo de uma linha
> **Plano de contas** é obrigatório e vem de **Natureza → Produto → Subgrupo → Grupo** (natureza manda). **Centro de custo** é opcional, vem do **departamento do vendedor**, e **vazio = Administrativo**.

## 3. O DRE consome as duas dimensões (e é editável)

O DRE do ERP reaproveita o modelo **editável** do `bononi-dashboard`:
- **Linhas** = `dre_config_grupos` (ordem, ativo, linhas calculadas por fórmula).
- **Vínculos** = `dre_config_vinculos` — no ERP apontam pro **plano de contas** (a natureza classificada pela cascata).
- **Centro de custo** vira o **corte por canal** (coluna/filtro: Loja física / Online / Distribuição / Administrativo).
- **Dois regimes**: competência × caixa (já existentes no dashboard).

Assim, o que a cascata classifica alimenta o DRE, e o contador **monta o formato do DRE sem código**. Ver `RASCUNHO_PLANO_CONTAS.md`.

## ✅ APLICADO (19/08/2026) — fundação no ar e testada
- **Campos da cascata:** `id_plano_conta` adicionado em `produtos`, `grupos_produto`, `subgrupos_produto` (o topo, `tipos_saida`/`tipos_entrada`, já tinha). `tipos_saida` também já tem `id_centro_custo`.
- **Contas novas** no plano (41 no total): `1.3 Deduções de Vendas` (1.3.1 Devoluções, 1.3.2 Impostos s/ Vendas) e `2.6 Perdas, Garantias e Cortesias` (2.6.1 Cortesias/Brindes/Amostras, 2.6.2 Garantias, 2.6.3 Bonificações, 2.6.4 Perdas/Descarte/Uso Interno).
- **Seed:** todo `grupos_produto` → 1.1.1 (floor garantido, 0 grupos sem plano). `tipos_saida` classificados (Venda→1.1.1; Devolução→1.3.1; Bonificação→2.6.3; Amostra→2.6.1; Garantia→2.6.2; Uso Interno/Consumo→2.6.4). Departamentos → centro (Comercial→LOJA, Oficina→OFICINA, resto→ADMIN).
- **Funções:** `public.erp_resolver_plano_conta(id_tipo_saida, id_produto, p_exigir)` e `public.erp_resolver_centro_custo(id_vendedor, id_tipo_saida)`.
- **Auto-classificação:** trigger `BEFORE INSERT` em `titulos` (`trg_titulo_classificar`) — preenche `id_plano_conta` (CR, com fallback por origem) e `id_centro_custo` (null = Administrativo) quando vierem vazios. **Pega TODOS os caminhos de faturamento** (venda_faturar, os_faturar, fn_gerar_titulos_receber…) sem editar essas funções.
- **Backfill:** títulos existentes classificados — 61/61 CR com plano (100%).
- **Testado:** cascata (venda→1.1.1, garantia→2.6.2, amostra→2.6.1, só-produto→grupo→1.1.1), centro (ecommerce→Online, vazio→Administrativo), e insert real via trigger.

### ⚠️ Gap operacional (cadastro, não código)
- **Nenhum usuário tem `id_departamento` preenchido** → o "centro pelo departamento do vendedor" só resolve depois de marcar os vendedores (ou usar os tipos de saída por canal 17/18/19, que já carregam o centro). Por isso hoje a maioria dos títulos fica centro = Administrativo.

### ✅ DRE por centro (19/08) — FEITO
- `erp_dre(p)` aceita `id_centro_custo` (filtro) e retorna `por_centro` (resultado por centro; vazio cai em ADMIN). Receita/CMV usam centro efetivo (header ou resolvido); despesas por `titulos.id_centro_custo`. Testado: soma por centro bate com o resultado geral.
- Front: DRE (Relatorios.jsx) ganhou filtro "Centro de custo" + quadro "Resultado por centro de custo".

### 🔜 Falta (próximo)
- **DRE editável** (portar `dre_config_grupos`/`vinculos` do dashboard, vínculos apontando pro plano de contas).
- Classificar **contas a pagar (CP)** por `tipos_entrada`/fornecedor (hoje CP segue manual).
- **Marcar departamento/canal dos vendedores** (senão o corte fica tudo em Administrativo).

## Pendências pra fechar antes de codar
1. **A lista do plano de contas** (as contas em si). Hoje há 33 linhas no sistema — decidir se a gente parte delas, ou se o Leo/contador fornece a estrutura definitiva.
2. Confirmar os nomes/códigos dos 3 departamentos e o de-para com os centros de custo.
3. Definir se algum vendedor precisa de `id_centro_custo` próprio (override) fora do departamento.
