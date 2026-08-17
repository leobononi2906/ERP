# Caderno de Ideias — Gestão / Implantação ERP

## 🧭 ONDE PARAMOS — fila pra sessão nova (atualizado 18/08 noite — 13 commits PUSHED)

**✅ SESSÃO 18/08 COMPLETA (13 commits, todos PUSHED):**
1. efe378d — Permissão estoque/transferências
2. 9a546dd — Distribuição (parados + cancelamento)
3. 0e67d5b — Follow-up histórico (OS + cliente)
4. 3bef782 — Finalização multi-serviço (Pátio)
5. 5d888f7 — Buscador de placa (Edge Function)
6. 9d78171 — Não-sobreposição horários (crítico precificação)
7. 541cc00, 60ea1b1 — Docs
8. ec7b8a5 — Checkpoint
9. 9461dd3 — Remover consumo modal Solicitar Peça + keyboard-first
10. b8dae96 — Estoque inline + foto na modal Solicitar Peça
11. daa9837 — Marca como FEITO estoque inline
12. ae7bbd9 — Lançamento direto de peça na OS (autorizado)
13. 2adc417 — Carrinho de múltiplas peças no pátio (Apontamento)

**🔜 PRÓXIMA LEVA (5 itens, backend 100% pronto, falta UI):**
1. **Localização múltipla** — backend: `erp_produto_localizacoes` / `_salvar` / `_excluir`. Falta: aba em Produtos.jsx (rua/prateleira/nível/centro, marcar principal)
2. Orçamento GANHO×PERDIDO (botão "Perder" + relatório conversão)
3. Consulta rápida (modal F-key preço/cliente)
4. Editor perfis/condições pagamento (tela CRUD)
5. OP no pátio (lançar produto produção)

## 🧭 ONDE PARAMOS — fila pra sessão nova (base histórica)

> Leia este bloco primeiro. Contexto: o Leo testou o sistema e apontou coisas de cadastro/OS. Descobrimos que **o front dessas coisas JÁ ESTAVA construído** (Clientes/Veiculos/OrdensServico) — o que faltava era backend + o deploy estar atrás.

**✅ Já resolvido nesta rodada (NÃO refazer):**
- **Marca / Cor / Formato** — tabelas `marcas`/`cores`/`formatos` + RPCs `erp_marcas_listar`/`erp_marca_salvar`, `erp_cores_listar`/`erp_cor_salvar`, `erp_formatos_listar`/`erp_formato_salvar` (+ wrappers public). Find-or-create (não duplica), rejeita vazio. **Testado.** O front do Veículo já consome (DominioSelect com "＋").
- Confirmado que **já existe no código** (só precisa estar deployado): cliente com CEP/endereço/perfil tributário obrigatórios + ViaCEP + busca CNPJ; perfil tributário = `indicador_ie` com rótulos claros; erro de salvar com mensagem específica; **adicionar serviço na OS keyboard-first** (Enter adiciona e reabre, Esc fecha, área por código).

**FEITO 18/08 (morning):**
1. ✅ **Permissão "gestão de estoque/transferências"** (commit efe378d)
2. ✅ **Distribuição — Serviços parados + Cancelamento** (commit 9a546dd)
3. ✅ **Modelo de veículo = LIVRE** (decisão Leo)

**FEITO 18/08 (acelerador noite - 3 itens em sequência):**
1. ✅ **Follow-up histórico (OS + cliente)** (commit 0e67d5b)
   - Tabela `os_followup` (id_os, id_cliente, tipo, descricao, motivo, origem, id_usuario, criado_em)
   - RPCs `erp_os_followup_listar(p_id_os)` + `erp_cliente_followup_listar(p_id_cliente)`
   - DrawerFollowup em OrdensServico.jsx e Clientes.jsx (timeline com cores)
   - Hook registra parada/cancelamento/retomada automaticamente

2. ✅ **Finalização multi-serviço (Pátio)** (commit 3bef782)
   - os_servicos: colunas `finalizado_por` + `finalizado_em`
   - RPC `os_servicos_finalizar(p_ids, p_id_colaborador, p_ator)`
   - Apontamento.jsx: checkboxes multiseleção + botão grande "FINALIZAR N"
   - Distribuição: badge ✅ Finalizado + bloqueia reatribuição
   - OS: bloco verde "Finalizados aguardando precificação"

3. ✅ **Buscador de placa** (commit 5d888f7)
   - Edge Function supabase/functions/buscar-placa/index.ts (placeholder)
   - Botão 🔍 Buscar em Veiculos.jsx
   - Preenche marca/modelo/ano/cor (validação ABC1234 + Mercosul)
   - ⚠️ TODO: Definir provedor + configurar PLACA_API_BASE_URL/KEY

**✅ CRÍTICO P/ PRECIFICAÇÃO (18/08 noite — FEITO commit 9d78171):**

1. ✅ **Não-sobreposição de horários (colaborador → 1 relógio por vez)**
   - `os_patio_defeito_acao` ao dar ENTRADA/RETOMAR fecha automaticamente outro apontamento aberto
   - UI Apontamento.jsx: exibe aviso (⏸️ pausado — agora corre em Y)
   - Garante tempo_realizado sem dobrados (base de precificação correta)

2. ✅ **Gerenciamento de apontamentos (backend pronto)**
   - RPCs: `erp_apontamento_editar/incluir/excluir` (todas com LOG)
   - Validação: não permite sobreposição mesmo colaborador
   - Recalcula horas_trabalhadas após edição
   - TODO (próx): Front (OS) aba/drawer "Apontamentos" lista editável — só perms.aprovar; mostra autor/carimbo

**🔜 Próximos (não urgente):**
- Fotos de produto (parado até servidor interno)

**🟡 Ainda aguardando decisão do Leo:**
- **"Formato"** (na tela Veículo): backend pronto (igual marca/cor), mas falta saber **onde amarra na tela e o que é** (tipo de veículo? carroceria?).
- Editor de etiqueta (layout) vs só qtd/formato; Battogo (extinção este mês) real vs deletar; contador validar as 4 planilhas fiscais (trava o carimbar 38k produtos).

**💤 Deferido (não urgente):** unificar as 2 lógicas de geração de título — sem bug ativo após os fixes da noite; é refactor, fazer com calma em branch.

---

## 2026-08-18 — Separação (bug confirmar + código + regras)

