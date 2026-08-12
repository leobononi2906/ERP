# RH / Departamento Pessoal — Pesquisa fiscal-legal para o módulo do ERP

> **Pesquisa feita 11/08/2026** (data-base ago/2026). Valores vigentes confirmados em fontes oficiais
> (Portaria Interministerial MPS/MF nº 13, de 09/01/2026; Receita Federal; FGTS Digital; eSocial S-1.3).
> Este documento é a **régua de escopo** do módulo de RH/DP — mesmo método usado no `FISCAL_TRIBUTARIO.md`:
> pesquisar tudo → cruzar com o que existe (banco atual + Firebird) → implementar configurável por empresa.

**Premissa arquitetural central:** o módulo tem que ser **parametrizável por empresa (CNPJ)**. Regime tributário
(Simples/Presumido/Real), CNAE (RAT/FAP e Terceiros), eventual desoneração e grupo do eSocial mudam alíquotas,
incidências e obrigações. **Nunca hardcodar** alíquota patronal nem tabela — tudo **versionado por competência** (Seção 6).

---

## 1. Cadastro e vínculo
Núcleo cadastral do trabalhador + natureza do vínculo (define categoria eSocial, incidências, obrigações).

**Base legal:** CLT (DL 5.452/43); Lei 10.097/2000 (aprendiz); Lei 11.788/2008 (estágio, sem vínculo);
Lei 6.019/74 (temporário/terceirização); Lei 8.212/91 art. 12 (contribuinte individual); CTPS Digital
(Portaria SEPRT 1.065/2019 — número = CPF); leiautes eSocial S-1.3 (evento **S-2200**).

| Vínculo | Categoria eSocial | INSS | FGTS | IRRF | Observação |
|---|---|---|---|---|---|
| CLT indeterminado | 101 | Sim | 8% | Sim | Padrão |
| CLT experiência (≤90d, art. 445) | 101 | Sim | 8% | Sim | Prazo determinado |
| Aprendiz | 103 | Sim | **2%** | Sim | FGTS reduzido (art. 15 §7º Lei 8.036) |
| Temporário (Lei 6.019) | 106 | Sim | 8% | Sim | Vínculo com a empresa de trabalho temporário |
| Estagiário (Lei 11.788) | 901 | Não | Não | Sim (acima da faixa) | Não é segurado obrigatório; evento **S-2300** (TSVE) |
| Autônomo/RPA (contrib. individual) | 701 | 11% retido + 20% patronal | Não | Sim | S-2300/S-2399; gera EFD-Reinf/eSocial |
| PJ (prestador) | — | Não (é NF) | Não | — | Fora da folha; risco de pejotização se houver subordinação |

**Dados obrigatórios:** CPF (chave no CTPS Digital/eSocial), PIS/NIS, nascimento, sexo, raça/cor, grau de instrução,
estado civil, nacionalidade; **CBO**; **lotação tributária** e **estabelecimento** (CNPJ/CAEPF); dependentes com
finalidade discriminada (IRRF → dedução R$ 189,59/mês com **CPF obrigatório**; e/ou salário-família ≤14 anos/inválido);
admissão, tipo de contrato, jornada, salário e unidade, sindicato; deficiência (cota Lei 8.213/91 art. 93 p/ 100+ empregados).

**Obrigação gerada:** eSocial **S-2200** (admissão, até o dia anterior ao início), **S-2205/S-2206** (alt. cadastral/contratual),
**S-2300/S-2399** (TSVE). CTPS anotada digitalmente pelo próprio eSocial.

---

## 2. Folha — motor de cálculo

