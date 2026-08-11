# ERP Bononi — Fiscal / Tributário: régua completa + de-para (ERP × Firebird)

> **Data-base:** 11/08/2026 · Ramo: comércio de acessórios automotivos (varejo + atacado), multi-empresa **PR/SC**, revenda + possível importação + serviço de instalação (ISS). Emissão de documentos via **API terceirizada** (Focus NF-e / NFe.io).
>
> Este documento tem 7 partes: **(1–4)** a "régua" — tudo que a camada fiscal de um ERP deve ter, pesquisado com fontes oficiais; **(5)** o cruzamento **o que o ERP já tem × o que falta**; **(6)** o **de-para do Firebird**; **(7)** o **checklist de implementação priorizado**.

---

## 0. Veredito executivo

**A boa notícia:** o ERP novo já nasceu com um **esqueleto de dados fiscal forte** — inclusive com campos da **Reforma Tributária** já rascunhados (`cst_ibscbs`, `cclasstrib`, `aliq_ibs_uf/mun`, `aliq_cbs`, `cst_is`, `aliq_is` em `grupos_tributarios`, `produtos_fiscal_empresa` e `nfe_itens`). Tem `grupos_tributarios`, `produtos_fiscal_empresa`, `ncm`, `icms_uf` (matriz UF×UF com FCP), `naturezas_operacao`, e as tabelas de documento (`nfe`, `nfce`, `nfse`, `nfe_entrada`, `nfe_itens`, `nfe_inutilizacoes`) + RPCs `erp_gerar_nfe`, `erp_nfe_payload`, `erp_registrar_retorno_nfe`.

**O que falta (resumo):**
1. **Motor de cálculo real** — não há engine que *derive* a tributação por item cruzando produto × operação × UF×UF × tipo de cliente × regime. Hoje a tributação é fixa por grupo.
2. **Curadoria/regras específicas de autopeças** — **PIS/COFINS monofásico** (revenda a alíquota zero — sem isso, bitributa), **ST por par de UF** com MVA ajustada, **DIFAL base dupla**, **FCP nos documentos**, **ST retido** (`vBCSTRet`/`vICMSSTRet` — o caso mais comum do balcão).
3. **Apuração e obrigações acessórias** — zero: nenhuma tabela de apuração de ICMS/PIS/COFINS, livros, inventário, EFD ICMS/IPI, EFD-Contribuições, EFD-Reinf, DeSTDA.
4. **Versionamento por vigência** das alíquotas/regras (essencial para a transição da Reforma 2026→2033).
5. **ISS** — `nfse` existe, mas falta tabela de código de serviço (LC 116) × município × alíquota.

O Firebird legado **tem quase tudo isso** modelado (inclusive `TBL_EXCESSAO_PIS_COFINS` para o monofásico e campos de DIFAL na NF) → a migração serve de mapa. Ver seção 6.

---

## 1. Tributos atuais

> Data-base agosto/2026. Alíquotas mudam por lei estadual/convênio — o ERP deve tratá-las como **parâmetros versionados por vigência**, nunca constantes no código.

### 1.1 ICMS — alíquotas internas (PR e SC)

| UF | Alíquota modal interna | Base legal | Vigência | Observações |
|----|----|----|----|----|
| **PR** | **19,5%** | Art. 17, V, RICMS/PR (Dec. 7.871/2017), Lei 21.850/2023 | Desde 18/03/2024 | Padrão. Específicas maiores (25%/28%) p/ supérfluos. |
| **SC** | **17%** (modal) | Art. 19, I, Lei 10.297/1996 | Vigente | Modal-padrão. |
| **SC** | **12% reduzida** entre contribuintes | Lei 17.878/2019 | Desde 01/03/2020 | Só p/ mercadoria destinada a **comercialização/industrialização**. NÃO se aplica a uso/consumo/ativo do adquirente (volta a 17%), nem a itens a 25%. |

⚠️ A redução a 12% em SC depende da **destinação** pelo comprador — o ERP precisa capturar finalidade (revenda vs consumo/ativo).

### 1.2 ICMS — alíquotas interestaduais (Res. Senado)

| Origem → Destino | Alíquota | Base legal | Quando |
|----|----|----|----|
| Sul/Sudeste (exc. ES) → N, NE, CO, ES | **7%** | Res. SF 22/1989 | Nacional saindo de PR/SC p/ essas regiões |
| Demais (ex.: PR→SC, SC→SP) | **12%** | Res. SF 22/1989 | Regra geral entre contribuintes |
| Qualquer → qualquer, **importado / CI > 40%** | **4%** | Res. SF 13/2012 | Desde 2013; exige **FCI** |

> **Autopeças:** muito item importado/alto CI → **4% é comum no atacado**. Decidir por `origem` (0–8): origens **1,2,3,6,7,8** → 4%; **0,4,5** → 7%/12% conforme destino.

### 1.3 Base de cálculo

- Base padrão (LC 87/1996): valor da operação, ICMS "por dentro". Compõem: frete (do remetente), seguro, despesas.
- **IPI na base do ICMS:** NÃO integra entre contribuintes p/ revenda/industrialização; **integra** quando venda a consumidor final/não contribuinte. → decidir por operação.
- **Redução de base:** benefício por NCM/CEST/UF (Convênio CONFAZ + RICMS). Parametrizar % de redução → base reduzida + carga efetiva. Sem benefício genérico p/ "acessório"; verificar item a item.

### 1.4 ICMS-ST (Substituição Tributária)

Fabricante/importador (substituto) recolhe antecipado toda a cadeia; atacado/varejo (substituído) **revende sem destaque** (o imposto "já foi retido").