- ✅ **BUG confirmar RESOLVIDO** (commit ff6cd52): `SeparacaoDetalhe` não recebia a prop `usuario` → `confirmar`/`cancelar`/`entregar` estouravam com "usuario is not defined". Passei `usuario` do pai.
- ✅ **Código sequencial na Separação**: `erp_separacao_detalhe` agora retorna `codigo`; coluna Código na tabela de itens + no picking impresso.
- ✅ **Regras já garantidas no backend** (`erp_separacao_confirmar`): não separa MAIS que o pedido; falta a menos **exige motivo predefinido** (ERRO_LANCAMENTO / VENDA_PERDIDA) e gera venda perdida; **não aceita item não solicitado** (só processa itens da expedição). Front já tem o dropdown de motivo.
- ✅ **Lançamento direto na OS (só autorizado) — FEITO (commit ae7bbd9):** modal Solicitar Peça agora tem toggle "🎯 Lançamento direto" (visível só pra autorizado = perms.aprovar). Chama RPC `os_peca_lancar_direto` → baixa estoque na hora, recusa se falta saldo. Card inline mostra estoque/preço. Log registra PECA_LANCADA_DIRETO.

## 2026-08-17 (noite) — Veículo (modelo/placa) + Fotos no servidor interno

- **Modelo de veículo = LIVRE** (texto). Decisão do Leo: não vira domínio. Mas planejar **buscador de placa** (API de placa → preenche marca/modelo/ano/cor automático) — "agiliza demais". Próximo acelerador do cadastro de veículo.
- **Fotos de produto no SERVIDOR INTERNO** (não Bling). ✅ base pronta: `produtos.foto_url` + tabela `produtos_imagens` + `os_produtos_dados` devolve `foto`. Plano completo em **docs/FOTOS_PRODUTO.md** (URL no banco / arquivo no servidor, nome = código imutável, servir por HTTP, fonte plugável = Storage agora → interno depois). Falta: endpoint de upload + UI no cadastro + RPCs de imagem.

## 2026-08-17 (noite) — Notificações: serviço parado (FEITO) + follow-up + card parados (FEITO 18/08)

**✅ FEITO e testado (backend 17/08):** marcar serviço como PARADO (com motivo) → gera **notificação no sino** via `erp_notificar`. `erp_os_servico_status` cria a notificação (origem `OS_SERVICO_PARADO`, link → distribuição, prioridade 1). **"Avisa todo mundo":** `papel_destino='TODOS'` + `erp_notificacoes_listar` passou a incluir broadcast → testado: OPERADOR que não é o destinatário vê no sino. Destinatário direto = vendedor da OS (agora obrigatório). Perfis reais hoje = só OPERADOR/ADMIN (papel fino não existe ainda).

**✅ FEITO 18/08 (backend + frontend):**
1. **Coluna `motivo_cancelado`** em os_servicos + RPC `erp_os_servico_status` com validação completa (rejeita status inválido, exige motivo em PARADO/CANCELADO, impede cancelar OS faturada).
2. **Distribuição — card "Serviços Parados"** — bloco próprio listando os parados (com motivo visível), permitindo **Retomar ou CANCELAR**. + **Botão Cancelar em todo serviço** não-finalizado (em qualquer status) com modal (motivo obrigatório). Commit: 9a546dd.

**🔜 A construir (próxima peça):**
- **Histórico de follow-up da OS** — timeline de eventos da OS (parada+motivo+quem+quando+origem, e depois outros). **Ancorar também no cliente** ("armazenado no cliente, indicando de onde veio a informação") → dá pra ver, pelo cliente, o histórico das interações/OS dele. Modelar tabela `os_followup` (ou reusar log) + view por cliente.

## 2026-08-17 (noite) — Pátio/OS: fluxo de finalização multi-serviço + status (DESIGN, a construir)

**Conceito do Leo:** "concluir MEU serviço" (o apontamento do colaborador) ≠ "serviço FINALIZADO" (a linha de serviço pronta pra precificar). Hoje o banco **conflaciona**: `os_servicos` tem 1 status (PENDENTE/EM_EXECUCAO≈EM_ANDAMENTO/PARADO/CONCLUIDO) e **1 só** `id_tecnico`; os `apontamentos` guardam o tempo por defeito. Não existe separação "minha parte pronta" vs "serviço pronto".

**Regras do Leo:**
- 1 colaborador pega **N serviços da mesma área** (ex.: 3 de elétrica), **entra em todos** (mesmo que só 1 tenha apontamento detalhado) e **FINALIZA os N de uma vez**.
- Ao finalizar → `os_servicos.status = CONCLUIDO` + **registra QUEM finalizou e quando** (é a validação que quem distribui enxerga).
- **Trava:** serviço finalizado **não pode ser reatribuído** a outro colaborador (evita refação / duplo repasse).
- **Boca (vendedor)** tem um **bloco só** "serviços finalizados aguardando precificação" → precifica em lote antes de faturar.

**A construir (próxima peça focada):**
- Backend: `os_servicos` + `finalizado_por int` + `finalizado_em timestamptz`; RPC `os_servicos_finalizar(p_ids int[], p_id_colaborador, p_ator)` (seta status/finalizado_*, recusa já-finalizado); `os_distribuir_servico` recusa se finalizado; consolidar EM_ANDAMENTO≈EM_EXECUCAO.
- Front Pátio: multiseleção + botão GRANDE "Finalizar serviço(s)".
- Front Distribuição: **botão bem visível + didático** + badge "✅ Finalizado por Fulano"; reatribuir bloqueado.
- Front OS (boca): bloco "Finalizados p/ precificar" em lote.

## 🔨 Aplicado 17/08 (tarde) — backend construído + testado (eu)
- ✅ **Localização múltipla:** tabela `produtos_localizacao` + RPCs `erp_produto_localizacoes/_salvar/_excluir`. Testado (N localizações rua/prateleira/nível/centro, marca principal). Falta UI (aba no produto) → sessão ERP.
- ✅ **Orçamento GANHO×PERDIDO:** status `PERDIDO` (add ao constraint) + `erp_orcamento_perder(id,motivo,ator)` + relatório `erp_orcamento_conversao(empresa,ini,fim)` (taxa de conversão + por vendedor). Testado (taxa 66,7%). Falta UI (botão "Perder" no orçamento + tela do relatório) → sessão ERP.
- ✅ **Gôndola:** flag `gondola=true` no centro "Gôndola Loja".
- ✅ **Tipo de saída "Consumo de Produção"** criado (mov estoque, não financeiro) — pro consumo da OP.
- ✅ **Produto de produção (OP) — backend fechado:** consumo NÃO é cobrado do cliente (os_recalcular_totais já soma só consumo=false; consumo vai em valor_consumo) ✅; comissão pelo valor do produto ✅ (produzido entra na base de peça); trava **só produto `produzido=true` pode ser lançado como produção** (os_lancar_producao). Front (pátio lança produto, novo defeito, apontar/pausar/terminar, status PARADO) → sessão ERP.
- ✅ **Peça ↔ defeito:** `solicitacoes_produto.id_defeito` + `os_patio_solicitar_peca` vincula a peça ao defeito do apontamento aberto (auto). Relatório: peças por defeito.
- ⏳ Backend ainda a fazer: permissão "gestão de estoque/transferências" (módulo — cuidado 2 tabelas); status PARADO por serviço (com motivo) + consolidar EM_ANDAMENTO≈EM_EXECUCAO. **#3 unificar título: deferido** (sem bug ativo — refactor pra fazer com calma/branch).


