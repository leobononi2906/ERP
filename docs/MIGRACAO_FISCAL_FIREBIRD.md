# Migração Fiscal — Firebird → ERP novo (mapa + brief de execução)

> **Data:** 2026-08-13 · Autor: sessão *Cérebro de implantação* (análise, não construção).
> **Para:** sessão de construção do ERP executar.
> **Fonte:** consulta ao **banco Firebird vivo** (`SGA_BONONI - Copia.FDB`, 38.961 produtos×empresa) cruzada com o schema real do Supabase `"Teste ERP"` e o `docs/FISCAL_TRIBUTARIO.md`.

---

## 0. Veredito

O motor fiscal do ERP novo **já existe e foi testado** (`fn_calcular_impostos_item`, apuração, SPED, chave NF-e). O que falta é **100% dado**: as tabelas fiscais do Supabase estão **vazias**. E o dado existe, curado, no Firebird — ancorado em **NCM** em 97% dos produtos. Portanto: **migração + validação do contador**, não construção.

⚠️ **Correção ao `FISCAL_TRIBUTARIO.md`:** ele aponta `TBL_EXCESSAO_PIS_COFINS` como fonte do monofásico. **Essa tabela está VAZIA (0 linhas).** O monofásico real está **produto a produto** em `TBL_PRODUTO_DADOS.CHCST_PIS = 4` (CST 04). Não perca tempo na tabela de exceção.

---

## 1. Onde o dado fiscal mora no Firebird (números reais)

O fiscal está gravado **por produto × empresa** em `TBL_PRODUTO_DADOS` (chave da empresa = `CHDADOS`). Campos fiscais na linha do produto: `CHCLASSIF_FISCAL` (NCM), `ORIGEM_PROD`, `CHSITUACAO_TRIB` (CST ICMS), `CHCST_PIS`/`CHCST_COFINS` + `PORC_PIS`/`PORC_COFINS`, `ST_SAIDA`, `PORC_RED_ICMS`, `IPI_SAIDA`, `CHGRUPO_TRIB`.

| Dimensão | Firebird (vivo) | Observação |
|---|---|---|
| Linhas produto×empresa | **38.961** | universo fiscal completo |
| **Com NCM** (`CHCLASSIF_FISCAL>0`) | **37.944 (97%)** | âncora de tudo — ativo enorme |
| NCMs distintos em uso | **633** (de 817 na `TBL_CLASSIF_FISCAL`) | universo pequeno e tratável |
| **ICMS ST retido** — CST **060** + CSOSN **500** | **~35.500** (17.819 + 17.669) | **realidade dominante**: catálogo é ST substituído, marcado limpo |
| **Monofásico PIS/COFINS** — CST **04** | **705 produtos = 70 NCMs distintos** | **a "tabela de monofásicos"**: 70 NCMs pro contador validar |
| Importados (`ORIGEM_PROD` 1/2) | **~1.857** | puxam 4% interestadual |
| CST ICMS 100 (importada trib. integral) | 1.437 | |
| Tributado integral (CST 000) | 325 | |
| Redução base ICMS (`PORC_RED_ICMS>0`) | 54 | pequeno |
| IPI na saída (`IPI_SAIDA>0`) | 487 | provável ligado a importador |
| Grupos tributários usados | 9 (de 12 na `TBL_GRUPO_TRIB`) | |
| Matriz ICMS UF×UF (`TBL_ICMS_UF`, com FCP) | **729** | migra direto |
| Benefícios fiscais (`TBL_BENEF_FISC`) | **5** | trivial |

**Decodificação usada:** `TBL_CST_PIS_COFINS.CODIGO 4 = CST 04` (monofásica alíquota zero); `TBL_SITUACAO_TRIB.CODIGO 9 = CST 060` (ICMS cobrado anteriormente por ST — o substituído do balcão), `CODIGO 42 = CSOSN 500` (mesma coisa no Simples).

---

## 2. Comparativo Firebird × ERP novo (Supabase `"Teste ERP"`)

| Tabela/dado | Firebird | ERP novo hoje | Ação |
|---|---|---|---|
| Catálogo NCM | 817 (633 em uso) | `ncm` = **0** | **semear** a `ncm` com os 633 em uso (mín.) |
| Produtos fiscais | 38.961 (97% c/ NCM) | `produtos_fiscal_empresa` = **0**; `produtos` = 12 teste | **migrar** catálogo real |
| ICMS ST retido | ~35.500 marcados | cenário `ST_RETIDO` existe no motor, sem dado | mapear CST 060/500 → cenário |
| Monofásico | 705 / **70 NCMs** | `grupos_tributarios.monofasico_pis_cofins` existe, sem dado | curar 70 NCMs → grupo/flag |
| Matriz ICMS UF | 729 | `icms_uf` = **58** | completar/conferir a matriz |
| Benefícios fiscais | 5 | `cBenef` ainda não modelado no produto | migrar os 5 |
| Grupos tributários | 12 (9 em uso) | 8 (teste) | remapear grupos reais |
| Empresas | (CHDADOS) | `empresas` = 8 (teste) | alinhar mapeamento CHDADOS → id empresa novo |