### 2.1 Proventos
- **Salário-base** por unidade. Salário-mínimo 2026 = **R$ 1.621,00** (PR/SC têm pisos regionais por CNAE — parametrizar). Salário-hora = mensal ÷ 220.
- **HE 50%** (dias úteis) / **100%** (domingo/feriado) — art. 7º XVI CF. Reflete em DSR, férias, 13º.
- **Adicional noturno** +20%, 22h–5h, **hora reduzida 52min30s** (art. 73 CLT).
- **Insalubridade** 10/20/40% sobre o **mínimo** (art. 192; base pende no STF — deixar parametrizável). **Periculosidade** 30% sobre o **salário-base** (art. 193). Não acumulam.
- **DSR** sobre variáveis (Lei 605/49): (variáveis ÷ dias úteis) × domingos+feriados.
- **Salário-família:** cota **R$ 67,54** por filho ≤14/inválido, renda até **R$ 1.980,38**; pago pela empresa e **compensado na DCTFWeb**.
- **Salário-maternidade:** 120 dias; pago pela empresa e compensado; piso R$ 1.621,00, teto R$ 8.475,55.

### 2.2 Descontos
**INSS empregado — progressiva 2026** (Portaria MPS/MF 13/2026), cálculo **por faixa** (efetiva < nominal):

| Faixa | Alíquota |
|---|---|
| até R$ 1.621,00 | 7,5% |
| 1.621,01 – 2.902,84 | 9,0% |
| 2.902,85 – 4.354,27 | 12,0% |
| 4.354,28 – 8.475,55 (teto) | 14,0% |

Teto → contribuição máx. ≈ **R$ 988,09**. Base: Lei 8.212/91 art. 20 c/ EC 103/2019.

**IRRF — mensal 2026** (Lei 15.191/2025 + Lei 15.270/2025):

| Base mensal | Alíquota | Parcela a deduzir |
|---|---|---|
| até R$ 2.428,80 | isento | — |
| 2.428,81 – 2.826,65 | 7,5% | R$ 182,16 |
| 2.826,66 – 3.751,05 | 15% | R$ 394,16 |
| 3.751,06 – 4.664,68 | 22,5% | R$ 675,49 |
| acima de 4.664,68 | 27,5% | R$ 908,73 |

Base = bruto − INSS − (dependentes × **R$ 189,59**) − pensão − prev. privada; **OU** desconto simplificado até **R$ 607,20**
(calcular pelos dois e usar o melhor, mês a mês). **NOVIDADE 2026:** redutor (Lei 15.270/2025) que **zera o IR até R$ 5.000/mês**
e reduz decrescente até R$ 7.350 — aplicar **após** apurar o imposto pela tabela.

**FGTS:** 8% (2% aprendiz), depósito do empregador (não é desconto), via **FGTS Digital**.
**VT:** desconto até **6%** do salário-base (Lei 7.418/85). **Pensão:** conforme decisão, deduz base IRRF.
**Faltas injustificadas:** proporcional + perda do DSR (faltas legais art. 473 não descontam).

### 2.3 Encargos patronais — **parametrização por regime**

| Encargo | Real / Presumido | Simples Nacional |
|---|---|---|
| **CPP 20%** (art. 22 I Lei 8.212) | Recolhe 20% sobre a folha | Anexos I/II/III/V: **CPP no DAS**; **Anexo IV recolhe 20% por fora** |
| **RAT/SAT (1/2/3%) × FAP (0,5–2,0)** por CNAE | Recolhe | Anexos I–III/V dispensado; **Anexo IV recolhe** |
| **Terceiros/Sistema S** (~5,8%, por FPAS) | Recolhe | **Simples isento** (todos os anexos) |
| **FGTS 8%** | Recolhe | **Recolhe** (Simples não isenta) |
| **Desoneração (CPRB, Lei 12.546/2011)** | Só setores específicos; **reoneração 2025–2027** | Não aplicável |

Cadastro por CNPJ: regime, anexo Simples, CNAE preponderante, **RAT**, **FAP**, **FPAS/Terceiros**, flag desoneração →
alimenta apuração e eSocial S-1000/S-1005. **Obrigação:** S-1200/S-1210 → **DCTFWeb** (DARF numerado) + **FGTS Digital**.

---

## 3. Jornada / Férias / 13º / Rescisão

**Jornada/ponto** (arts. 58–74 CLT; **Portaria MTP 671/2021**): 8h/dia, 44h/sem; controle obrigatório 20+ empregados;
REP-C / REP-A / REP-P; se gerar ponto, produzir **AFD** e **AEJ**. Banco de horas: 6 meses (acordo individual) ou 1 ano (coletivo).