- **Norma geral:** Convênio ICMS 142/2018. Autopeças = **segmento 01 do CEST** + Convênio 102/2017 + protocolos bilaterais.
- **Sujeição = 2 critérios combinados:** (1) NCM+CEST na lista de ST daquele segmento **E** (2) acordo entre UF origem×destino (ou RICMS interno). → **tabela de decisão `(NCM, CEST, UF_orig, UF_dest) → ST sim/não`** (mesmo item pode ter ST em SC e não em PR→SC).
- **Base ST (ordem):** PMPF > preço sugerido > **MVA**: `Base_ST = (produto+frete+seguro+IPI+despesas) × (1+MVA)`.
- **MVA ajustada** (interestadual): `MVA_aj = [(1+MVA_orig)×(1−ALQ_inter)/(1−ALQ_interna_dest)]−1`. **Exceção: remetente do Simples usa MVA original** (Conv. 142/2018, 52/2017).
- **ICMS-ST a recolher:** `Base_ST × ALQ_interna_dest − ICMS_próprio`.
- **Substituído (o balcão):** compra com ST vira **custo**; revende **sem destaque**, **CST 60** (normal) / **CSOSN 500** (Simples), informando `vICMSSTRet`/`vBCSTRet`. Ressarcimento/complemento (STF Tema 201) — guardar `vBCSTRet`/`vICMSSTRet` por item.

### 1.5 DIFAL

Dois DIFAL distintos:
- **(A) Uso/consumo** — compra interestadual por contribuinte p/ uso/consumo/ativo: recolhe diferença (interna dest − interestadual).
- **(B) EC 87/2015** — venda a **consumidor final não contribuinte** em outra UF (e-commerce/venda direta). LC 190/2022. **100% p/ UF destino** (partilha encerrou em 2019). Cobrança válida desde 2022 (STF ADIs 7066/7070/7078 — pacificado).
- **Base dupla** (regra desde LC 190/2022): `Base = (Valor − ICMS_inter)/(1 − ALQ_interna_dest)`; `DIFAL = Base × ALQ_interna_dest − ICMS_inter`.
- **FCP-DIFAL:** adicional da UF destino, recolhido à parte. **PR destino = +2%** (se listado); **SC = sem FCP**.

### 1.6 FCP (Fundo de Combate à Pobreza)

| UF | FCP | Observação |
|----|----|----|
| **PR** | **2%** sobre lista de NCMs (Lei 18.573/2015) | Maioria dos acessórios **não** tem FCP — conferir NCM. |
| **SC** | **Não possui** | Operações internas SC e DIFAL destino SC sem adicional. |

Tabela `NCM × UF → FCP` (0% default). Guardar `vFCP`, `vFCPST`, `vFCPUFDest`.

### 1.7 IPI

- **Comerciante puro (revenda) NÃO é contribuinte** — IPI entra como **custo**.
- **Importador é equiparado a industrial** (RIPI art. 9º): ao revender importado, **destaca IPI na saída** (STF Tema 906) e credita o IPI da importação.
- Alíquota por NCM (**TIPI**). Parametrizar `NCM → IPI` + flag "empresa contribuinte de IPI (importador) sim/não".

### 1.8 PIS/COFINS

| Regime | PIS | COFINS | Crédito |
|----|----|----|----|
| Cumulativo (Presumido) | 0,65% | 3,0% | Sem |
| Não cumulativo (Real) | 1,65% | 7,6% | Com |
| Simples | no DAS | no DAS | — |

**MONOFÁSICO — crítico p/ autopeças (Lei 10.485/2002):** fabricante/importador recolhe concentrado (PIS 2,3% + COFINS 10,8%); **atacado/varejo revendem a ALÍQUOTA ZERO** (art. 3º §2º). No ERP:
- Presumido/Real: aplicar **CST 04/06** na revenda (não 01) → evita pagar indevido.
- Simples: **segregar a receita monofásica** (LC 123 art. 18 §4º-A) → **reduz o DAS**. A falta disso é erro comum e caro.

⚠️ Nem todo acessório é monofásico — depende do NCM constar nos anexos da Lei 10.485. **Flag `monofasico` por produto** + curadoria da tabela de NCM.

### 1.9 ISS (instalação/oficina)

- LC 116/2003 + lei municipal. Itens: **14.01** (conserto/manutenção de veículos — exceto peças, que são ICMS) e **14.06** (instalação/montagem com material do usuário).
- **Partição serviço × mercadoria:** no 14.01, mão de obra é ISS, peças são ICMS → **separar na nota** (dois documentos: NF-e + NFS-e).
- Alíquota **2% a 5%** por município. Parametrizar `código serviço × município`.

### 1.10 Diferenças por regime (CST × CSOSN)

| Situação | CST (Presumido/Real) | CSOSN (Simples) |
|----|----|----|
| Tributado integral | 00 | 101 (c/ créd) / 102 (s/ créd) |
| Redução de base | 20 | 900 |
| Trib + ST (substituto) | 10 / 70 | 201 / 202 |
| ST retido anterior (substituído) | **60** | **500** |
| Isento/não trib | 40/41/50 | 300/400 |
| Diferimento | 51 | — |
| PIS/COFINS revenda tributada | 01 | 49 |
| PIS/COFINS monofásico revenda (zero) | **04**/06 | 04/06 (segregar no DAS) |
| IPI saída não tributada | 53/99 | — |

**Fontes 1:** LC 87/1996, Lei 10.485/2002, LC 116/2003, LC 123/2006, LC 190/2022, Conv. ICMS 142/2018, Res. SF 13/2012 e 22/1989, Lei 21.850/2023 (PR), Lei 17.878/2019 (SC), STF Tema 906/Tema 201/ADIs 7066-7070-7078.

---

## 2. Cadastros fiscais e motor de regras de tributação

Princípio central: **nenhum tributo é digitado na nota** — é *derivado* do cruzamento produto × operação × UF × cliente × regime.

### 2.1 Atributos fiscais do produto

`ncm` (8), `cest` (7, obrigatório se ST — autopeças = seg. 01), `origem` (0–8), `unidade_comercial`/`unidade_tributavel` (+ fator de conversão), `gtin`/`gtin_trib`, `ex_tipi`, `cbenef` (benefício por UF), flag `sujeito_st` por UF-destino, flag `monofasico_pis_cofins`.