## 2026-08-17 (noite) — feedback do Leo usando o sistema (abrindo OS/cadastros)

Levantado ao operar de verdade. Análise vs. o que existe:

1. **Cadastro de cliente — obrigatórios + perfil tributário (p/ NF-e):**
   - `cep` existe (nullable) → tornar **obrigatório** na tela + máscara + autofill ViaCEP (front).
   - **Perfil tributário JÁ EXISTE no banco:** `clientes.indicador_ie` (1=contribuinte ICMS, 2=isento, 9=não contribuinte, default 9). Front deve **exibir com rótulo claro "Perfil tributário / Indicador de IE" e torná-lo obrigatório**. Também há `indicador_ie`, `tipo_pessoa`, `cpf_cnpj`, `rg_ie`, `iss_retido`, `inscricao_municipal`, `email_nfe` — tudo pronto pra NF-e.
   - Obrigatórios na tela: nome (já NOT NULL), cpf_cnpj, endereço, CEP, perfil tributário. Máscaras (CPF/CNPJ/CEP/telefone) já formatadas. → **FRONT**.
2. **Mensagem de erro clara ao salvar (TODAS as telas):** hoje algumas telas bloqueiam sem dizer o porquê (ex.: veículo sem ano — `ano_fabricacao/ano_modelo` são nullable no banco, então a trava é do **front** e está muda). Padrão: capturar erro da RPC/Supabase e mostrar o motivo num toast/aviso (a Distribuição já faz `notificar("Erro: "+e.message)`). Backend: garantir `RAISE EXCEPTION` com texto legível. → **FRONT (exibir) + backend (mensagens legíveis, faço conforme aparecer)**.
3. **Cadastro de domínio (fim da digitação solta):**
   - ✅ **Marca e Cor: tabelas já existiam** (`marcas`, `cores`). **Backend construído+testado 17/08:** `erp_marcas_listar`/`erp_marca_salvar`, `erp_cores_listar`/`erp_cor_salvar` (+ wrappers public + `cores.ativo`). Dedup case-insensitive (não duplica), rejeita vazio, cores com 11 seeds. → Front: trocar texto livre por **dropdown + botão "＋" inline** (cadastra sem sair da tela). `veiculos.id_cor` (FK) já existe; marca hoje é texto livre (`veiculos.marca`) — front pode escrever a descrição escolhida.
   - **Modelo:** NÃO tem tabela `modelos` (o `veiculos.id_modelo` está solto). Fica texto livre por ora — decidir se vira domínio (marca→modelos).
   - ❓ **"Formato":** não existe nada e não entendi o que é — **aguardando 1 palavra do Leo** (tipo de veículo? carroceria? formato de quê?).
4. **Adicionar serviço na OS mais dinâmico (keyboard-first):** hoje precisa pegar o mouse pra clicar Salvar a cada serviço. Fluxo desejado: **descrição → Tab → Área (digita só o código, ex. 01=autoelétrica, 02=autovidros; se não sabe, seta/dropdown) → Enter adiciona → já reabre linha em branco pra próxima → só sai do ciclo no X ou ESC.** Backend pronto (`os_servico_salvar`, área tem código). → **FRONT** (encaixa no padrão keyboard-first de references/automacoes.md).
5. **Dúvida respondida (Distribuição, 2 blocos):** cima = "Serviços Solicitados (defeitos)" = **a distribuir** (defeito cru do pátio, atribui área/técnico); baixo = tabela grande = **distribuído/em execução** (serviços e produções com técnico, status, tempo). Dois estágios do mesmo fluxo.

## 2026-08-17 — orçamento vinculado + controle ganho/perdido

- **Orçamento gerado da OS/venda, vinculado:** ✅ já existe (`orcamentos_venda.id_os`, botão "Novo orçamento" na OS, painel "Orçamentos desta OS" via erp_os_orcamentos).
- **Conversão:** ✅ `orcamento_converter_venda` → status CONVERTIDO (testado 17/08). Status hoje na base: ABERTO, CONVERTIDO.
- **GAP — controle do Leo:** status **PERDIDO** + **motivo** (existe `orcamento_reprovar`, mas falta o "perdido" explícito) + **relatório GANHO × PERDIDO** (taxa de conversão de orçamento: fechados vs perdidos, por vendedor/período/motivo). É o controle de "quais realmente foram validados e quais se perderam". → construir status PERDIDO+motivo + relatório.
- Nota: **produto de produção (OP)** segue SPEC (rodada 5), NÃO construído. Só toquei `os_producao_concluir` (fix custo 0 → fallback) na noite. Cadastro de produto intacto.

## 2026-08-17 — teclado/cadastro inline + revisão entrada de nota

- **Keyboard-first + CADASTRO INLINE (OS/Venda):** prioridade reafirmada pelo Leo. Sem sair da tela: cadastrar **cliente** e **veículo/placa** via modal por cima → volta com o novo já selecionado. + mapa de atalhos (config.js ATALHOS: F2 novo, F3 buscar, F6 add item, F9/F10 faturar/salvar, Esc). Irmão da consulta rápida (consulta) + agora cria. Sessão ERP.
- **REVISÃO entrada de nota (Entradas.jsx / erp_entrada_*):** quase tudo JÁ existe → conferência (contagem física, modo cego), vincular pedido de compra (→ RECEBIDO), acerta qtd (entra pela conferida), etiquetas 2 formatos (produto + expedição) com **qtd editável por item** (põe 0 = pula), entrada por pedido sem nota, e **custo por tipo** (`tipos_entrada.atualiza_custo`: COMPRA/IMPORTAÇÃO sim; RETORNO/BONIFICAÇÃO/DEVOLUÇÃO não). **Gap a decidir:** editar o MODELO/layout da etiqueta (hoje layout fixo em print.jsx) — Leo quer editor de etiqueta ou só escolher qtd/formato (já tem)? Aguardando resposta.