**Férias** (arts. 129–153; Lei 13.467/2017): 30 dias após 12 meses; até **3 períodos** (um ≥14, outros ≥5); + **1/3**;
abono pecuniário (vende até 10 dias, **sem INSS/IRRF**); INSS/FGTS sobre férias gozadas + 1/3; pagar até 2 dias antes.

**13º** (Leis 4.090/62, 4.749/65): **1ª parcela** 50% até **30/11**; **2ª** até **20/12** com INSS+IRRF **isolados**;
FGTS nas duas; eSocial S-1200 categoria 13º.

**Rescisão** (arts. 477–486; 484-A):

| Tipo | Aviso prévio | Multa FGTS | Saque FGTS | Seg-desemprego | 13º/férias prop. |
|---|---|---|---|---|---|
| Sem justa causa | Sim | **40%** | Integral | Sim | Sim |
| Pedido de demissão | Devido pelo empregado | Não | Não | Não | Sim |
| Acordo (484-A) | Metade | **20%** | **80%** | Não | Sim |
| Justa causa | Não | Não | Não | Não | Só férias vencidas + saldo |
| Término determinado/exp. | Não | Não | Integral | Não | Sim |
| Rescisão indireta | Como sem justa causa | 40% | Integral | Sim | Sim |

**Aviso proporcional** (Lei 12.506/2011): 30d + 3d/ano, máx **90d**. **TRCT**; pagamento **até 10 dias** (art. 477 §6º);
guias de FGTS rescisório pelo **FGTS Digital**. **Obrigação:** eSocial **S-2299** (até 10 dias) / **S-2399** (TSVE).

---

## 4. Obrigações acessórias digitais — o "SPED da folha"

### 4.1 eSocial (S-1.3, obrigatória p/ apurações ≥ jan/2025) — Decreto 8.373/2014
| Evento | O que é | Prazo |
|---|---|---|
| S-1000 | Empregador/tabelas (regime, FPAS, RAT/FAP) | Antes dos demais / na mudança |
| S-1005 | Estabelecimentos/CAEPF (RAT por estab.) | Antes de usar |
| S-1010 | Rubricas (incidências) | Antes de usar |
| S-1200 | Remuneração por competência | Dia **15** do mês seguinte |
| S-1210 | Pagamentos (substituiu parte da DIRF) | Dia **15** |
| S-2200 | Admissão | Dia anterior ao início |
| S-2205/S-2206 | Alt. cadastral/contratual | Dia 15 |
| S-2230 | Afastamento (férias, licença, auxílio) | Conforme tipo |
| S-2299 | Desligamento | Até 10 dias |
| S-2300/2306/2399 | TSVE (estagiário, autônomo) | Dia 15 |
| S-2210 | CAT | **1º dia útil** (imediato se óbito) |
| S-2220 | Monitoramento saúde (ASO) | Dia 15 |
| S-2240 | Condições ambientais (base do PPP) | Dia 15 / na mudança |

### 4.2 DCTFWeb (IN RFB 2.005/2021)
Confessa débitos previdenciários + Terceiros a partir do eSocial+Reinf; **substituiu a GFIP**; gera **DARF numerado**;
prazo dia **15**; inclui **DCTFWeb 13º** (anual); **módulo MIT** para tributos fora do eSocial/Reinf.

### 4.3 EFD-Reinf (IN 2.043/2021; série R-4000 pela IN 2.181/2024)
**R-2010** (retenção 11%/3,5% sobre serviços tomados) e **série R-4000** (R-4010/4020/4040/4080 — IRRF/CSLL/PIS/COFINS,
**substituíram a DIRF**). Prazo dia **15**. Relevante ao tomar serviços de terceiros e para RPA/autônomos.

### 4.4 FGTS Digital (Portaria MTE 3.905/2023)
Em vigor desde 03/2024, **obrigatório p/ fatos ≥ 01/01/2025**; **substituiu SEFIP/GRF/GRRF**; guia **DAE/GFD** (QR/PIX);
**vencimento mudou do dia 7 para o dia 20**. SEFIP só para débitos < 03/2024 e ações trabalhistas (650/660).