### 2.2 Origem da mercadoria (`orig`, 0–8) — Ajuste SINIEF 20/2012

| 0 Nacional (exc. 3,4,5,8) | 1 Estrangeira import. direta | 2 Estrangeira merc. interno | 3 Nacional CI 40–70% | 4 Nacional PPB |
|---|---|---|---|---|
| **5 Nacional CI ≤40%** | **6 Estrang. direta s/ similar** | **7 Estrang. interno s/ similar** | **8 Nacional CI >70%** | |

Importada (1,2,3,8) → **4% interestadual** (Res. SF 13/2012).

### 2.3 Matriz CFOP (autopeças) — 1=ent.MesmoUF, 2=ent.inter, 3=ent.exterior, 5=saí.MesmoUF, 6=saí.inter, 7=saí.exterior

| Operação | Saída interna | Saída inter | Entrada interna | Entrada inter |
|---|---|---|---|---|
| Venda revenda | 5.102 | 6.102 | 1.102 | 2.102 |
| Venda c/ ST (substituto) | 5.401 | 6.401 | — | — |
| Venda c/ ST já retida | 5.405 | 6.404 | — | — |
| Venda consumidor final | 5.102 (NFC-e) | 6.108 | — | — |
| Compra revenda c/ ST | — | — | 1.403 | 2.403 |
| Importação (entrada) | — | — | — | 3.102 revenda / 3.101 indus. |
| Devolução de venda | — | — | 1.202/1.201 | 2.202/2.201 |
| Devolução venda c/ ST | — | — | 1.411 | 2.411 |
| Devolução de compra | 5.202/5.201 | 6.202/6.201 | — | — |
| Transferência entre filiais | 5.152/5.409(ST) | 6.152/6.409 | 1.152 | 2.152 |
| Bonificação/brinde | 5.910 | 6.910 | 1.910 | 2.910 |
| Remessa industrialização | 5.901 | 6.901 | 1.901 | 2.901 |
| Remessa/retorno conserto | 5.915/5.916 | 6.915/6.916 | 1.915/1.916 | 2.915/2.916 |
| Garantia/troca | 5.949 | 6.949 | 1.949 | 2.949 |

> **Transferência filiais PR↔SC:** pós **STF ADC 49 + Conv. 178/2023** não é fato gerador de ICMS próprio, mas há **transferência obrigatória de crédito**. Tratar filial-destino como "mesmo titular", não como venda.
> **Instalação:** peça = ICMS (NF-e), mão de obra = ISS (NFS-e) → dois documentos.

### 2.4 Motor de regras — chave de determinação

```
REGRA = f(
  produto.ncm, produto.origem, produto.cest, produto.monofasico,
  operacao.natureza, empresa.uf, empresa.regime/crt,
  cliente.uf, cliente.indIEDest, cliente.indFinal, data_emissao (vigência)
) → { CFOP, CST/CSOSN, %ICMS, %red, %MVA_ST, CST/%IPI, CST/%PIS, CST/%COFINS, cBenef }
```
Resolução em cascata: **NCM+CEST+UF-destino** → **Grupo de tributação + cenário** → **default por UF×UF×tipo cliente**.

### 2.5 Modelagem sugerida do motor

- `fiscal_grupo_tributario` — classe fiscal do produto (`monofasico`, `sujeito_st_default`).
- `fiscal_produto_grupo` — liga produto ao grupo.
- `fiscal_operacao` — natureza (venda revenda, consumidor final, devolução, transferência, bonificação, remessa…).
- `fiscal_cenario` — a regra: `id_empresa/regime, id_grupo, id_operacao, uf_origem, uf_destino, tipo_cliente → cfop, cst/csosn, aliq_icms, red_base, mva_st, aliq_st, cst_ipi/aliq, cst_pis/aliq, cst_cofins/aliq, cbenef, vigencia_inicio/fim, prioridade`.
- `fiscal_st_mva` — `ncm, cest, uf_destino, mva_original, mva_ajustada, aliquota_interna_destino, vigencia_*`.
- `fiscal_aliquota_interestadual` — matriz UF×UF (7/12/4%).

### 2.6 Composição da base (ordem obrigatória)

1. Valor produtos = Σ(qtd×unit). 2. −descontos incondicionais, +frete/seguro/despesas. 3. **IPI** sobre essa base. 4. **Base ICMS**: +frete/seguro/despesas −desconto; IPI entra só se consumidor final; ICMS "por dentro"; aplicar redução. 5. **Base ST** = (BaseICMS+IPI+frete+seguro+despesas)×(1+MVA_aj); `ICMS_ST = BaseST×aliq_interna_dest − ICMS_próprio`. 6. **PIS/COFINS**: se monofásico → CST 04 zero. 7. **DIFAL** base dupla. 8. **FCP** quando NCM/UF tiver.

Guardar base e tributo **por item** (grão da linha), não só no total.

### 2.7 Versionamento por vigência (essencial p/ Reforma)

`vigencia_inicio`/`vigencia_fim` em todas as tabelas de regra; resolução por `data_emissao BETWEEN...`; alteração cria **nova linha** (preserva histórico p/ reprocessar SPED). Modelar **tributo como entidade genérica** (`fiscal_tributo`) facilita muito a convivência ICMS/ISS/PIS/COFINS **+** IBS/CBS/IS 2026→2033.

**Fontes 2:** Ajuste SINIEF 20/2012, Conv. 142/2018 e 52/2017, tabela CFOP (SINIEF), STF ADC 49 / Conv. 178/2023, EC 132/2023 + LC 214/2025.

---

## 3. Emissão de documentos e obrigações acessórias

### 3.1 Modelos

