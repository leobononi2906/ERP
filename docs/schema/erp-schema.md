# Schema do ERP Bononi — snapshot (ago/2026)

> **Projeto Supabase:** `vishxwdxqiygbxmtpfoy` · **Schema:** `"Teste ERP"` (com espaço)
> Referência de consulta rápida. A **fonte da verdade** é o banco + `supabase/migrations/`.
> Atualizar quando uma migration alterar o schema. Ver também `docs/STATUS.md`.

## Tabelas principais (colunas-chave)

### clientes
id, tipo_pessoa, tipo, nome, nome_fantasia, cpf_cnpj, email, telefone, celular, whatsapp,
endereco/numero/bairro/cidade/uf/cep, limite_credito, situacao, id_empresa, id_vendedor,
id_condicao_pagamento, id_tabela_preco, perc_desc_produto/servico, **codigo integer**, permite_prazo

### produtos
id, referencia, nome, descricao, codigo_barras, id_grupo, id_subgrupo, id_marca, id_unidade, ncm,
**preco_custo, preco_venda**, estoque_atual/minimo/maximo, situacao, origem, cest, cfop_padrao,
cst_csosn, aliquota_icms, id_grupo_tributario, produzido, bloquear_desconto, controla_estoque, curva_abc

### produtos_composicao  (custo + mão de obra — NÃO baixa estoque)
id, id_produto, tipo(PECA/SERVICO), **id_componente**(produto), **id_servico**, descricao, quantidade, custo_unitario, ordem

### servicos
id, codigo, nome, descricao, preco, unidade, situacao, id_grupo, **valor_hora** (base da MO)

### usuarios
id, nome, login, senha_hash(bcrypt), email, perfil, ativo, ultimo_acesso,
**percentual_comissao, perc_comissao_servico, perc_comissao_peca**, segmento, id_centro_custo

### ordens_servico
id, numero, id_empresa, id_cliente, id_veiculo, id_tipo_os, id_usuario_abertura/responsavel, status,
data_entrada/prevista/saida, km_entrada/saida, defeito_relatado/constatado, solucao,
valor_servicos/pecas/desconto/total/consumo, id_forma_pagamento, id_condicao_pagamento,
cancelada, id_tipo_saida, id_centro_custo, id_vendedor, **id_prisma**

### os_apontamentos
id, id_os, **id_servico_os**, id_colaborador, data_apontamento, hora_inicio/termino, **horas_trabalhadas**,
fator, observacao, id_os_peca, **faturavel**, **id_area**, **id_defeito**

### os_servicos
id, id_os, id_servico, descricao, quantidade, valor_unitario, valor_total, **id_tecnico**, status,
tempo_previsto/realizado, id_area, id_defeito

### os_pecas
id, id_os, id_produto, descricao, quantidade, valor_*, movimentou_estoque, id_tecnico, consumo,
produzido, status, id_area, **custo_composicao**, custo_real

### os_defeitos
id, id_os, codigo, descricao, id_area, **status**(ABERTO/EM_EXECUCAO/PAUSADO/CONCLUIDO)

### os_comissoes
id, id_os, id_vendedor, tipo, percentual, valor_base, valor_comissao, status, data_pagamento

### prismas
id, numero, id_vendedor, id_empresa, ativo

### estoque_saldos
id, id_produto, id_centro, estoque_atual, estoque_reservado, estoque_disponivel, custo_medio, ultima_entrada/saida

### estoque_movimentos
id, id_produto, id_centro, id_empresa, tipo, origem, id_referencia, numero_referencia, quantidade,
custo_unitario, custo_total, estoque_anterior/posterior, id_usuario, observacao, criado_em

### centros_estoque
id, descricao, id_empresa, endereco, principal, ativo, gondola, contabiliza

### log_acessos  (AUDITORIA)
id, id_usuario, modulo, acao, **tabela_afetada, registro_id, dados_anteriores jsonb, dados_novos jsonb**,
ip, criado_em, tipo, mensagem, detalhes

### modulos
id, chave, nome, icone, ordem, **grupo_menu** (categoria da árvore de permissões), ativo

### grupos_acesso / grupos_permissoes / usuarios_grupos
grupo → grupos_permissoes(id_modulo, pode_visualizar/incluir/editar/excluir/aprovar/exportar/ajustar_estoque/dar_desconto)

### formas_pagamento
id, descricao, tipo, modalidade(A_VISTA/A_PRAZO/CARTAO), usa_limite_credito, gera_parcelas, prazo_medio_dias, taxa_juros, ativo