## 2026-08-17 — decisões de negócio + consulta rápida

- **#1 Solicitação → PICKING consolidado:** ✅ **JÁ EXISTE no backend** (verificado 17/08). `os_solicitar_peca` e `venda_solicitar_item` já fazem find-or-create: acham a expedição aberta (SOLICITADA/EM_SEPARACAO) da OS/venda e **adicionam o item nela**; só criam nova se não há. O "furo" da validação era o caminho legado `fn_solicitar_produto` (não usado pelo app). Falta só o FRONT (boqueta editar qtd + mostrar o que faltou) → sessão ERP. E a **#3 unificação: após os fixes da noite, os 3 caminhos de título geram resultado CORRETO** (testado: venda à vista PAGO, OS 30/60 = 2 parcelas, fn_gerar 30/60/90 ok) → não há bug ativo; unificar virou refactor de melhoria (fazer com cuidado / branch), não urgência.
- (histórico) **#1 A boqueta EDITA** o picking (pode não ter a peça, ou só parte, ou nada → informa qtd realmente separada) — já existe via qtd_separada no confirmar; falta a consolidação + registrar/visibilizar o que faltou (pendência). Backend: eu; tela boqueta: sessão ERP.
- **#2 Estoque × crédito:** DECISÃO DO LEO = **NÃO vincular**. A peça já está na OS; a boqueta confirma ou recusa, independente do crédito. Não criar exceção "devolve no crédito recusado". Estoque segue o ato operacional; crédito é gate separado. **Nada a construir.**
- **#3 Unificar geração de título:** CONFIRMADO unificar. Modelo do Leo: Faturar → tela de Movimentação Financeira (já existe no front). Duplicação é no backend (venda_faturar/os_faturar têm lógica própria vs fn_gerar_titulos_receber). **Uma calculadora só**, cobrindo parcelas automáticas (condição) E parcelas editadas no popup. Backend: eu + teste.
- **💡 Consulta rápida (mid-OS):** vendedor no meio da OS precisa consultar **preço de produto** e **cliente** sem sair da tela. Base existe (tela ConsultaPrecos + erp_produtos_buscar/erp_clientes_buscar). Falta: **modal não-bloqueante por atalho de teclado** (F-key) por cima da OS/venda. Sessão ERP.

## 🌙 Noite 17/08 — validação ponta a ponta dos fluxos
Rodei 6 fluxos via RPCs reais (empresa 5 Truckprest, dados TESTE-NOITE). **19 quebras** achadas (3 críticas: `venda_faturar` valor_saldo, `os_faturar` parcelado, `erp_baixar_titulo` coluna varchar(2)). **Não pude aplicar** (trava de segurança bloqueia DDL em modo auto + Leo dormindo) → **correções prontas em [FIX_NOITE.sql] + relatório em [RELATORIO_NOITE.md]**. Decisões de negócio (solicitação→picking, baixa vs crédito, unificar lógica de título) esperam o Leo.