| Modelo | Uso | Autorizador |
|---|---|---|
| **55 (NF-e)** | Atacado, transferências, remessas, devoluções, PJ, fora do estado | SEFAZ PR/SC |
| **65 (NFC-e)** | Varejo/balcão a consumidor final presencial | SEFAZ |
| **NFS-e** (Padrão Nacional) | Serviço de instalação/mão de obra (ISS). Obrig. ME/EPP Simples desde 01/09/2026 | Emissor Nacional |
| **57 (CT-e)** | Frete — **emitido pela transportadora**; ERP só recebe/armazena | SEFAZ |

### 3.2 Ciclo de vida — eventos e prazos

| Evento | Código | Prazo | Regra |
|---|---|---|---|
| Cancelamento | 110111 | **24h** (Conv. SINIEF 07/2005; alguns até 168h c/ multa) | Só se **não houve circulação**. Depois → NF-e de devolução |
| Carta de Correção (CC-e) | 110110 | **720h (30 dias)** | Só dados secundários. **Não** altera valores/impostos, destinatário, data, NCM que mude tributação |
| Inutilização | — | Até 10º dia do mês seguinte | Quebra de sequência de numeração |
| Manifestação destinatário | 210200/10/20/40 | — | Útil no recebimento de compras |
| EPEC | 110140 | Contingência | Autoriza c/ dados mínimos |

**Denegação** (cStat 110/301/302): SEFAZ recusa por irregularidade cadastral; chave fica inutilizável — guardar XML; emitir nova após regularizar.

### 3.3 Contingência

**SVC-AN/SVC-RS** (autorizador nacional quando a SEFAZ cai), **EPEC**, **offline NFC-e** (`tpEmis=9`, transmite em 24h). Com API o roteamento é automático — o ERP deve tolerar status "em contingência/pendente" e reconciliar.

### 3.4 Numeração, ambiente, certificado

- Numeração **por empresa × modelo × série** (NF-e e NFC-e independentes). O **ERP é dono do contador** (atômico).
- `tpAmb` 2=homologação / 1=produção (numerações separadas).
- Certificado **A1** (.pfx no cofre da API — ideal headless) ou A3. Controlar validade (1 ano) e alertar.

### 3.5 Rejeições comuns

Duplicidade (204/539), XML/schema (225), chave inválida (236/502), IE do destinatário inapta, NCM/CEST inválido, CST/CSOSN incompatível com CRT, data de emissão (228), somatório ≠ total. Prevenir: contador atômico, validar XSD 4.00, validar IE, tabela NCM/CEST atualizada, amarrar CST ao CRT, recalcular totais.

### 3.6 ERP × API (divisão)

**ERP controla:** numeração/série, cadastro fiscal (NCM/CEST/CFOP/CST/origem), **cálculo de tributos**, regras de negócio, **guarda legal do XML autorizado (5 anos)**, disparo de eventos, reconciliação. **API entrega:** assinatura (cofre A1), montagem/validação do XML 4.00, transmissão SEFAZ/SVC, retorno de protocolo/cStat, webhooks. → **Regra de ouro: a guarda do XML é sua.**

### 3.7 Obrigações acessórias

| Obrigação | Regime | Periodicidade | 
|---|---|---|
| **EFD ICMS/IPI (SPED Fiscal)** | Normal (Presumido/Real) | Mensal (~15º dia) |
| **EFD-Contribuições (PIS/COFINS)** | Normal | Mensal (10º dia útil do 2º mês) |
| **ECD / ECF** | Real/Presumido | Anual (mai / jul) |
| **EFD-Reinf** | Todos c/ retenção (inc. Simples) | Mensal (dia 15) |
| **DeSTDA** (ST/DIFAL/antecipação) | **Simples** | Mensal (dia 28) |
| **GIA-ST** | Substituto de outra UF | Mensal | 
| SINTEGRA | — | **Extinto no PR** (Dec. 9647/2025); confirmar SC |

Se **Simples**: eixo é **PGDAS-D + DeSTDA**. Se **Normal**: **EFD ICMS/IPI + EFD-Contribuições**.

**Blocos EFD ICMS/IPI que o ERP alimenta:** 0 (cadastros), **C100/C170** (itens NF-e), **C190** (analítico CST/CFOP/alíq), **D100** (CT-e), **E110/E111** (apuração ICMS), **E200/E210** (ST), **H010** (inventário). Saídas pela data de emissão; totais E110 fecham com C190.

**Fontes 3:** Portal NF-e / MOC, NT 2025.002-RTC, Conv. SINIEF 07/2005, NFS-e Padrão Nacional (art. 62 LC 214/2025), Guia Prático EFD-ICMS/IPI v3.1.9 (CONFAZ), IN RFB 1.252/2012 e 2.003/2021, Dec. PR 9647/2025.

---

## 4. Reforma Tributária (IBS, CBS, IS)

### 4.1 Base legal e status

| Norma | O que é | Data | Status |
|---|---|---|---|
| **EC 132/2023** | Cria IVA Dual (IBS+CBS), IS, não cumulatividade plena, Comitê Gestor | 20/12/2023 | Vigente |
| **LC 214/2025** | Lei-mãe: fato gerador, base, créditos, regimes, cashback, split payment | 16/01/2025 | Vigente; efeitos 2026→2033 |
| **PLP 108/2024** | Comitê Gestor do IBS | Em tramitação | Acompanhar |
| **NT 2025.002-RTC** | Grupos/campos/CST/cClassTrib de IBS/CBS/IS no XML | 2025+ | Vigente p/ testes |

### 4.2 Os três tributos

| | **CBS** (federal, substitui PIS/COFINS) | **IBS** (estadual+municipal, substitui ICMS/ISS) | **IS** (federal, "imposto do pecado") |
|---|---|---|---|
| Administra | Receita Federal | Comitê Gestor do IBS | Receita Federal |
| Base | Valor da operação, "por fora" | Idem, base uniforme | 1º fornecimento/importação de bens nocivos |
| Não cumulat. | Plena (crédito financeiro amplo, condicionado ao recolhimento anterior) | Idem | **Não gera crédito** (monofásico) |
| Alíquota ref. (estimada) | ~8,8% | ~17,7% | Por lei ordinária |