### grupos_produto / subgrupos_produto / grupos_servico(áreas) / unidades
Cadastros auxiliares (aba Cadastros → Auxiliares).

### vendas / vendas_itens / vendas_rateio_financeiro / vendas_comissoes
Venda: cabeçalho + itens (produto/serviço) + rateio contábil + comissões.

### Financeiro
titulos, titulos_baixas, contas_financeiras, contas_movimentos, plano_contas, centros_custo, cheques, condicoes_pagamento.

### Compras / Estoque
pedidos_compra(_itens), cotacoes(_itens/_respostas), compras_recebimento(_itens), nfe_entrada,
estoque_transferencias(_itens), estoque_reservas, inventarios(_itens), solicitacoes_produto, expedicoes(_itens).

### Fiscal
nfe(_itens), nfce, nfse, mdfe, naturezas_operacao, grupos_tributarios, ncm, cst_*, cclasstrib, icms_uf. (NF-e via API externa.)

> Outros sistemas compartilham o Supabase e usam prefixos próprios (cob_, atac_, assist_, ecom_, exp_, frt_…).

## Índice de RPCs do ERP (public.*)

**Auth/Admin/Config:** erp_login · erp_admin_dados · erp_grupo_salvar · erp_grupo_permissoes(_salvar) · erp_usuario_salvar · erp_perm_matrix/set · erp_config_listar/salvar · **erp_historico(p_tabela,p_registro,p_limit)** · erp_log(auditoria: id_usuario,modulo,acao,tabela,registro,anteriores,novos).

**Cadastros:** cliente_salvar (loga) · clientes_dados · **erp_clientes_buscar(campo,termo,empresa,limit)** · produto_salvar (loga) · produtos_dados · **erp_produtos_buscar(campo,termo,limit)** · **servico_salvar(p jsonb, com auditoria + valor_hora)** · servicos_dados · veiculo_salvar · fornecedor_salvar · **erp_aux_cadastros_dados** · erp_forma_pagamento_salvar · erp_unidade_salvar · erp_area_servico_salvar · erp_grupo_produto_salvar · erp_subgrupo_produto_salvar.

**Produto custo/estoque:** **produto_composicao_listar/salvar/excluir** (MO dinâmica) · **erp_consulta_precos** · **erp_produto_estoque_detalhe** (drawer) · erp_estoque_posicao/kardex/ajuste · erp_resolver_preco · erp_preco_cliente_*.

**Vendas:** **venda_salvar (loga)** · venda_lancar_item · venda_solicitar_item · venda_faturar · venda_cancelar · venda_recalcular_precos · vendas_dados · vendas_detalhe_dados · erp_validar_credito · erp_consultar_limite_desconto.

**OS / Pátio:** **os_salvar (loga, p_ator)** · os_dados · os_detalhe_dados · os_defeito_salvar · os_defeitos_listar · os_apontamento_* · **os_servico_criar_de_apontamentos** · os_precificacao_dados · os_apontamento_faturavel · **erp_comissoes_os_dados** · os_faturar (gera os_comissoes) · os_distribuir_servico/producao · os_patio_login/contexto/defeito_acao/solicitar_peca/consumo/tem_apont_aberto · os_prisma_salvar/excluir/atribuir · os_prismas_dados/livres · os_solicitacoes_listar.

**Orçamento:** orcamento_salvar/lancar_item/aprovar/reprovar/converter_venda · orcamentos_dados · orcamentos_detalhe_dados.

**Compras/Estoque ops:** erp_pedido_compra_* · erp_cotacao_* · erp_recebimento_* · erp_entrada_* · erp_transferencia_* · erp_inventario_* · erp_separacao_* · erp_demanda_* · encomenda_*.

**Financeiro:** erp_titulos_listar · erp_titulo_salvar · erp_baixar_titulo · erp_estornar_baixa · erp_gerar_titulos_receber/pagar · erp_abrir/fechar_caixa · erp_movimento_caixa · erp_cheque_* · erp_dre · erp_extrato_conta.

## Componentes de front reutilizáveis
- `src/Hub.jsx` **TabHub** — abas com Alt+←→ / Alt+nº.
- `src/ui.jsx` **BuscaServidor** (busca por campo no servidor), SelectBusca, ModalAprovacao, Campo/Secao/Badge/Aviso, helpers `inp/sel/th/td/btn*`.
- `src/drawers.jsx` **DrawerEstoque** (estoque por empresa/centro + comprando + histórico) e **DrawerHistorico** (auditoria quem/quando/de→para).