### 4.5 Extintos (não implementar como saída do sistema)
| Antigo | Situação | Substituto |
|---|---|---|
| GFIP/SEFIP | Extinta | DCTFWeb (confissão) + FGTS Digital (guia) |
| GRF/GRRF | Extintas | FGTS Digital (DAE/GFD) |
| CAGED | Extinto | eSocial (admissão/deslig.) |
| RAIS | Extinta | eSocial (ano-base) |
| DIRF | Extinta (fatos ≥ 01/01/2025) | eSocial S-1210 + EFD-Reinf R-4000 (+ S-2501) |

---

## 5. Benefícios / SST / Compliance
- **VT** (Lei 7.418/85): até 6%, sem INSS/FGTS/IRRF.
- **VR/VA** (PAT, Lei 6.321/76 + Lei 14.442/2022): dentro do PAT não integra salário — flag "dentro do PAT" na rubrica.
- **Plano de saúde:** coparticipação descontável, dedutível IRRF (titular + dependentes c/ CPF); eSocial detalha (S-1200 info-saúde).
- **PLR** (Lei 10.101/2000): não integra salário, sem INSS/FGTS; **IRRF exclusivo** por tabela anual própria; acordo prévio; máx. 2x/ano.
- **SST:** **PGR** (NR-01) + **PCMSO** (NR-07) (substituíram PPRA); **ASO** → S-2220; **CAT** → S-2210 (1º dia útil);
  **PPP eletrônico** desde 01/2023 (gerado do S-2240); insalub./peric. dependem de **LTCAT/laudo**.
- **LGPD** (Lei 13.709/2018): dados de funcionário são pessoais (alguns sensíveis — saúde, biometria de ponto, raça);
  controle de acesso por perfil, log, minimização, retenção/descarte.

**Guarda de documentos:** FGTS 30 anos (guarda recomendada); folha/contrib. 5 anos; eSocial/trabalhista 5 anos após término;
PPP/LTCAT/SST **20 anos**; ponto (AFD/AEJ) 5 anos.

---

## 6. Parametrização / vigência — o que o ERP precisa versionar
**Regra de ouro:** toda tabela abaixo é **por competência** (vigência início/fim). O cálculo de qualquer mês busca a
tabela vigente **naquela** competência (nunca a "atual") → permite reprocessar folhas/rescisões retroativas.

**Versionar:** (1) salário-mínimo nacional + pisos PR/SC; (2) tabela INSS (faixas+teto); (3) tabela IRRF
(faixas+parcela+dedução dependente+limite simplificado+**redutor Lei 15.270/2025**); (4) salário-família (cota+limite);
(5) teto INSS; (6) **FAP** (anual por CNPJ) e **RAT** (CNAE); (7) tabela PLR; (8) índices de dissídio por sindicato PR/SC.

**Por empresa (CNPJ):** regime, anexo Simples, CNAE, FPAS, código Terceiros, RAT, FAP, flag desoneração, lotações.

**Rubricas com incidências configuráveis** (coração do módulo): cada rubrica com flags independentes —
Incide **INSS**? **FGTS**? **IRRF**? reflexo em **DSR/férias/13º**? **natureza eSocial** (tabela 3, obrigatória em S-1010);
tipo (provento/desconto/informativo), incidência sindical, sobre aviso prévio. Ex.: HE 50% → INSS/FGTS/IRRF sim, DSR sim;
VT → tudo não. Esse motor de incidências garante o eSocial correto.

---

## 7. Resumo: obrigação × prazo × substituiu × regime
| Obrigação | Prazo | Substituiu | Regime |
|---|---|---|---|
| eSocial (S-1200/1210…) | Dia 15 | GFIP/CAGED/RAIS/DIRF (parcial) | Todos |
| DCTFWeb | Dia 15 | GFIP (confissão) | Todos (Simples IV recolhe CPP; demais no DAS) |
| EFD-Reinf (R-2010, R-4000) | Dia 15 | DIRF + parte GFIP | Todos que retêm/tomam serviço |
| FGTS Digital (DAE/GFD) | Recolhe dia **20** | SEFIP/GRF/GRRF | Todos (Simples não isenta FGTS) |
| DARF numerado (DCTFWeb) | Dia 20 (INSS) | GPS | Real/Presumido; Simples IV |
| DAS (Simples) | Dia 20 | — (engloba CPP anexos I–III/V) | Só Simples |