**Alíquota de referência conjunta ~26,5%** (8,8%+17,7%) = **estimativa oficial, NÃO valor fixado**. Não travar o ERP com 26,5%.

**Impacto no ramo (autopeças):** acessórios avulsos **não sofrem IS** (o IS sobre veículos é só no fabricante de veículo completo, posições 8701-8711). Ganho grande: **fim da ST do ICMS e do crédito acumulado** — hoje um peso enorme em autopeças. Alíquota-padrão, crédito pleno.

### 4.3 Cronograma 2026→2033

| Ano | CBS | IBS | Antigos | ERP |
|---|---|---|---|---|
| **2026** | 0,9% teste | 0,1% teste | PIS/COFINS/ICMS/ISS/IPI cheios | Destacar CBS/IBS na NF-e (compensável); split **não** obrigatório |
| **2027** | **cheia** | 0,1% | **PIS/COFINS extintos**; IPI zerado (exc. ZFM) | IS começa; split facultativo B2B (Pix/boleto) |
| **2028** | cheia | 0,1% | ICMS/ISS cheios | Consolidação CBS |
| **2029** | cheia | sobe | ICMS/ISS a **90%** | Início transição real IBS |
| **2030** | cheia | — | ICMS/ISS a **80%** | |
| **2031** | cheia | — | ICMS/ISS a **70%** | |
| **2032** | cheia | — | ICMS/ISS a **60%** | Último ano de convivência |
| **2033** | cheia | **cheia** | **ICMS/ISS extintos** | Só CBS+IBS+IS |

### 4.4 Split payment

Tributo separado na **liquidação financeira** (Pix/boleto/cartão): o PSP/adquirente retém IBS/CBS e repassa ao Fisco, creditando ao fornecedor só o líquido (art. 31+ LC 214). **Não obrigatório em 2026**; facultativo B2B em 2027; cartão depois. **Impacto:** some o "capital de giro tributário" (tributo sai na hora) → exige **integração ERP × adquirente** e nova conciliação NF-e ↔ liquidação ↔ tributo.

### 4.5 Impacto no XML e paralelismo

- Novos **grupos IBS/CBS/IS no nível do item** + totais (NT 2025.002).
- **CST do IBS/CBS + `cClassTrib`** (par que vincula o item ao dispositivo da LC 214).
- **Paralelismo obrigatório 2026-2032:** emitir campos antigos **E** novos simultaneamente, com pesos que mudam por ano. Multi-empresa PR/SC agrava (ICMS residual por UF ao lado do IBS unificado).

### 4.6 O que parametrizar (tudo por vigência + empresa/UF)

1. Alíquotas CBS/IBS versionadas por data (0,9/0,1 em 2026; cheias depois). 2. CST-IBS/CBS + cClassTrib por produto/NCM. 3. **Motor dual** (calcula antigo+novo com fator de transição do ano). 4. Grupos IBS/CBS/IS no XML. 5. Crédito financeiro condicionado ao recolhimento. 6. Transição da ST/estoque com ST. 7. Integração split payment. 8. Regime por CNPJ. 9. Projeção de caixa (tributo na liquidação). 10. IBS no destino (partilha).

**Fontes 4:** EC 132/2023, LC 214/2025, PLP 108/2024, NT 2025.002-RTC, Portal NF-e/Fazenda, LC 214 art. 409 (IS veículos).

---

## 5. O que o ERP JÁ TEM × O QUE FALTA

Legenda: ✅ existe · 🟡 parcial · ❌ falta

### 5.1 Cadastros e regras

| Item da régua | Status | Onde / o que falta |
|---|---|---|
| NCM | ✅ | tabela `ncm` (com `aliq_ipi`) + `produtos_fiscal_empresa.ncm` |
| CEST | ✅ | `produtos_fiscal_empresa.cest` |
| Origem (0–8) | ✅ | `produtos_fiscal_empresa.origem` |
| CFOP padrão | 🟡 | `produtos_fiscal_empresa.cfop_padrao` e `naturezas_operacao.cfop` (texto). ❌ Sem tabela CFOP mestre nem lógica de **espelho p/ devolução/entrada** |
| CST/CSOSN | ✅ | `grupos_tributarios.cst_icms`, `produtos_fiscal_empresa.cst_csosn` |
| Grupo de tributação | ✅ | `grupos_tributarios` (ICMS/red/ST+MVA/PIS/COFINS/IPI) |
| Fiscal por empresa | ✅ | `produtos_fiscal_empresa` + RPC `erp_fiscal_empresa_salvar` |
| Natureza de operação | ✅ | `naturezas_operacao` (cfop, tipo, finalidade, gera_financeiro, mov_estoque) |
| Matriz interestadual UF×UF | ✅ | `icms_uf` (uf_origem, uf_destino, aliq_icms, **aliq_fcp**) |
| **Flag monofásico PIS/COFINS** | ❌ | **Crítico p/ autopeças.** Sem flag no produto/grupo → risco de bitributar / não segregar DAS |
| **ST por par de UF (sujeição)** | ❌ | `grupos_tributarios.mva_st` é único. Falta `NCM×CEST×UF_orig×UF_dest → ST + MVA` e **MVA ajustada** |
| **FCP por NCM×UF** | 🟡 | `icms_uf.aliq_fcp` existe por UF, mas não por NCM (FCP é por lista de NCM) |
| **Benefício fiscal (cBenef)** | ❌ | Sem `cbenef` por UF (redução de base/isenção regional) |
| **Cenário fiscal multidimensional** | ❌ | Tributação é **fixa por grupo**; não deriva por UF-destino/tipo cliente/regime automaticamente |
| **Versionamento por vigência** | ❌ | Tabelas sem `vigencia_inicio/fim` — problema p/ transição da Reforma |
| **Código de serviço ISS × município** | ❌ | Falta tabela LC 116 × município × alíquota |
| Campos Reforma (IBS/CBS/IS) | ✅ | `grupos_tributarios` + `produtos_fiscal_empresa` (`cst_ibscbs`, `cclasstrib`) + tabelas `cst_ibscbs`, `cst_is` |

