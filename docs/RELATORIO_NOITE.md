# Relatório da Noite — Validação ponta a ponta dos fluxos do ERP

> **Data:** 2026-08-17 (madrugada) · Sessão *Cérebro de implantação*.
> **O que foi pedido:** exercitar OS, venda, orçamento, produção, boqueta e financeiro ponta a ponta, achar onde quebra e consertar.
> **Como rodou:** um workflow com 8 agentes exercitou os 6 fluxos chamando as **RPCs reais** no schema `"Teste ERP"` (empresa 5 Truckprest, cliente de teste 21, produtos ACS-002/004/005/007/010), criando dados **marcados "TESTE-NOITE"**. Nada existente foi apagado ou alterado.

---

## ✅ Status (atualizado 17/08 manhã): 3 CRÍTICAS APLICADAS E VERIFICADAS

Depois de liberar as ferramentas do Supabase (allowlist), apliquei e **testei de verdade** as 3 críticas:
- ✅ **erp_baixar_titulo** — a RPC gravava `'ENTRADA'/'SAIDA'` mas o banco quer `'C'/'D'`; ainda tinha um 2º bug (coluna de log errada). Corrigido. **Testado:** título 76 baixado → PAGO.
- ✅ **os_faturar** (parcelado) — removido o valor duplicado + à-vista respeitando vencimento a prazo. **Testado:** OS 32 gerou 2 parcelas (venc +30/+60).
- ✅ **venda_faturar** — removido `valor_saldo` (coluna gerada) dos INSERTs. **Testado:** venda 472 faturou, título PAGO.

Migrations aplicadas: `fix_erp_baixar_titulo_tipo_cd`, `fix_erp_baixar_titulo_log_acessos_cols`, `fix_os_faturar_parcelado_e_vencimento`, `fix_venda_faturar_remove_valor_saldo`. (O `FIX_NOITE.sql` foi o rascunho; a versão da baixa mudou no teste.)

**Altas — TODAS aplicadas (17/08):**
- ✅ **Overloads os_salvar/os_servico_salvar** dropados (só a versão nova fica). **Testado:** os_salvar sem p_ator → criou OS 33 (antes dava HTTP 300 / tela branca).
- ✅ **Wrappers public** fn_solicitar_produto + fn_gerar_titulos_receber criados.
- ✅ **erp_separacao_entregar** agora aborta se a baixa de estoque falhar.
- ✅ **os_producao_concluir** cai pro custo real/preço de custo quando composição=0.
Migrations: `fix_drop_overloads_os_salvar_servico`, `fix_wrappers_public_solicitar_titulos`, `fix_separacao_entregar_e_producao_custo`.

**Dados corrigidos (17/08):** ✅ criada uma **Caixa (conta financeira) principal para cada empresa ativa** (Truckprest incluída — antes só a empresa 1 tinha; caixa/financeiro das outras estava inviável). Battogo pulada (será extinta).

**Ainda esperando o Leo (decisões de negócio 🟡 — NÃO apliquei):** solicitação→picking (consolidação); baixa de estoque antes vs depois do gate de crédito; unificar as 2 lógicas de título; ponto único de baixa do consumo.
**Polimento de baixa prioridade (não urgente):** validar conta×empresa no abrir caixa; escolher centro por principal=true na solicitação; preencher custo médio por centro (hoje 0 → CMV zerado — some quando houver entradas com custo real).

---

## ✅ O que passou (fluxos saudáveis)

- **Orçamento → Venda:** ponta a ponta **sem quebra**. Orçamento criado, item lançado, convertido em venda, itens corretos, vínculo preservado.
- **Caminho feliz à vista da OS:** abrir OS → defeito → serviço → peça (baixa de estoque única e correta) → apontamento → faturar à vista → 1 título gerado. **Sem baixa dupla de estoque.**
- **Boqueta/Separação (2 origens):** venda + OS solicitando peça → boqueta recebe → confirmar (só reserva) → entregar (baixa única no kardex). **Sem baixa dupla, sem baixa antecipada.**
- **Financeiro por condição:** títulos à vista / 30 / 30-60-90 com **vencimentos e parcelas corretos** (via `erp_finalizar_venda` → `fn_gerar_titulos_receber`). **Gate de crédito funciona** (rejeita cliente sem prazo e venda acima do limite). Caixa (abrir/movimento/fechar) com cálculo de diferença correto.

---

## 🔴 As 3 CRÍTICAS (financeiro parado — correção pronta no FIX_NOITE.sql)