---

## 8. Alíquotas/valores vigentes (2026 confirmado)
| Item | Valor 2026 | Fonte |
|---|---|---|
| Salário-mínimo | **R$ 1.621,00** | Portaria MPS/MF 13/2026 |
| Teto INSS | **R$ 8.475,55** | idem |
| INSS empregado | 7,5 / 9 / 12 / 14% (progressiva) | idem |
| INSS máx. empregado | ≈ **R$ 988,09** | cálculo |
| Salário-família | **R$ 67,54** (renda ≤ R$ 1.980,38) | idem |
| IRRF dedução/dependente | **R$ 189,59/mês** | RFB 2026 |
| IRRF desconto simplificado | **R$ 607,20/mês** | RFB 2026 |
| IRRF redutor novo | Zera até R$ 5.000; parcial até 7.350 | Lei 15.270/2025 |
| FGTS | **8%** (aprendiz 2%) | Lei 8.036/90 |
| INSS patronal (CPP) | **20%** (por regime) | Lei 8.212/91 |
| RAT/SAT | 1/2/3% × FAP (0,5–2,0) | por CNAE |
| VT desconto | até **6%** | Lei 7.418/85 |

---

## 9. Mudou / em transição — NÃO implementar obsoleto
1. **Não** implementar GFIP/SEFIP, GRF, GRRF, CAGED, RAIS, DIRF — todas extintas/substituídas. Nascer com eSocial + DCTFWeb + EFD-Reinf + FGTS Digital.
2. **FGTS:** vencimento dia **20**; guia **DAE/GFD** do FGTS Digital (obrigatório desde 01/01/2025). Não gerar GRF.
3. **DIRF:** só até ano-base 2024. Fatos ≥ 01/01/2025 → eSocial S-1210 + EFD-Reinf R-4000 (+ S-2501).
4. **IRRF 2026:** Lei 15.270/2025 criou o **redutor** (zera até R$ 5.000/mês) — aplicar após a tabela. Não usar tabelas antigas.
5. **Desoneração (CPRB):** reoneração gradual 2025–2027 (Lei 14.973/2024); parametrizar % híbrido por ano-competência se algum CNPJ se enquadrar (varejo de acessórios provavelmente não — confirmar CNAE a CNAE).
6. **eSocial S-1.3** é a vigente; não usar S-1.0/S-1.1.
7. **Insalubridade:** base (mínimo vs. salário-base) pende no STF — deixar parametrizável.
8. **DCTFWeb módulo MIT** é o caminho p/ tributos federais fora do eSocial/Reinf (a partir de 2025).

> **Fonte-verdade para implementar:** baixar e versionar internamente os leiautes oficiais do **eSocial S-1.3**,
> o **Manual do FGTS Digital (v1.31, 08/2025)** e as INs de **DCTFWeb/EFD-Reinf** — o layout muda por nota técnica.

---

## 10. Status de implementação (11/08/2026)

### 10.1 De-para Firebird (feito) — o legado NÃO tem folha
Vasculhado o SGA_BONONI: **não existe folha, rubrica, INSS/IRRF/FGTS de folha, férias, rescisão, dependente, ponto nem eSocial**.
As colunas INSS/IRRF do legado são **retenção fiscal sobre nota de serviço**, não folha. O que há é cadastro de funcionário
p/ oficina/comissão: `TBL_CATFUNC` (147, pessoa mora em TBL_CLIENTE), `TBL_CARGO` (8, na prática = setor), `TBL_DEPARTAMENTO`
(56, hierárquico), `TBL_APONTAMENTO_FUNC` (14.689, horas em OS p/ custo, não ponto). **Conclusão: o módulo de folha é greenfield**;
do legado só migra o cadastro básico (deduplicar por CPF — pessoa pode ser cliente+funcionário; `SALARIO`/`TURNO`/`DATA_DEMISSAO`
majoritariamente nulos → recoletar). No Supabase, `fin_rh_*` (custo p/ DRE) e `public.rh_funcionarios` (stub, 105) são de outros
módulos — **não tocar**.

