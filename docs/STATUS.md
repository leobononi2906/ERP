# ERP Bononi — Status do projeto (atualizado ago/2026)

> Documento de contexto para **iniciar uma nova conversa** já orientado. Resume o que
> está pronto, o que falta, as regras de negócio e as armadilhas conhecidas.
>
> **▶ Última sessão (12/08/2026):** tabela de preço segue o cliente + validade automática; distribuição c/ horário de lançamento; fix menu RH; **colaborador = mestre da pessoa** (login/CC/empresa na folha); vários orçamentos → mesma OS; **módulo Remessa/Retorno**; guard de permissão nas RPCs novas. **Detalhes, estado da segurança e plano do guard em [`docs/HANDOFF_2026-08-12.md`](HANDOFF_2026-08-12.md).**
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

## Armadilhas conhecidas (não repetir)
- **NUNCA** nomear estado de índice de seleção como `sel` (colide com o helper `sel()` do `ui.jsx` e quebra a tela). Usar `hi`/`linha`/`idxSel`.
- Overload de RPC com mesmo conjunto de args → PGRST203. Ao acrescentar parâmetro, **o front sempre envia o novo param** (ex.: `os_salvar` com `p_ator`, `servico_salvar(p jsonb)`), ou renomear a antiga.
- `clientes.codigo` é **integer** → castar `codigo::text` em ILIKE.
- Status financeiros no banco: `PAGO`, `PAGO_PARCIAL` (não "QUITADO"/"PARCIAL").
