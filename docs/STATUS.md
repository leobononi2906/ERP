# ERP Bononi — Status do projeto

> Atualizado: 2026-09-28

> Documento de contexto para **iniciar uma nova conversa** já orientado. Resume o que
> está pronto, o que falta, as regras de negócio e as armadilhas conhecidas.
>
> 🚧 **O ERP está EM CONSTRUÇÃO e o ambiente é de TESTES — não usar para operação real.**
> Isso passou a aparecer como aviso global no app em 01/09/2026 (`b7030ea`), e é a informação
> mais importante desta página: número visto aqui não é número da empresa.
>
> ⚠️ **`docs/STATUS-ATUAL.md` está SUPERADO** (03/08/2026) e não deve ser lido como estado
> atual — quem procura o estado do projeto lê **este** arquivo. Foi deixado no repo como
> histórico; se causar confusão de novo, apagar.
>
> **▶ Lacuna reconstruída (17/08 → 01/09/2026).** As quatro entradas abaixo foram escritas em
> 15/09/2026 **a partir do git log**, não no calor da sessão: elas dizem *o que* mudou, com o
> commit, mas **não têm os PORQUÊS** que as entradas de handoff têm. O detalhe daquele período
> foi registrado na hora em `CADERNO_IDEIAS.md` e nos `SPEC_*.md` — é lá que está o raciocínio.
>
> **▶ Sessão (01/09/2026):** aviso global de "ERP em construção / ambiente de testes" no app
> (`b7030ea`) — a mudança mais importante do período, porque é o que impede alguém de tomar o
> ERP por sistema em produção.
> **▶ Sessão (25/08/2026):** Financeiro ganhou **classificação** (plano de contas + centro de
> custo) e **DRE por centro**; barra lateral limpa (`f9ad8e4`). Ver `SPEC_CLASSIFICACAO_FINANCEIRA.md`.
> **▶ Sessão (18/08/2026) — a maior leva do período:** **NF em 2 empresas** (split peças ×
> serviços na OS, ver `SPEC_NF_DUAS_EMPRESAS.md`); **Expedição Fase 1** (picking consolidado em
> onda + destino Balcão/Pátio/Expedição na Separação, ver `SPEC_EXPEDICAO_ERP.md`); **PWA
> instalável** e **botão Enviar WhatsApp** em Venda, OS e Orçamento (`SPEC_MOBILE_WHATSAPP.md`
> — mobile/PWA ficou "na agulha" para implantação posterior, decisão do Leo em 18/08);
> **devolução de peça** em OS/venda aberta pelo teclado (atalho D), que tira do documento e
> retorna ao estoque, com as devoluções AGUARDANDO aparecendo na fila; **IPI por empresa**
> (CST + alíquota na aba fiscal); dimensões e peso do produto; transportadora, volumes e peso
> no transporte da NF; ordenação de coluna por clique no cabeçalho.
> **▶ Sessão (17/08/2026):** **Liberar Faturamento** (gate + fila) em OS e Venda; multi-empresa
> com **centro de estoque e conta financeira sempre da empresa**; lançar produção (OP) direto
> pelo pátio; apontamento read-only na OS; editor de condições de pagamento; código sequencial
> de produto e cliente em Venda/OS/Separação; cadastro completo de cliente/produto sobreposto
> na venda; habilidades/áreas do técnico para a distribuição. As quebras achadas na validação
> desse dia estão em `FIX_NOITE.sql` e `RELATORIO_NOITE.md`.
>
> **▶ Sessão (15–16/08/2026):** fix crash faturar (React #62 th/td) + ErrorBoundary + logs unificados; provisão RH automática; migração fiscal (NCM/CNPJs/regimes/planilhas contador); busca produto Código+Nome + código sequencial imutável; **sino unificado de notificações**; **perfis de pagamento + trava de re-consulta de crédito** (autonomia do vendedor). Detalhes e PORQUÊS em [`docs/HANDOFF_2026-08-16.md`](HANDOFF_2026-08-16.md).
> **▶ Sessão (12/08/2026):** tabela de preço segue o cliente + validade automática; distribuição c/ horário de lançamento; fix menu RH; **colaborador = mestre da pessoa** (login/CC/empresa na folha); vários orçamentos → mesma OS; **módulo Remessa/Retorno**; guard de permissão nas RPCs novas. **Detalhes, estado da segurança e plano do guard em [`docs/HANDOFF_2026-08-12.md`](HANDOFF_2026-08-12.md).**
> **▶ Sessão anterior (11/08/2026):** segurança (Furo #1 e #2-camada1), autorização remota (sino), cotação + produto×fornecedor — [`docs/HANDOFF_2026-08-11.md`](HANDOFF_2026-08-11.md).

## Repositórios e infra (não confundir)
- **Front do ERP (o app de verdade):** `leobononi2906/ERP` — React + Vite (inline styles + objeto `C` do `config.js`, **não** Tailwind). Páginas em `src/pages/*.jsx`, menu/rotas em `src/App.jsx`, UI em `src/ui.jsx`, componentes reutilizáveis em `src/Hub.jsx` e `src/drawers.jsx`, migrations em `supabase/migrations/`.
- ❌ A pasta `erp/` em `leobononi2906/assistencia` é protótipo HTML **descontinuado**. Não é o app.
- **Banco:** Supabase projeto `vishxwdxqiygbxmtpfoy`, schema **`"Teste ERP"`** (com espaço, entre aspas). RPCs expostas em `public.*` (SECURITY DEFINER) e chamadas via `rpc(fn, body)`.
- **Deploy:** push na `main` → Vercel auto-deploy (projeto `erp`, `erp-five-chi.vercel.app`). **Em fase de teste: deploy direto na main sem pedir confirmação** para o que já foi combinado; rodar `npx vite build` antes. Só confirmar DDL destrutivo (DROP/DELETE de dados).
- Snapshot de tabelas e RPCs: `docs/schema/erp-schema.md`.

## Navegação (menu) — hubs de abas (`src/Hub.jsx` `TabHub`, Alt+←→ / Alt+nº)
- **Comercial:** Orçamentos · Vendas · **Consulta de Preços** · OS · Devoluções · Encomendas · Promoções
- **Serviços** (1 item, abas): Distribuição · Pátio · Precificação · Solicitações · **Comissões**
- **Cadastros** (1 item, abas): Clientes · Produtos · Veículos · **Auxiliares** (sub-abas: Formas de Pagamento, Unidades, Áreas de Serviço, Grupos/Subgrupos de Produto, Serviços(catálogo), Tipos de Operação, Preços Especiais, Prismas)
- Estoque · Compras · Financeiro · Relatórios · Sistema(Administração)

## Módulos prontos (destaques recentes)
- **F5 não desloga nem volta para o Dashboard** (28/09/2026, skill `manter-tela-ao-atualizar`): `usuario` (retorno do `login_erp`, sem senha/token) e a página ficam em `sessionStorage` (`erp:usuario`, `erp:ultima-pagina`) e são reidratados no mount. A página salva só vale se `paginaPermitida()` (mesma regra do menu) aprovar para o usuário atual; senão, Dashboard. O Sair limpa as duas. `sessionStorage` de propósito: fechar o navegador não passa a tela para o próximo usuário.
- **Pátio/Serviço:** prismas por vendedor (pool, liberados ao faturar), login de pátio (prisma+colaborador+senha, sessão curta), defeito como unidade de trabalho (status), apontamento Entrada/Pausa/Retomar/Finalizar (teclado), solicitação de peça/consumo. RPCs `os_patio_*`, `os_prisma*`.
- **Precificação:** seleciona apontamentos por **checkbox** (pode misturar áreas na mesma OS) com **somatória de horas ao vivo** e vincula num serviço (`os_servico_criar_de_apontamentos`). Toggle faturável por linha.
- **Comissão de serviço por apontamento** (Serviços→Comissões): `erp_comissoes_os_dados` rateia o valor do serviço proporcional às **horas faturáveis** de cada colaborador × **% comissão serviço de cada um**. Não depende do `id_tecnico` único.
- **Produtos → Composição de custo + Mão de obra:** `produtos_composicao` (peças + serviços), **só para custo/comissão, não baixa estoque**. Serviço tem `valor_hora`; **MO = horas × valor/hora**, **dinâmica** (muda no serviço → muda o MO de todos os produtos). RPCs `produto_composicao_*`, `erp_aux_cadastros_dados`.
- **Consulta de Preços (Comercial):** `erp_consulta_precos` (busca por campo: nome/referência/cód. barras) mostra preço + disponível.
- **Drawer de estoque** (`src/drawers.jsx` `DrawerEstoque`, RPC `erp_produto_estoque_detalhe`): saldo por empresa/centro, **comprando** (pedidos abertos), **histórico** de entradas/saídas. Usado em Consulta de Preços, Estoque, e na escolha de produto em Vendas e OS.
- **Busca servidor por campo** (`ui.jsx` `BuscaServidor`): clientes (`erp_clientes_buscar`) e produtos (`erp_produtos_buscar`) — leve p/ 50 usuários e muitos registros.
- **Vendas numa página só:** dados viram cabeçalho editável (colapsável) + itens + faturar na mesma tela, header em faixa forte.
- **Permissões em árvore:** grupo → categoria de aba (usa `modulos.grupo_menu`) → telas com Ver/Criar/Editar/Excluir/Aprovar/Exportar (+Aj.Est/Desc). "Liberar tudo/Limpar" por categoria. Configurações em seções.

## Auditoria / Logs (`log_acessos`, RPC `erp_historico`, drawer `DrawerHistorico`)
Grava **quem/quando/de→para**. **Já logam:** produtos, clientes, serviços, **vendas** (`venda_salvar`), **OS** (`os_salvar` com `p_ator`). Botão **Histórico** nas telas de Produto, Cliente, Serviço, Venda e OS. Também há `log_acessos.tipo='ERRO'` (frontend/erros).

## Pendências / próximos passos sugeridos
- **Auditoria:** estender aos **itens** (venda_lancar_item, os_lancar_peca, baixas de título) e a Pedidos de Compra, se o Leo quiser rastrear item a item.
- **Comissão:** confirmar regra de % — hoje usa `perc_comissao_servico` **de cada colaborador**; alternativa seria **% fixo por serviço** dividido entre eles.
- **Cabeçalho forte + página única**: aplicar o mesmo padrão da Venda na **OS** e no **Orçamento** (consistência).
- **Consumo/estoque:** decisão maior pendente — "lançou na OS/venda já baixa do estoque" (hoje consumo segue a baixa no faturamento).
- **Aplicar grupo de acesso em massa** (ex.: grupo "Vendedores" para vários usuários de uma vez) — hoje é usuário a usuário.
- Índices trigram (pg_trgm) para busca por nome quando a base crescer.

## Documentação

Os `HANDOFF_*.md` carregam os **porquês** de cada sessão e são citados nos blocos "▶ Sessão" no
topo. Os demais, por assunto:

| Arquivo | Conteúdo | Quando abrir |
|---|---|---|
| `00_COMECE_AQUI.md` | onboarding do projeto (~20 min), com o mapa e os buracos onde todo mundo tropeça, e a ordem de leitura no fim | **primeiro documento** para quem chega no ERP |
| `GLOSSARIO.md` | o "internês" da empresa + termos técnicos e fiscais; o que está em negrito é jargão interno, não padrão de mercado | quando um termo no código ou numa conversa não fizer sentido |
| `BACKLOG.md` (05/08) | backlog consolidado do review do Leo, reconciliado com o que já existe | ao planejar o que vem depois |
| `CADERNO_IDEIAS.md` | o caderno vivo de gestão e implantação — é aqui que as filas de pedido do Leo foram anotadas na hora | **para o raciocínio de 17–18/08**, que não está nos blocos do topo |
| `FISCAL_TRIBUTARIO.md` (11/08) | régua fiscal completa e de-para ERP × Firebird: multi-empresa PR/SC, revenda, importação, ISS de instalação, emissão por API terceirizada | antes de mexer em NCM, CST, regime ou emissão |
| `DOSSIE_FINANCEIRO.md` | guia de **discussão** do Financeiro para implantação: item por item, com a decisão a marcar e o molde do relatório de volta | antes de decidir escopo do Financeiro com o Leo |
| `FOTOS_PRODUTO.md` (17/08) | decisão do Leo: foto de produto **não** vem do Bling, vai morar no servidor interno do grupo | antes de implementar foto de produto |
| `FIX_NOITE.sql` + `RELATORIO_NOITE.md` | as quebras achadas na validação de 17/08 e as correções aplicadas | para entender o que quebrou naquela leva e como foi consertado |
| ~~`STATUS-ATUAL.md`~~ (03/08) | resumo antigo de continuidade | ⚠️ **superado** — o estado atual é este arquivo. Mantido só como histórico |

**Implantação e go-live** (o ERP ainda não opera de verdade — ver o aviso no topo):

| Arquivo | Conteúdo | Quando abrir |
|---|---|---|
| `GUIA-PRODUCAO-ERP.md` | como pôr o ERP no ar **sem parar a empresa**, escrito para quem decide, não para quem programa: roteiro de obra, cada etapa pronta antes da próxima | antes de qualquer conversa de go-live |
| `IMPLANTACAO_TRUCKPREST.md` | roteiro de virada do **primeiro piloto**: Truckprest (empresa id 5, PR, Simples Nacional) | ao preparar o piloto |
| `PLANO_DISTRIBUICAO_OS_ACESSORIO.md` | usar a distribuição/apontamento de OS como **acessório do sistema legado**, sem migrar o ERP inteiro | quando a pergunta for "dá para aproveitar isso sem virar tudo?" |
| `INTEGRACOES_EXTERNAS.md` (18/08) | como o ERP recebe dado de fora (Bling, ML, marketplaces). Descoberta central: **não é do zero** — o grupo já tem essa cadeia | antes de desenhar integração nova; ver também o repo `bononi-integrador` |

**Fiscal, financeiro e RH:**

| Arquivo | Conteúdo | Quando abrir |
|---|---|---|
| `MIGRACAO_FISCAL_FIREBIRD.md` (13/08) | mapa e brief de execução da migração fiscal Firebird → ERP novo (análise, não construção) | junto com o `FISCAL_TRIBUTARIO.md` |
| `RASCUNHO_PLANO_CONTAS.md` | as 33 contas que já existem + o que falta para o negócio do grupo. **Nada aplicado no banco** — é rascunho para o contador ajustar | antes de mexer em plano de contas |
| `RH_DP.md` (11/08) | pesquisa fiscal-legal do módulo de RH/DP, com valores vigentes confirmados em fonte oficial na data-base | antes de mexer em folha, provisão ou encargo. ⚠️ Valor de tabela vence: conferir a vigência antes de usar |
| `SEGURANCA_FURO2_JWT.md` | o **Furo #2** (permissão por módulo) e o plano em 2 camadas. As RPCs rodam com a chave anon como `SECURITY DEFINER` e hoje **confiam no `_ator` que o front envia** — quem chamar a RPC direto contorna a permissão | **antes de criar RPC nova**, e antes de qualquer conversa sobre pôr o ERP em operação real |

**Guias de uso:**

| Arquivo | Conteúdo | Quando abrir |
|---|---|---|
| `GUIA_PECAS_OS.md` (17/08) | onde se adiciona peça numa OS — a peça **não** entra na tela de criação, entra depois que a OS existe. Nasceu de uma dúvida real do Leo | quando alguém não achar onde lançar peça |
| `GUIA-PRODUCAO-ERP.md` §Produção e `GUIA_PECAS_OS.md` §Produção | ordem de produção (OP) e composição/BOM | ao mexer em produção |

## Armadilhas conhecidas (não repetir)
- **`th` e `td` de `ui.jsx` são FUNÇÕES** (`th(right)`, `td()`), não objetos. Usar sempre `style={td()}` / `style={{ ...td(), ... }}`. Passar `style={td}` (a função) dispara **React error #62** ("style expects a mapping, not a string") e **derruba o app inteiro** (tela branca). Foi a causa do crash ao faturar venda com parcelas/rateio (13/08). Crash de render NÃO cai em try/catch — só no `window.onerror` global (grava em `erp_logs_frontend`, ver via `erp_logs_erros`), NÃO em `log_acessos`.
- **NUNCA** nomear estado de índice de seleção como `sel` (colide com o helper `sel()` do `ui.jsx` e quebra a tela). Usar `hi`/`linha`/`idxSel`.
- Overload de RPC com mesmo conjunto de args → PGRST203. Ao acrescentar parâmetro, **o front sempre envia o novo param** (ex.: `os_salvar` com `p_ator`, `servico_salvar(p jsonb)`), ou renomear a antiga.
- `clientes.codigo` é **integer** → castar `codigo::text` em ILIKE.
- Status financeiros no banco: `PAGO`, `PAGO_PARCIAL` (não "QUITADO"/"PARCIAL").