### 10.2 Backend — motor de folha (aplicado, testado)
- **Tabelas versionadas por competência**: `rh_inss_faixa` (4 faixas 2026), `rh_irrf_faixa` (5), `rh_parametro` (10 chaves:
  mínimo, teto, dedução dependente, simplificado, salário-família cota/limite, redutor zera/teto, FGTS). Seed vigência 2026-01-01.
- **Motor** (`Teste ERP`, wrappers em public): `fn_folha_inss` (progressivo c/ teto) · `fn_folha_irrf` (escolhe método
  completo×simplificado + aplica **redutor Lei 15.270/2025**) · `fn_folha_fgts` · `fn_folha_calcular` / `erp_folha_calcular`
  (orquestra proventos/descontos/líquido + salário-família) · `fn_rh_param` (parâmetro vigente).
- **Rubricas com incidências** `rh_rubrica` (17 semeadas: salário, HE 50/100, ad. noturno, insalub/peric, DSR, comissão,
  salário-família, 13º, INSS, IRRF, VT, adiantamento, pensão, faltas, FGTS) com flags incide_inss/irrf/fgts + reflexo DSR/férias/13º.
  RPC `erp_rh_rubricas`.
- **Testado** (salários 1.621 / 3.000 / 5.000 / 8.000 / 15.000): INSS progressivo com teto ✓; **redutor 2026 zera IR até R$ 5.000**
  ✓; teto INSS R$ 988,09 em 15.000 ✓.

### 10.3 Front — `SimuladorFolha.jsx` (menu **RH / Pessoal → Folha (Simulador)**)
Calculadora que prova o motor: entrada (salário, dependentes, filhos salário-família, pensão, outros, aprendiz) →
demonstrativo (base, INSS, IRRF com detalhe do redutor, FGTS, líquido) + tabela de rubricas com incidências.

### 10.4 Caveats / a validar com contador
- **Redutor IRRF 2026** na faixa R$ 5.000–7.350 está por **interpolação linear** (aproximação) — confirmar o coeficiente exato da Lei 15.270/2025.
- Alíquotas/tabelas 2026 conferidas em fontes oficiais, mas **validar com a contabilidade** antes de uso real.

### 10.5 Cadastro de colaborador (DP) — FEITO 11/08
- **Tabelas** `rh_colaborador` (vínculo, **categoria eSocial derivada por vínculo**, CBO, admissão/demissão, salário/unidade, jornada, id_empresa/cargo/departamento) e `rh_dependente` (finalidade: IRRF / salário-família / plano de saúde).
- **RPCs**: `erp_rh_dominios` (empresas/cargos/departamentos/vínculos), `erp_colaboradores_listar`, `erp_colaborador_obter` (+dependentes), `erp_colaborador_salvar`, `erp_dependente_salvar`, `erp_dependente_remover`; helper `fn_rh_categoria_esocial`.
- **Front** `Colaboradores.jsx` (menu **RH / Pessoal → Colaboradores**): lista com filtro empresa/busca + modal de cadastro com dependentes inline.
- **Testado**: João (CLT→cat 101, 1 dependente) e Maria (Aprendiz→cat **103** automático, FGTS 2%). Dados fictícios em homologação (limpar no go-live).

### 10.6 Próximos passos
1. **Encargos patronais por regime** (CPP 20% / RAT×FAP / Terceiros; Simples anexo IV) — precisa CNAE/FPAS/RAT/FAP por CNPJ.
2. **Férias / 13º / rescisão** (verbas por tipo de desligamento) — usar `tipo_desligamento` já no cadastro.
3. **Rodar a folha do colaborador cadastrado** (hoje o simulador é avulso; ligar `erp_folha_calcular` ao `rh_colaborador` + dependentes → holerite/competência).
4. **Geração eSocial / DCTFWeb / EFD-Reinf / FGTS Digital** (camada de arquivo).
5. **Migração** dos ~147 funcionários do Firebird (deduplicar por CPF; salário/demissão nulos → recoletar).