| # | Onde | Sintoma | Correção |
|---|---|---|---|
| 1 | `venda_faturar` | Faturar venda com financeiro **quebra SEMPRE** (erro 428C9): faz INSERT em `titulos.valor_saldo`, que é coluna **GERADA** (`valor - valor_pago`). Venda nunca vira FATURADA. | Remover `valor_saldo` de todos os INSERTs (5 lugares). |
| 2 | `os_faturar` (parcelado) | Faturar OS **parcelada** aborta (erro 42601): INSERT com **14 colunas × 15 valores** (`v_valor_parcela` duplicado). | Remover o valor duplicado. |
| 3 | `erp_baixar_titulo` | **Nenhuma baixa de título** funciona (erro 22001): grava `'ENTRADA'/'SAIDA'` em `contas_movimentos.tipo` que é `varchar(2)`. Tabela está vazia (nunca funcionou). | Alargar a coluna para `varchar(10)`. |

---

## 🟠 ALTAS (correção pronta)

4. **`os_salvar` e `os_servico_salvar` — overload duplicado.** Duas versões que diferem só por um argumento (`p_ator` / `p_id_defeito`), ambas com todos os args default → chamada do front sem esse arg dá "function is not unique" → **HTTP 300, tela de OS quebra ao salvar**. Correção: dropar o overload antigo, manter só o novo.
5. **`fn_solicitar_produto` e `fn_gerar_titulos_receber` sem wrapper `public`.** O front chama via public e não alcança. Correção: criar os wrappers.
6. **`os_faturar` à vista sempre grava PAGO vencendo hoje** — ignora condição a prazo (uma OS "30 dias" vira título quitado hoje). Correção: calcular vencimento pela condição; só PAGO quando à vista.
7. **`erp_separacao_entregar` ignora o retorno de `erp_baixar_estoque`** — se a baixa falhar, a expedição vira ENTREGUE mesmo sem baixar. Correção: checar o retorno e abortar.
8. **`os_producao_concluir` custo zero** — produto sem composição e sem custo médio entra a custo 0 mesmo com consumo real de R$25. Correção: cair para custo real / preço de custo.

---

## 🟡 MÉDIAS/BAIXAS — precisam de DECISÃO SUA (não apliquei, é negócio)

- **Solicitação de peça (venda) não vira picking na boqueta** — é a **consolidação por picking** que você já decidiu construir (está no caderno). Não é bug, é a feature a fazer.
- **Baixa de estoque no lançamento do item, antes do gate de crédito** — venda rejeitada por crédito segura estoque até cancelar. Decisão: validar crédito no lançamento OU baixar só na finalização.
- **Duas lógicas de geração de título** (`venda_faturar` vs `fn_gerar_titulos_receber`) — divergem. Recomendo consolidar numa só. É refactor, quero teu aval.
- **Consumo de produção não baixa material físico** — definir o ponto único de baixa (na conclusão OU na expedição). Conecta com o desenho da produção.
- **Dados:** empresa 5 (Truckprest) **sem conta financeira**; **custo médio zerado** no centro 5 (CMV sai 0). Precisa cadastrar conta + preencher custo.
- **`erp_abrir_caixa` não valida conta × empresa**; **escolha de centro por id em vez de principal**. Correções pequenas, incluídas no FIX.

---

## 📊 Resumo
- **6 fluxos** exercitados ponta a ponta. **19 quebras** (3 críticas, 5 altas, 11 médias/baixas).
- **2 fluxos limpos** (Orçamento→Venda e o caminho feliz à vista).
- **Nenhuma quebra é puramente de frontend** — todas têm correção de backend ou são dados/decisão.
- **Correções mecânicas** (crashes, overloads, wrappers, coluna): prontas em [`FIX_NOITE.sql`](FIX_NOITE.sql).
- **Decisões de negócio**: listadas acima, **não apliquei** — esperam você.

## Dados de teste deixados no sistema (marcados TESTE-NOITE)
Cliente 21 e 22; vendas 461–471; OS 28, 30, 31, 32; orçamento 14; títulos e expedições correspondentes; ajuste de estoque nos produtos 2,4,5,7,10 (centro 5). Pode inspecionar pra ver os fluxos funcionando, e depois limpar filtrando por "TESTE-NOITE".

## Próximo passo (de manhã)
1. Revisar `FIX_NOITE.sql` e aplicar (ou me liberar pra aplicar) — resolve as 3 críticas + as altas mecânicas.
2. Decidir os itens 🟡 (negócio) — eu construo conforme você definir.
3. Eu re-rodo a validação pra confirmar que tudo passou verde.