### 5.2 Motor de cálculo

| Item | Status | Observação |
|---|---|---|
| Engine que deriva tributo por item | ❌ | Não há RPC de cálculo por contexto. `erp_gerar_nfe`/`erp_nfe_payload` provavelmente puxam valores do grupo direto |
| Base de cálculo em cascata (IPI/ICMS/ST/DIFAL/FCP) | ❌ | Sem ordem de composição, MVA ajustada, IPI-na-base condicional |
| DIFAL base dupla | ❌ | `nfe_itens` sem `vICMSUFDest/Remet`, `pICMSInterPart` |
| Monofásico (CST 04 automático) | ❌ | Depende do flag inexistente |

### 5.3 Documentos e emissão

| Item | Status | Observação |
|---|---|---|
| NF-e / NFC-e / NFS-e / NF-e entrada | ✅ | tabelas `nfe`, `nfce`, `nfse`, `nfe_entrada`, `nfe_itens` |
| Gerar payload p/ API | ✅ | `erp_gerar_nfe`, `erp_nfe_payload` |
| Registrar retorno (webhook) | ✅ | `erp_registrar_retorno_nfe` |
| Inutilização | ✅ | `nfe_inutilizacoes` |
| Cancelamento | 🟡 | `nfe` tem `xml_cancelamento`/`motivo_cancelamento`; falta fluxo de evento completo |
| **CC-e (Carta de Correção)** | ❌ | Sem entidade/fluxo |
| **Campos ST retido** (`vBCSTRet`/`vICMSSTRet`) | ❌ | **Essencial p/ revenda de autopeças com ST** — o caso mais comum do balcão |
| **Campos FCP/DIFAL no item** | ❌ | `nfe_itens` sem vFCP/vFCPST/vFCPUFDest/vICMSUFDest |
| Contingência (status pendente) | 🟡 | `nfe.status`/`status_sefaz` existem; validar tratamento |

### 5.4 Apuração e obrigações acessórias

| Item | Status |
|---|---|
| Apuração ICMS/ST (E110/E200) | ❌ |
| Livros de entrada/saída | 🟡 (dá p/ derivar de nfe/nfe_entrada, mas sem estrutura de apuração) |
| Inventário (H010) | ❌ |
| EFD ICMS/IPI, EFD-Contribuições | ❌ |
| EFD-Reinf, DeSTDA | ❌ |
| ECD/ECF | ❌ (normalmente sai do contábil, mas consome dados do ERP) |

---

## 6. De-para Firebird → ERP novo

O legado (`FIREBIRD_SCRIPT_COMPLETO.md`) tem um fiscal robusto e **já tocado pela Reforma**. Serve de mapa para preencher o delta.

| Firebird (legado) | ERP novo (`Teste ERP`) | Nota de migração |
|---|---|---|
| `TBL_ICMS_UF` | `icms_uf` | Matriz UF×UF — mapear direto (aliq ICMS + FCP) |
| `TBL_ALIQUOTA` | `grupos_tributarios.aliq_*` | Alíquotas base |
| `TBL_CST_IPI` / `TBL_CST_PIS_COFINS` | (usadas direto no grupo) | ERP não tem tabelas próprias; ok manter no grupo |
| `TBL_CST_IBSCBS` / `TBL_CST_IS` | `cst_ibscbs` / `cst_is` | ✅ paridade — migrar códigos |
| **`TBL_EXCESSAO_PIS_COFINS`** (`CHCST_PIS/COFINS`, `PORC_PIS/COFINS`) | ❌ (criar flag `monofasico` + exceção) | **Fonte do monofásico** — daqui sai a curadoria por NCM/produto |
| `TBL_BENEF_FISC_CST` / `TBL_BENEF_FISC_NCM` | ❌ (criar `cbenef`) | Benefício fiscal por CST/NCM → mapear p/ `cBenef` |
| Produto: `PERC_IPI`, `CHCST_PIS/COFINS`, `PORC_PIS/COFINS`, `MVAORIG`, `PORC_RED_ICMS`, `PORC_RED_ICMS_FORA` | `grupos_tributarios` / `produtos_fiscal_empresa` | `PORC_RED_ICMS_FORA` (dentro/fora do estado) → precisa do **cenário por UF** (falta) |
| Empresa: `INSCEST`, `ALIQUOTA_EMPRESA`, `ALIQ_ICMS_SIMPLES`, `PERMITE_CRED_IPI`, `EMITE_SPED_PIS_COFINS`, `PORC_BASE_PIS_COFINS`, `COD_TRIBUTACAO_MUNICIPIO` | `empresas` (parcial) | Faltam vários campos de config fiscal por empresa (créd. IPI, base PIS/COFINS, cód. trib. municipal p/ ISS) |
| Item NF: `BASE_ICMS`, `VALOR_ICMS`, `VALOR_IPI`, `BASE_ICMS_ST`, `VALOR_ICMS_ST`, `PIS`, `COFINS`, `IPI_NA_BASE`, `PORC_PART_ICMS_DEST`, `VALOR_ICMS_DEST`, `VALOR_ICMS_REMET` | `nfe_itens` (parcial) | **Legado JÁ TEM DIFAL** (`PORC_PART_ICMS_DEST`, `VALOR_ICMS_DEST/REMET`) e flag `IPI_NA_BASE` — o novo precisa desses campos |
| `TBL_MUNICIPIO` (IBGE) | (usar tabela de municípios) | Necessário p/ NFS-e e DIFAL |
| `TBL_ORIGEM_ITEM_NF2` / `TBL_ORIGEM_MOV` | — | Rastreabilidade de origem do movimento |