---

## 3. Estratégia recomendada — extrair a verdade por NCM, NÃO copiar cru

**Não migre a `TBL_PRODUTO_DADOS` linha a linha.** Motivo: a maioria dos produtos (36.655) está num CST genérico de PIS/COFINS (**49 – outras operações**), que é *default*, não curadoria. Copiar cru = levar o ruído do default pro sistema novo.

**Caminho limpo (que o ERP novo já favorece — regra por grupo/NCM):**
1. **Destilar a verdade no nível do NCM**, gerando 3 listas curtas do Firebird:
   - **Monofásicos**: os **70 NCMs** com CST 04.
   - **ST retido**: os NCMs por trás dos CST 060/500 (por par de UF, se variar).
   - **Benefício/redução**: os 54 c/ redução + os 5 benefícios.
2. **Contador valida** essas listas curtas (é conferência, não montagem).
3. **Semear** as tabelas novas (`ncm`, `grupos_tributarios`, `produtos_fiscal_empresa`) a partir das listas validadas + NCM/origem/CST por produto (que são confiáveis).
4. Deixar o **motor** (`fn_calcular_impostos_item`) derivar o resto — ele já sabe ST retido, monofásico, DIFAL, MVA ajustada, importado→4%.

---

## 4. Plano de execução (para a sessão de construção)

> Backend aplicado direto no Supabase `"Teste ERP"` (padrão do projeto). Não versionar dado sensível em git. Conferir schema real antes de cada INSERT.

**Bloco A — Catálogo base**
- [ ] A1. Extrair do Firebird `TBL_CLASSIF_FISCAL` (817 NCMs; ou os 633 em uso) → semear `"Teste ERP".ncm` (código NCM + `aliq_ipi` quando houver).
- [ ] A2. Confirmar/estabelecer o **de-para `CHDADOS` (Firebird) → id `empresas` (novo)** para os 6 CNPJs que vão operar. **É pré-requisito de tudo por empresa.**

**Bloco B — Destilar listas fiscais por NCM (para o contador)**
- [ ] B1. `SELECT DISTINCT` dos 70 NCMs monofásicos (`TBL_PRODUTO_DADOS WHERE CHCST_PIS=4`) → planilha p/ contador.
- [ ] B2. NCMs em ST retido (CST 060 / CSOSN 500), por par de UF se divergir → planilha.
- [ ] B3. Redução de base (54) + benefícios (`TBL_BENEF_FISC`, 5) → planilha.

**Bloco C — Semear regras (após validação do contador)**
- [ ] C1. Mapear os **grupos tributários reais** (9 em uso) → `grupos_tributarios`, marcando `monofasico_pis_cofins` conforme B1.
- [ ] C2. Completar/conferir `icms_uf` (hoje 58) contra os 729 do Firebird — ao menos origens PR/SC × todos destinos, com FCP.
- [ ] C3. Migrar catálogo → `produtos_fiscal_empresa` (NCM, origem, CST ICMS, CST PIS/COFINS, ST, IPI) por empresa, usando o de-para A2.

**Bloco D — Validar o motor com dado real**
- [ ] D1. Rodar `fn_calcular_impostos_item` numa amostra: 1 monofásico, 1 ST retido, 1 importado, 1 tributado integral — conferir CST/CFOP/valores com o contador.
- [ ] D2. Rodar `erp_apuracao_fiscal` num mês real migrado e comparar com a apuração do Firebird (conferência lado a lado).

**Não fazer agora:** transmissão à SEFAZ / provedor (Focus/NFe.io/Tecnospeed) / certificado A1 — **é a última etapa**, só depois de C+D conferidos e homologação.

---

## 5. Itens que dependem de decisão/pessoa (não são código)

| Item | Dono |
|---|---|
| Validar os 70 NCMs monofásicos + lista ST + benefícios | **Contador** (interno + externo) |
| De-para CHDADOS → empresa (6 CNPJs) | Leo |
| Regime tributário de cada CNPJ (Real/Presumido/Simples) | Leo + contador |
| Provedor de transmissão + certificado A1 (última etapa) | Leo |

---

## 6. Consultas de referência (Firebird) usadas nesta análise

```sql
-- monofásicos (a "tabela"): NCMs distintos
SELECT COUNT(DISTINCT CHCLASSIF_FISCAL) FROM TBL_PRODUTO_DADOS WHERE CHCST_PIS=4;   -- 70
-- ST retido dominante
SELECT p.CHSITUACAO_TRIB, s.CST, COUNT(*) FROM TBL_PRODUTO_DADOS p
  LEFT JOIN TBL_SITUACAO_TRIB s ON s.CODIGO=p.CHSITUACAO_TRIB GROUP BY 1,2 ORDER BY 3 DESC;  -- 060=17819, 500=17669
-- cobertura NCM
SELECT COUNT(*) FROM TBL_PRODUTO_DADOS WHERE CHCLASSIF_FISCAL>0;                    -- 37.944 / 38.961
```