## ⏱️ Atualização 16/08
- ✅ **Código sequencial do produto (Spec 3) — CONSTRUÍDO.** `produtos.codigo` criado = sequencial interno **imutável** (trigger trava edição), sequência **global** dedicada. `referencia` renomeada "Ref. fornecedor". Migração seta `codigo = CODIGO Firebird`.
- ✅ **Busca de produtos (#5) — CONSTRUÍDA.** Agulha "Código + Nome" (sem escolher campo) nas 5 telas (Vendas, OS, Remessas, Cotações, Estoque uso interno).
- ✅ **Regimes das empresas aplicados** (7 da lista do Leo). Battogo (id 7) segue com valor de teste — **decisão do Leo pendente**.
- ⏳ **Fiscal Bloco C** (carimbar 38k produtos) travado no **contador validar as 4 planilhas**. `produtos_fiscal_empresa` ainda = 0.
- 💤 **Notificações (Spec 1)** e **Localização múltipla (Spec 4)** — specs prontas, **aguardando "pode construir"**.
- Follow-up pequeno oferecido pela sessão ERP: mostrar `#codigo` read-only no cadastro (`Produtos.jsx`).

---


> Backlog de ideias do Leo, **analisadas contra o que já existe** antes de mandar construir.
> Mantido pela sessão *Cérebro de implantação*. Status: 💡 a discutir · ✅ já existe · 🔴 gap confirmado · 🟡 existe parcial.
> Convenção: nada vai pra construção sem passar por aqui e ser decidido com o Leo.

---

## 2026-08-16 — rodada 3: separação (picking), saídas sensíveis, boleto

### ✅ Decisão — Solicitação de peça POR PICKING (consolidar)
Leo decidiu: solicitações de peça da mesma OS/venda devem **consolidar num picking único** na boqueta (não N linhas soltas). Hoje `solicitacoes_produto` é por peça e NÃO vira expedição; a boqueta (`erp_separacao_dados`) já opera por picking (`expedicoes`+`expedicoes_itens`, nº via `nextval_picking`). **A construir:** solicitação avulsa alimentar/gerar um picking consolidado por origem (OS/venda).

### 🧭 MODELO OPERACIONAL — saídas de mercadoria (as 3 portas) + gôndola
Como funciona de verdade (descrito pelo Leo 16/08):

**1. Boqueta (separação)** — ✅ controle já existe. Dois papéis: **quem separa (picking)** + **quem confere e lança (conferência)**. Atende as solicitações. É também de onde sai a separação pra expedição.

**2. Expedição** — ✅ controle existe. Ex.: ecommerce vende → solicita → boqueta separa → leva pra expedição → **expedição valida** (pedi 10 geladeiras, estão as 10) → fica em separação → ajusta embalagem → despacha.

**3. Gôndola** — ⚠️ **o buraco principal, sem solução hoje.** Vendedor pega da prateleira e **lança direto na venda**, sem conferência.
- Numa **mesma venda**: pode ter **item de gôndola** (pega da prateleira) **+ item solicitado do estoque** (vai pra boqueta). O sistema tem que rotear cada linha pela origem.

**Base que JÁ existe (ligar, não criar):** `centros_estoque` tem flag **`gondola`** + já há centro **"Gôndola Loja"** (empresa 3, mas com o flag ainda false — acertar). Saldo por centro (`estoque_saldos`) e transferência entre centros (`estoque_transferencias`) existem.

**Proposta de controle da gôndola (a validar com o Leo):**
1. **Só vende o que tem na gôndola** — item de gôndola limitado ao saldo daquele centro (não vende o que não está na prateleira).
2. **Item de gôndola nasce PENDENTE DE VALIDAÇÃO**, validado **no CAIXA** (Leo: "esquece a boqueta, leva pro caixa validar"). Só firma/baixa após o caixa conferir as peças físicas.
3. **Venda mista** roteia por linha: gôndola → validação no caixa; estoque → picking na boqueta.
4. **Movimentação interna:** quando o estoque interno acaba e a boqueta pega da gôndola (ou repõe a gôndola a partir do depósito), registrar **transferência entre centros** pra manter saldo por local correto.

**Decisões do Leo (16/08):**
- **(a) PRINCÍPIO GERAL DO SISTEMA: "lançou → baixou".** Baixa uniforme pra tudo, sem exceção pra gôndola. Item de gôndola baixa no fechamento da venda (igual aos outros). A validação no caixa vira **conferência** (confere o físico), **não** trava a baixa. → Alinha com a regra atual (baixa no faturar / migration 45); no balcão/gôndola lançar=faturar (instantâneo). *Confirmar semântica de "lançou": é no FECHAR a venda, não ao adicionar item no rascunho.*
- **(b) Transferências/movimentação interna = gatilho por PERMISSÃO.** Criar um papel/função "gestão de estoque (transferências)" na matriz de permissões e **atribuir a pessoas específicas** (gente do Compras + responsáveis do Estoque). O Leo atribui. Liga com o módulo de permissões/grupos que já existe.

### ✅ Boleto / condição de pagamento — como funciona (confirmado no código)
- Geração de título é **100% BACKEND** (`fn_gerar_titulos_receber`), NÃO no front. O front só escolhe a condição; o back calcula tudo. É o padrão certo.
- "30 dias" (id 2: num_parcelas=1, intervalo=30) → gera **1 título, vencimento = data faturamento + 30**. "30/60/90" → 3 títulos (30/60/90). Condições com `entrada` → 1ª parcela à vista (offset 0) + resto.
- Dois modelos: **regular** (num_parcelas + intervalo_dias) e **parcelas flexíveis** (`condicoes_pagamento_parcelas` com prazo_dias+percentual — tem prioridade se preenchida; hoje vazia).
- ⚠️ **2 camadas de "boleto":** (1) o **TÍTULO a receber com vencimento certo** = JÁ EXISTE. (2) o **BOLETO BANCÁRIO registrado** (CNAB, linha digitável, PDF) = **fase futura** (não feito). Hoje gera o título/parcela, não o arquivo do banco.

---

## 2026-08-16 — rodada 5: OS com PRODUTO PRODUZIDO (tapeçaria) — spec

> Leo validou o fluxo atual da OS (defeito/serviço-solicitado → apontamento de horas → boqueta vincula ao realizado): "ficou bom, ótimo pros relatórios". **Novo caso:** a OS também vende **produtos FEITOS na hora** (ex.: tapeçaria faz uma cama pro caminhão Scania). Fazer da melhor forma. **Sequência: DEPOIS da documentação.**

**Fluxo (reusa o mesmo do defeito/serviço — resolve em PRODUTO em vez de SERVIÇO):**
1. **Vendedor** lança na OS um item "a produzir" (escolhe o produto do catálogo onde `produtos.produzido=true`, ex.: "cama Scania") → vira um **defeito/serviço-solicitado tipo PRODUÇÃO**, distribuído à **área** (Tapeçaria).
2. **Colaborador da Tapeçaria** aponta horas nesse defeito pelo **Pátio/Apontamento** — exatamente igual a um serviço (login do pátio, apontamento aberto).
3. Durante a produção, pede **peças de consumo** (baixam por tipo de saída Uso Interno/Consumo, não vão pra conta do cliente).
4. Na **precificação**, em vez de "criar serviço dos apontamentos", **vincula o PRODUTO produzido** aos apontamentos → linha `os_pecas` com `produzido=true`, valor = **valor do produto**. Comissão sai pelo valor do produto.
5. As **horas apontadas** ficam registradas pros **relatórios de produtividade** da Tapeçaria (mesmo não sendo a base da cobrança).
> Chave do desenho: o produto produzido é um defeito que, na precificação, **resolve num PRODUTO** (os_pecas) em vez de num SERVIÇO (os_servicos). `os_pecas` já tem `id_area`, `id_producao`, `data_inicio`, `id_usuario_distribuiu` → suporta ser distribuído/produzido igual a um defeito.

**Regras do Leo:**
1. **Comissão pelo VALOR DO PRODUTO produzido** (não pelo valor do serviço cobrado).
2. **Peças de CONSUMO:** as peças necessárias pra produzir são pedidas em **modo consumo** → **baixam estoque** mas **NÃO saem na OS do cliente** (é como "uso interno" da produção).
   - ⚠️ **A flag NÃO é do produto, é da LINHA.** A mesma peça (ex.: parafuso) é **consumida** numa OS e **vendida** noutra. Por isso `consumo` está em `os_pecas` (a linha), não em `produtos` — o modelo atual **já resolve isso**: o mesmo produto pode aparecer como consumo=true (produção) ou consumo=false (venda ao cliente) conforme o caso.

**🎉 O que JÁ existe (≈80%):**
- `os_pecas` já tem: **`consumo`** (bool), **`produzido`** (bool), **`id_producao`**, **`id_area`**, **`custo_composicao`**, **`custo_real`**, `movimentou_estoque`.
- `produtos_composicao` (BOM/receita: componentes + serviços) existe. `produtos.produzido` existe.
- `os_comissoes` tem **`tipo` + `valor_base`** → base de comissão flexível (dá pra ser o valor do produto).
- `os_solicitar_peca` já aceita `p_consumo`.

**Consumo = TIPO DE SAÍDA (reusar, não inventar — princípio do Leo):**
- Já existe `tipos_saida` id 6 **"Uso Interno"** (mov_estoque=true, mov_financeiro=false, gera_nf=false). O consumo de produção usa esse mecanismo. **Recomendo criar um tipo dedicado "Consumo de Produção"** (mesmas flags) só pra separar nos relatórios/histórico.
- **Automático:** ao confirmar a peça de consumo na OS, gera a saída por esse tipo → motor único `erp_baixar_estoque` → grava **kardex** (`estoque_movimentos`).
- **AUDITÁVEL (Leo destacou como crítico) — já é por design:** `estoque_movimentos` tem `origem`, `id_referencia`, `numero_referencia` (liga à OS), `id_usuario`, `estoque_anterior/posterior`, `criado_em`, `id_colaborador/departamento/centro_custo`. Então:
  - **Por OS:** dá pra ver todas as peças consumidas naquela OS.
  - **Por produto:** o histórico de movimentação mostra cada saída de consumo com a OS, quem, quando e o saldo antes/depois. A "ponta solta" fica rastreada.

**Gaps / a fazer:**
- (a) Regra: quando produzido, **comissão base = valor do produto** (usar `os_comissoes.tipo` + `valor_base`).
- (b) Peça de consumo **não imprime/fatura** na OS do cliente (filtrar `consumo=true` no print e no faturamento) — a baixa já vai pelo tipo de saída acima.
- (c) (opcional) criar o tipo de saída "Consumo de Produção".
- (d) Front: lançar produto produzido na OS + puxar a composição + apontamento da tapeçaria + peças de consumo.

**🎉 Chão de fábrica — descoberta: a PRODUÇÃO já está quase toda pronta no backend.**
Existem `os_lancar_producao(jsonb)`, `os_distribuir_producao(id_os_peca, id_tecnico)`, `os_producao_concluir(id_os_peca)`. E o `os_producao_concluir` **já faz exatamente o que o Leo pediu**:
- Exige `os_pecas.produzido=true` (só produto de produção entra).
- Calcula custo por **composição** (`produtos_composicao`) OU **real** (soma do consumo vinculado `id_producao`), configurável via `erp_config('op_custo_modo')`.
- **Dá a ENTRADA do produto acabado** (`erp_entrada_estoque`, origem `PRODUCAO_OS`) **+ saída imediata pra OS** (`erp_baixar_estoque`). = a "entrada de produção interna" que o Leo quer. ✅
- Grava kardex + `erp_log` (auditável). ✅

**Requisitos do Leo (16/08) × estado:**
1. **Tag "produto de produção":** `produtos.produzido` já existe; produção exige. Pátio só lança produto com `produzido=true`. **Falta:** restringir/expor essa regra no lançamento pelo pátio.
2. **Produção dá entrada (produção interna):** ✅ **JÁ FAZ** (`os_producao_concluir`). Só talvez rotular a origem `PRODUCAO_OS` como "Produção Interna" nos relatórios.
3. **Pátio lança na hora, mid-serviço** (não espera vendedor) — só produto de produção. **Falta:** botão no Pátio/Apontamento pra adicionar produto produzido (hoje o pátio já solicita peça via `os_patio_solicitar_peca`; é estender pra produto).
4. **Botão "Novo defeito" no pátio** (cliente pede algo na hora → cria defeito → aponta) + **apontar / pausar / terminar**. `os_defeitos` (status ABERTO) e apontamento (hora_inicio/termino) existem. **Falta:** o pátio criar defeito na hora + os 3 botões (pausar = fecha segmento e reabre; múltiplos apontamentos somam).
5. **Status por serviço na Distribuição:** `os_servicos.status` já existe (PENDENTE / EM_ANDAMENTO / EM_EXECUCAO / CONCLUIDO). **Falta:** (a) consolidar EM_ANDAMENTO≈EM_EXECUCAO (duplicado), (b) adicionar **PARADO** + motivo (ex.: "faltou peça"), (c) mostrar na Distribuição pro coordenador ver execução/pronto/pendente/parado.

---

## 2026-08-16 — implantação: piloto Truckprest + registro/NFS-e

- **Registro oficial do ERP:** NÃO. Software de gestão interno não exige registro/homologação. Só a EMISSÃO fiscal precisa de oficial: certificado A1 + credenciamento SEFAZ (NF-e/NFC-e) e Prefeitura (NFS-e) + CSC (NFC-e). Emissão via API terceirizada → homologação é do provedor, não do ERP. Sem PAF-ECF (PR usa NFC-e).
- **NFS-e Umuarama-PR:** sistema PRÓPRIO da prefeitura, padrão **ABRASF 1.00**, certificado **A1**, historicamente via **Ginfes**; exige **inscrição municipal** + CNPJ regular. Transição pro padrão NACIONAL em curso (desde 01/01/2026, por etapas; Umuarama já integra com o Ambiente Nacional mas mantém emissor próprio). Contato ISSQN: (44) 3621-4122. NFE.io lista Umuarama como prefeitura integrada. ⚠️ Truckprest é Simples → confirmar com contador/prefeitura o caminho (próprio vs Emissor Nacional) na data do go-live.
- **PILOTO = Truckprest (decisão do Leo em avaliação):** tem a operação completa (remessa/retorno/OS/solicitação de peças/estoque). PRÓ: exercita quase todos os módulos + é Simples (fiscal mais simples). RESSALVA (GUIA): "piloto pequeno". RECOMENDAÇÃO: rodar a OPERAÇÃO do Truckprest em PARALELO ao Firebird, SEM emitir fiscal no início (OS+peças+estoque primeiro, depois remessa/retorno), e ligar a EMISSÃO fiscal (NFS-e/NF-e) por ÚLTIMO, homologada. Separar operação de emissão de-risca o piloto.

---

## 2026-08-16 — rodada 4: prazo médio + config de condições

- ✅ **Prazo médio por forma — JÁ EXISTE** e é editável em Auxiliares → Formas de Pagamento (`prazo_medio_dias`, por forma). Varia por tipo (cartão/boleto/dinheiro). Leo só não tinha achado a tela.
- 🔴 **Config de CONDIÇÕES de pagamento (30/60/90) — GAP.** Backend tem `condicoes_pagamento` (9 seeded) mas **não há tela** pra criar/editar. → Construir editor em **Auxiliares** (descricao, num_parcelas, intervalo_dias, entrada, libera_limite + parcelas flexíveis via `condicoes_pagamento_parcelas`). Espelhar o CRUD que já existe pras Formas.
- 💡 **Valor do prazo médio = FLUXO DE CAIXA.** Vencimento (condição) = quando o CLIENTE deve. Prazo médio (forma) = quando VOCÊ recebe de fato (cartão: operadora paga ~30d mesmo sendo "à vista" pro cliente). Usar `prazo_medio_dias` pra projetar **data prevista de recebimento** (= data venda + prazo médio da forma) no fluxo de caixa. Melhoria futura.

---

## 2026-08-16 — rodada 2: pagamento / crédito por cliente

### Confirmações (perguntas do Leo)
- **Custo por tipo de entrada — CONFIRMADO ✅.** `tipos_entrada.atualiza_custo`: **COMPRA** e **COMPRA IMPORTAÇÃO** = true (mexem no custo médio); **RETORNO CONSERTO / BONIFICAÇÃO / DEVOLUÇÃO CLIENTE** = false (não tocam o custo). Flag editável por tipo. É o comportamento que ele espera.
- **Regra "cartão/Pix não travam limite" — JÁ é o design ✅.** `formas_pagamento.usa_limite_credito` (cartão/Pix/dinheiro=false; boleto/prazo=true) + `condicoes_pagamento.libera_limite` + `clientes.permite_prazo`. `erp_validar_credito` só checa limite/vencidos e só roda quando a forma consome crédito. (Verificar no fluxo do *faturar* que respeita a flag — a base existe toda.)

### 🔴 Gap A — PERFIS/PADRÕES de pagamento por cliente (o incômodo do Leo)
- **Hoje:** anexa condição cliente a cliente (`clientes_condicoes_pagamento`) — um a um. Sem conceito de "perfil".
- **Spec:** `perfis_pagamento` (nome, padrao_novos_clientes) + `perfis_pagamento_itens` (formas/condições permitidas) + `clientes.id_perfil_pagamento`. Cliente novo nasce com o default. Escolher perfil auto-preenche. Continua podendo sobrescrever no cliente.
  - Ex.: **"Padrão à vista"** → só formas `usa_limite_credito=false` → **sem análise de crédito**. **"30/60/90"** → a prazo (consome limite). **"Padrão Loja"** → misto.
- **Decisão do Leo:** quais **perfis iniciais** + qual o **default** de cliente novo.

### 🔴 Gap B — Validade da consulta de cadastro (re-consulta) — trava na abertura
- **Hoje:** NÃO existe data de última consulta nem validade em `clientes`. Config de crédito vive em `erp_config`.
- **Spec:** `clientes.credito_consultado_em` + `erp_config('credito_validade_consulta_dias')` (ex.: 90). Na abertura de venda/OS, se vencido → trava **"cliente precisa de atualização de cadastro"** → financeiro reconsulta e libera (reusa o **sino**). Ao reconsultar, grava a data.
- **Decisão do Leo:** validade em **dias** (sugestão: 90).

### ✅ Bug "gerar financeiro no faturar → tela branca" — RESOLVIDO
Era o **crash React #62** (th/td do design system são funções, não estavam sendo chamados no faturar). Corrigido 13/08 (`30a2257`) + **ErrorBoundary global** (`c15cf80`) pra nunca mais dar tela totalmente branca.

### Refinamento (16/08) — princípio: AUTONOMIA DO VENDEDOR + tudo editável
- **O perfil decide a autonomia:** perfil só com formas SEM crédito → **vendedor cria e vende sozinho, sem financeiro**. Perfil COM crédito → passa pelo financeiro (limite + sino). O sistema lê isso do próprio perfil.
- **Trava de re-consulta só vale p/ cliente COM crédito** — cliente à vista **não** é incomodado com atualização de cadastro.
- **Tudo editável** numa tela de config: perfis, formas, condições, validade em dias, e o **perfil default de cliente novo** (campo de config global).
- **Ciclo de vida:** cliente nasce à vista (vendedor); depois pode ser "promovido" a crédito via financeiro. Override individual continua possível.
- **Seed proposto (editável):** perfis "À vista" (default, sem crédito), "Loja" (misto), "30/60/90", "30 dias"; validade de consulta = 90 dias.

### Status construção
- ✅ **Notificações (Spec 1) — CONSTRUÍDA** (`35a1e69`, sino unificado + `erp_notificar`).
- ✅ **Perfis de pagamento + trava de re-consulta — CONSTRUÍDO** (`8c82b4e`/`acdbdf4`/`ecdea46`: backend + tela de config + seletor no cliente).

### 📦 Pacote BOQUETA/GÔNDOLA — despachado pra construção (16/08)
Semântica da baixa confirmada: orçamento nunca baixa; **boqueta baixa quando o conferente valida/lança**; gôndola baixa no fechamento (conferência no caixa é auditoria, não trava). Já bate com o motor atual (Separação→Entregar / faturar). Itens: (1) consolidar solicitação em picking; (2) gôndola = centro c/ saldo, só vende o que tem, baixa no fechamento; (3) permissão "gestão de estoque/transferências" atribuível; (4) localização múltipla (Spec 4); (5) follow-up #codigo read-only.

---

## 2026-08-13 — rodada 1

### 1. 💡 Sistema de NOTIFICAÇÕES genérico (sino unificado)
**Ideia (Leo):** aproveitar a base das *liberações remotas* e montar notificações pra várias áreas — **encomenda**, **OS finalizada**, **avisos internos**, etc.

**O que já existe:** tabela `autorizacoes` — e ela já é **quase genérica**: `tipo, modulo, id_empresa, id_solicitante, origem, id_origem, numero_origem, titulo, descricao, detalhes(jsonb), status, id_aprovador, motivo, decidido_em, expira_em`. Já tem o **sino** no topo (`SinoAutorizacoes.jsx`, poll 25s).

**Análise:** `autorizacoes` é orientada a **APROVAÇÃO** (tem aprovador, decisão, expira). Notificação é **INFORMATIVA/broadcast** (tem destinatário + lido/não-lido, sem decisão). Ciclos de vida diferentes → **não empilhar tudo em `autorizacoes`**.

**Recomendação:** criar tabela irmã `notificacoes` (`id, tipo, id_empresa, destinatario/papel, titulo, corpo, origem, id_origem, link, lido_em, criado_em, expira_em`) e **reusar o mesmo sino** como uma **caixa unificada com 2 fluxos**: (a) *"pendências que EXIJO decidir"* = `autorizacoes`; (b) *"avisos"* = `notificacoes`. Uma notificação pode **apontar** pra uma autorização. Gatilhos por evento (encomenda aprovada, OS faturada, etc.) inserem em `notificacoes`.
**Decisão pendente:** destino da notificação — por **usuário**, por **papel/grupo**, ou por **área**? (define o schema do destinatário).

### 2. ✅ Fornecedor vinculado ao produto — JÁ EXISTE
**Ideia (Leo):** temos fornecedor vinculado ao produto?
**Resposta:** **Sim.** Tabela `produto_fornecedores` (`id_fornecedor`, `referencia_fornecedor`, + `principal`). Entregue em 11/08 (seção "Fornecedores" no cadastro do produto — `FornecedoresProduto`, RPC `erp_produto_fornecedores_listar`).
**Ação:** nada a construir. Só **confirmar no uso real** que a UI está mostrando e que dá pra marcar o fornecedor principal.

### 3. 🔴 Código SEQUENCIAL do produto (importar do sistema antigo) — GAP PARCIAL
**Ideia (Leo):** temos `referencia`; precisamos de um **código sequencial** — o mesmo que vamos **importar do sistema antigo** — e isso vale também pra **clientes, fornecedores** etc.

**O que já existe:**
- `clientes.codigo` (integer) ✅ e `fornecedores.codigo` (integer) ✅ — prontos pra receber o CODIGO legado.
- `produtos` tem `id`, `referencia`, `codigo_barras` — **mas NÃO tem uma coluna `codigo`** sequencial. ❌

**Análise/Gap:** o produto **não** preserva o código sequencial do Firebird hoje. `id` é chave técnica (surrogate), não serve como "código do produto" que o balcão digita/importa. Firebird usa `CODIGO` (integer) como código de negócio.

**Recomendação:** adicionar `produtos.codigo` (integer, único por empresa/global) e **garantir na migração** que os 3 (produto/cliente/fornecedor) **importam o CODIGO legado** — sem re-sequenciar, senão quebra referência de quem decorou código. Ligar isso ao pedido do backlog "busca por código" (item 1.2).

### 4. 🔴 LOCALIZAÇÃO — precisamos de mais de uma — GAP
**Ideia (Leo):** localização precisamos de **mais de uma**.

**O que já existe:** `produtos.localizacao` é **um único texto livre**. Existe `centros_estoque` (multi-centro) e `estoque_saldos` por centro.

**O que o Firebird tinha:** `TBL_PRODUTO_DADOS` com **`CHLOCALIZ1..4`** (4 níveis estruturados de localização, por empresa) + `LOCALIZACAO` varchar(80). Ou seja, o legado já era **multi-nível**.

**Análise/Gap:** hoje o novo só guarda 1 localização em texto. Não cobre "mais de uma" nem endereçamento estruturado (rua/prateleira/nível) que acelera o picking na Separação.

**Recomendação:** trocar o texto único por tabela `produtos_localizacao` (`id_produto, id_centro_estoque, endereco/rua/prateleira/nivel, principal`), permitindo **N localizações por produto** (inclusive por centro). Migrar `CHLOCALIZ1..4` do Firebird. Liga com o backlog 1.5 (foto/localização) e com a Separação.

---

### Resumo da rodada 1
| # | Ideia | Estado | Ação |
|---|---|---|---|
| 1 | Notificações genéricas (sino) | 💡 base existe (`autorizacoes`) | criar `notificacoes` irmã + sino unificado |
| 2 | Fornecedor no produto | ✅ pronto | só validar no uso |
| 3 | Código sequencial (import legado) | 🟡 cliente/fornec ok, **produto falta** | add `produtos.codigo` + preservar na migração |
| 4 | Localização múltipla | 🔴 gap | `produtos_localizacao` N por produto/centro |

**Nada disso foi mandado pra construção ainda — está aqui pra discutirmos.**

---

## 2026-08-13 — rodada 1: SPECS prontas p/ construção (aguardando "ok" do Leo)

> Cada uma com um **default recomendado** pra decisão não travar. Tudo reversível.

### Spec 1 — Notificações (sino unificado)
- **Tabela nova** `notificacoes`: `id, tipo, id_empresa, id_destinatario(null), papel_destino(null), area_destino(null), titulo, corpo, origem, id_origem, link_pagina, link_ctx(jsonb), prioridade, lido_em(null), criado_em, expira_em`.
- **Default de destino (recomendado):** **híbrido** — dá pra mandar por **usuário** OU por **papel/grupo** (o mais flexível; começa simples, cresce sem migrar).
- **Sino unificado:** reusa `SinoAutorizacoes.jsx` → 2 abas: **Pendências** (`autorizacoes`, exige decidir) + **Avisos** (`notificacoes`, marca lido). Badge = não-lidas + pendentes.
- **RPCs:** `erp_notificar(jsonb)` (genérica, qualquer módulo dispara), `erp_notificacoes_listar(ator)`, `erp_notificacao_marcar_lida(id, ator)`.
- **Gatilhos iniciais (começar com 3):** encomenda aprovada · OS faturada/finalizada · separação pronta. Depois: título vencido, autorização pendente, avisos internos manuais.
- **Esforço:** baixo-médio (a base do sino já existe).

### Spec 3 — Código sequencial do produto  ⚠️ atualizado: infra já existe
- **A concorrência JÁ está resolvida.** Existe `erp_proximo_numero(entidade, id_empresa)` + tabela `sequencias` + trigger `trg_numero_documento`. A função usa `INSERT … ON CONFLICT DO UPDATE … RETURNING` = **atômica** (trava a linha; dois lançamentos simultâneos pegam números distintos; sem buraco porque é transacional). Todo documento (venda/OS/orçamento/encomenda/título/devolução) já tem coluna `numero` gerada assim, **por empresa**.
- **O que falta pro PRODUTO:** (a) `ALTER TABLE produtos ADD COLUMN codigo integer` + índice único **global** (produto é cadastro base, empresa nula → contador global); (b) gerar via **`erp_proximo_numero('produto')`** — reusar, não reinventar; (c) na migração, **setar o contador pra começar depois do maior CODIGO legado** (`sequencias.ultimo = max(codigo importado)`), pra novo produto continuar a sequência sem colidir.
- **Cliente/fornecedor:** já têm `codigo` — mas hoje usam **sequência nativa** (`clientes_codigo_seq`/`fornecedores_codigo_seq`, que pode dar buraco em rollback). Na migração, `setval` pra continuar do máximo legado. **Decisão menor (a discutir):** se quiser cliente/fornecedor também **gapless** igual aos documentos, unificar os 3 em `erp_proximo_numero`.
- **Liga com** busca por código (backlog 1.2).
- **Esforço:** baixo (1 coluna + reusar a função + ajustar o start na migração).

### Spec 4 — Localização múltipla
- **Tabela nova** `produtos_localizacao`: `id, id_produto, id_centro_estoque, rua, prateleira, nivel, endereco_livre, principal(bool), criado_em`. Permite **N por produto/centro**.
- **Migração:** `CHLOCALIZ1..4` do Firebird (são FKs → resolver contra `TBL_LOCALIZACAO`) viram rua/prateleira/nível; `LOCALIZACAO` varchar → `endereco_livre`. O `produtos.localizacao` (texto único atual) vira o "principal" durante a transição.
- **UI:** aba no produto lista as localizações + marca principal; **Separação** mostra a principal pra acelerar o picking.
- **Esforço:** médio (tabela + migração + UI + tocar Separação).

---

## Capturado — a discutir (sem análise ainda)
- **#5 — Busca de produtos** (a tela do print): a sessão ERP anotou como item #11 dela. Trazer o print/critério (buscar por código + nome + referência + cód. barras, padrão "Nome") pra eu detalhar. Liga com Spec 3 (código) e com backlog 1.2.