> **Leitura do de-para:** os 3 buracos mais críticos do ERP novo (**monofásico**, **DIFAL nos itens**, **benefício fiscal**) **já existem modelados no Firebird** → dá p/ migrar a lógica e os dados, não precisa inventar do zero.

---

## 7. Checklist de implementação priorizado

### Fase 1 — Fechar o cálculo correto de HOJE (antes de qualquer Reforma)
1. **Flag `monofasico` no produto + CST 04 automático** na revenda (evita bitributar PIS/COFINS e permite segregar DAS). Migrar de `TBL_EXCESSAO_PIS_COFINS`. **[maior risco fiscal do ramo]**
2. **Campos ST retido no item** (`vBCSTRet`, `vICMSSTRet`, CST 60 / CSOSN 500) — revenda de autopeças com ST é o caso mais comum do balcão.
3. **Tabela de sujeição à ST por par de UF** (`NCM×CEST×UF_orig×UF_dest → ST + MVA`) + **MVA ajustada** (com exceção Simples = MVA original).
4. **Motor de cálculo (RPC `erp_calcular_impostos_item`)** determinístico: recebe produto+operação+UFs+cliente+regime → devolve CFOP/CST/bases/valores. Cascata de cenário. Base em ordem (IPI→ICMS→ST→DIFAL→FCP).
5. **DIFAL base dupla + FCP** nos itens (`vICMSUFDest/Remet`, `vFCP*`) para venda a consumidor final de outra UF. Migrar de `PORC_PART_ICMS_DEST`/`VALOR_ICMS_DEST/REMET`.
6. **IPI-na-base condicional** (consumidor final vs revenda) — flag `IPI_NA_BASE` do legado.

### Fase 2 — Robustez e configuração
7. **Cenário fiscal multidimensional** (`fiscal_cenario` por UF×tipo cliente×regime) + **versionamento por vigência** em todas as tabelas de regra.
8. **Benefício fiscal `cBenef`** por UF (redução de base/isenção) — migrar de `TBL_BENEF_FISC_*`.
9. **Config fiscal por empresa** completa (créd. IPI, base PIS/COFINS, cód. trib. municipal, é substituto?, é importador?).
10. **Tela de gestão fiscal** no front (grupos tributários, cenários, fiscal por produto/empresa) — hoje há RPCs, falta UI.
11. **CFOP mestre + espelho** (devolução/entrada) e validação CST×CRT.
12. **CC-e** e fluxo de cancelamento completo (eventos).
13. **ISS**: tabela código de serviço LC 116 × município × alíquota; separação peça (ICMS) × serviço (ISS) na OS.

### Fase 3 — Apuração e obrigações acessórias
14. **Apuração mensal** ICMS/ST/IPI e PIS/COFINS (débitos/créditos/saldos) + **inventário valorizado**.
15. **Geração de arquivos**: EFD ICMS/IPI (C100/C170/C190/E110/H010), EFD-Contribuições; EFD-Reinf/DeSTDA conforme regime. *(Confirmar regime real de cada CNPJ — muda o eixo.)*

### Fase 4 — Reforma Tributária (paralela, começa a valer 2026)
16. **Motor dual** (calcula antigo + IBS/CBS/IS com fator de transição por ano) — reaproveita o versionamento por vigência da Fase 2.
17. **Alíquotas CBS/IBS versionadas** (0,9/0,1 em 2026) + **CST-IBS/CBS + cClassTrib** por NCM (tabelas já existem, faltam dados).
18. **Grupos IBS/CBS/IS no payload/XML** (NT 2025.002) — validar schema com a API de NF-e.
19. **Integração split payment** (preparar p/ 2027): campos e conciliação NF-e ↔ liquidação ↔ tributo retido.
20. **Crédito financeiro** CBS/IBS (apuração separada) e projeção de caixa considerando tributo na liquidação.

> **Antes de "travar" qualquer tabela:** validar as **alíquotas por NCM** (ST, FCP, IPI, monofásico) com a contabilidade, e tratar **toda alíquota como parâmetro versionado por vigência** — várias mudaram nos últimos 24 meses (PR 19,5% em 2024) e a transição IBS/CBS já começa em 2026.

---

## 8. Status de implementação (atualizado 11/08/2026)

### 8.1 Backend — aplicado direto no Supabase (`Teste ERP`), não versionado em git
- **Motor de cálculo** `public.erp_calcular_impostos_item(jsonb)` → `fn_calcular_impostos_item` — puro, **regime-aware por empresa**. Resolve CST/CSOSN, cenários **NORMAL / ST_PROPRIO / ST_RETIDO**, **monofásico** (CST 04, PIS/COFINS zero), **DIFAL base dupla**, MVA ajustada (Simples usa original), IPI-na-base condicional, e origem do produto (importado → 4%).
- **Integrado na emissão** `fn_gerar_nfe` — chama o motor por item e persiste tudo (CST/CSOSN, ST, ST-retido, DIFAL, FCP). IBS/CBS/IS seguem do grupo (Reforma — Fase 4).
- **CFOP derivado** `fn_resolver_cfop(base, interestadual, cenario, consumidor_final)` — remodela âmbito (5↔6 / 1↔2) e sufixo (102/108/401/404/405/403). Plugado no `fn_gerar_nfe`.
- **Apuração** `public.erp_apuracao_fiscal(id_empresa, mes, ano)` → `fn_apuracao_fiscal` — saídas por CFOP/CST (débito) **menos crédito de ICMS das entradas = saldo a recolher** (base EFD C190/E110).
- **Crédito de ICMS na entrada** — `compras_recebimento_itens` ganhou cfop/cst_icms/bc_icms/aliq_icms/valor_icms; `fn_recebimento_calcular_credito(id)` calcula por item (produto com ST → sem crédito; senão valor × alíquota inter/interna do fornecedor→empresa) e é chamada no `erp_recebimento_confirmar`. RPC `erp_recebimento_recalcular_credito`.
- **Config RPCs**: `erp_empresa_fiscal_salvar` (regime por empresa); `grupo_tributario_salvar` + `grupos_tributarios_dados` estendidas com `monofasico_pis_cofins`.
- **Schema aditivo**: `empresas` (regime_tributario, crt, contribuinte_ipi, substituto_st); `grupos_tributarios.monofasico_pis_cofins`; `nfe_itens` (csosn, bc/valor_icms_st_ret, aliq/valor_fcp, valor_fcp_st, aliq_icms_inter, perc_part_dest, valor_icms_dest/remet, valor_fcp_dest). `icms_uf` semeada (internas PR 19,5 / SC 17 + interestaduais de PR/SC 12%/7%).

- **Chave de acesso da NF-e (44 díg. + DV módulo 11)** — `fn_nfe_dv_mod11`, `fn_uf_codigo_ibge` (27 UFs), `fn_nfe_montar_chave`; **trigger `trg_nfe_chave`** preenche a chave em todo INSERT com número (não altera `fn_gerar_nfe`); RPC `erp_nfe_gerar_chave(id, forçar)` para (re)gerar/backfill. 100% interno, provedor-agnóstico. Testado: chave 44 díg., DV recalculado confere.
- **Gerador SPED — EFD ICMS/IPI** `public.erp_sped_efd_icms_ipi(id_empresa, mes, ano)` → `fn_sped_efd_icms_ipi` — monta o TXT posicional (pipe) com blocos **0** (0000/0001/0005/0150/0990), **C** (C001/C100/C190/C990), **E** (E001/E100/E110/E990) e **9** (9001/9900/9990/9999 com contadores automáticos). E110 vem da apuração (débito−crédito=saldo). Helpers `fn_sped_num` (vírgula decimal) e `fn_so_digitos`. **v1 estrutural** — ver caveats em 8.5.

### 8.2 Front — commitado + Vercel
- **Sistema → Config. Fiscal** (`ConfigFiscal.jsx`) — regime por empresa + toggle monofásico nos grupos. Commit `234d673`.
- **Financeiro → Apuração Fiscal** (`ApuracaoFiscal.jsx`) — resumo mensal por CFOP/CST + **botão "Exportar SPED"** (baixa o .txt do EFD ICMS/IPI). Commit `4ded43f` + este.
- Segurança (contexto): liberação de crédito no faturar exige aprovador válido (`erp_exigir_aprovador`, commit `0e3352b`) — **compõe** com a "autorização remota (sino)" da outra frente: o sino fornece o aprovador no front, o guard valida no backend (sem conflito, verificado 11/08).

### 8.3 Validações feitas
- Motor testado em 5 cenários (ST retido, ST próprio, DIFAL, monofásico, Simples) — OK.
- E2E `fn_gerar_nfe` na venda 422 → CFOP **6108** (consumidor final inter) e **6404** (ST retido) coerentes com 12%+DIFAL.
- Apuração E2E → débito ICMS 128,33 / DIFAL 99,63 agregados por CFOP/CST.
- **Bug corrigido pelo teste**: motor destacava ICMS para Simples; agora Simples = CSOSN sem ICMS destacado (fica no DAS).

### 8.4 Dados fictícios de teste (ambiente homologação)
Empresas com os 3 regimes (1=REAL+substituto ST, 6=REAL+importador, 2/7=PRESUMIDO, 3/8=SIMPLES); grupo id 8 "Autopeça monofásica"; produtos com NCM (pneus monofásicos, freios ST); clientes contribuintes + destino SP; 8 NFs emitidas (vendas 435–450). A tela de Apuração já mostra dados variados.

### 8.5 Pendências (roadmap fiscal)
| Item | Bloqueio |
|---|---|
| Migrar catálogo real (produtos com NCM/CEST/origem) | Migração Firebird |
| Curadoria NCM (monofásico / FCP / ST por UF) | Contador |
| Configurar regime real de cada empresa | Leo (tela Config. Fiscal) |
| ~~Entrada item-level → crédito de ICMS~~ ✅ FEITO 11/08 | via `compras_recebimento_itens` |
| ~~Chave de acesso NF-e (44 díg + DV)~~ ✅ FEITO 11/08 | trigger `trg_nfe_chave` |
| ~~SPED EFD ICMS/IPI (v1 estrutural)~~ ✅ FEITO 11/08 | `erp_sped_efd_icms_ipi` + botão no front |
| ~~SPED EFD-Contribuições (PIS/COFINS, Bloco M)~~ ✅ FEITO 11/08 | `erp_sped_efd_contrib` (0/C/M/1/9; regime→cumulativo×não; Simples bloqueado) + botão no front |
| **Transmissão à SEFAZ** (assinar XML + enviar) | **Decisão do Leo**: provedor (Focus/NFe.io/Tecnospeed) + certificado A1 — único bloqueio p/ emitir NF real |
| FCP por lista de NCM (interno) | Curadoria + catálogo |
| ISS (código serviço × município) para OS com instalação | — |
| Versionar regras por vigência | Prepara a virada da Reforma |

**Caveats do SPED v1 (EFD ICMS/IPI)** — antes de entregar ao fisco precisa: **COD_MUN** (código IBGE do município) no 0000/0150 (hoje vazio — falta cadastro na empresa/cliente), **IE** da empresa, registro **0100** (contabilista), **0190/0200** (unidades/produtos) e **C170** (itens por nota) se o perfil exigir, além de validação pelo **PVA da Receita** e pelo contador. O esqueleto e os contadores do bloco 9 já saem corretos.

---

*Documento gerado a partir de pesquisa com fontes oficiais (Receita, CONFAZ, SEFAZ-PR/SC, Portal NF-e, textos da EC 132/2023 e LC 214/2025) cruzada com o schema real do Supabase `Teste ERP` e o schema do Firebird legado. Ver as listas de "Fontes" ao fim de cada seção 1–4.*
