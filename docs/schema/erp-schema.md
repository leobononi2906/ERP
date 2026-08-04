# ERP — Snapshot do Schema (Supabase)

> **Projeto Supabase:** `vishxwdxqiygbxmtpfoy` · **Schema:** `Teste ERP`
> Referência de consulta rápida. A **fonte da verdade das mudanças** é `supabase/migrations/`.
> Atualizar este arquivo sempre que uma migration alterar o schema.
> Total de tabelas: **144**

---

## Tabelas (schema `Teste ERP`)

### agenda_revisoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".agenda_revisoes_id_seq'::regclass)
  - id_veiculo : integer NOT NULL
  - id_cliente : integer
  - id_os : integer
  - data_retorno : date NOT NULL
  - km_retorno : numeric
  - descricao : text
  - notificado : boolean DEFAULT false
  - concluido : boolean DEFAULT false
  - criado_em : timestamp without time zone DEFAULT now()

### caixas_movimentos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".caixas_movimentos_id_seq'::regclass)
  - id_sessao : integer NOT NULL
  - tipo : character varying NOT NULL
  - id_titulo_baixa : integer
  - id_forma_pagamento : integer
  - id_plano_conta : integer
  - id_centro_custo : integer
  - valor : numeric NOT NULL
  - descricao : character varying
  - id_usuario : integer NOT NULL
  - criado_em : timestamp without time zone DEFAULT now()

### caixas_sessoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".caixas_sessoes_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - id_conta_financeira : integer NOT NULL
  - id_usuario_abertura : integer NOT NULL
  - data_abertura : timestamp without time zone NOT NULL DEFAULT now()
  - valor_abertura : numeric NOT NULL DEFAULT 0
  - status : character varying NOT NULL DEFAULT 'ABERTO'::character varying
  - id_usuario_fechamento : integer
  - data_fechamento : timestamp without time zone
  - valor_sistema : numeric
  - valor_contado : numeric
  - diferenca : numeric
  - observacao : text

### cargos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cargos_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - ativo : boolean DEFAULT true

### cclasstrib
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cclasstrib_id_seq'::regclass)
  - codigo : character varying NOT NULL
  - descricao : character varying
  - cst_ibscbs : character varying

### centros_custo
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".centros_custo_id_seq'::regclass)
  - codigo : character varying NOT NULL
  - descricao : character varying NOT NULL
  - id_empresa : integer
  - id_pai : integer
  - ativo : boolean DEFAULT true

### centros_estoque
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".centros_estoque_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - endereco : character varying
  - principal : boolean DEFAULT false
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()
  - gondola : boolean NOT NULL DEFAULT false
  - contabiliza : boolean NOT NULL DEFAULT true

### certificados_digital
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".certificados_digital_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - descricao : character varying
  - numero_serie : character varying
  - validade : date
  - arquivo_pfx : text
  - senha_hash : character varying
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()

### cheques
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cheques_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - id_conta_financeira : integer
  - id_cliente : integer
  - tipo : character varying NOT NULL
  - banco : character varying
  - agencia : character varying
  - conta : character varying
  - numero : character varying NOT NULL
  - valor : numeric NOT NULL
  - data_emissao : date
  - data_bom_para : date
  - status : character varying DEFAULT 'CARTEIRA'::character varying
  - motivo_devolucao : character varying
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - id_titulo : integer

### clientes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".clientes_id_seq'::regclass)
  - tipo_pessoa : character DEFAULT 'J'::bpchar
  - tipo : character varying DEFAULT 'CLIENTE'::character varying
  - nome : character varying NOT NULL
  - nome_fantasia : character varying
  - cpf_cnpj : character varying
  - rg_ie : character varying
  - inscricao_municipal : character varying
  - email : character varying
  - telefone : character varying
  - celular : character varying
  - whatsapp : character varying
  - endereco : character varying
  - numero : character varying
  - complemento : character varying
  - bairro : character varying
  - id_municipio : integer
  - cidade : character varying
  - uf : character
  - cep : character varying
  - observacao : text
  - limite_credito : numeric DEFAULT 0
  - situacao : character varying DEFAULT 'ATIVO'::character varying
  - id_empresa : integer
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - indicador_ie : smallint DEFAULT 9
  - inscricao_suframa : character varying
  - iss_retido : boolean DEFAULT false
  - email_nfe : character varying
  - id_vendedor : integer
  - id_condicao_pagamento : integer
  - id_tabela_preco : integer
  - id_transportadora : integer
  - perc_desc_produto : numeric DEFAULT 0
  - perc_desc_servico : numeric DEFAULT 0
  - endereco_cob : character varying
  - numero_cob : character varying
  - bairro_cob : character varying
  - cidade_cob : character varying
  - uf_cob : character varying
  - cep_cob : character varying
  - codigo : integer NOT NULL
  - permite_prazo : boolean NOT NULL DEFAULT false

### clientes_condicoes_pagamento
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".clientes_condicoes_pagamento_id_seq'::regclass)
  - id_cliente : integer NOT NULL
  - id_condicao_pagamento : integer NOT NULL
  - criado_em : timestamp without time zone DEFAULT now()

### clientes_contatos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".clientes_contatos_id_seq'::regclass)
  - id_cliente : integer NOT NULL
  - nome : character varying NOT NULL
  - cargo : character varying
  - email : character varying
  - telefone : character varying
  - celular : character varying
  - principal : boolean DEFAULT false
  - ativo : boolean DEFAULT true
  - cpf : character varying
  - data_nascimento : date

### clientes_creditos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".clientes_creditos_id_seq'::regclass)
  - id_cliente : integer NOT NULL
  - id_empresa : integer
  - origem : text DEFAULT 'DEVOLUCAO'::text
  - id_origem : integer
  - valor : numeric NOT NULL DEFAULT 0
  - saldo : numeric NOT NULL DEFAULT 0
  - status : text NOT NULL DEFAULT 'ATIVO'::text
  - observacao : text
  - id_usuario : integer
  - criado_em : timestamp with time zone DEFAULT now()

### cobranca_acoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cobranca_acoes_id_seq'::regclass)
  - id_empresa : integer
  - id_cliente : integer NOT NULL
  - id_titulo : integer
  - id_usuario : integer
  - tipo : character varying NOT NULL DEFAULT 'CONTATO'::character varying
  - canal : character varying
  - descricao : text
  - data_promessa : date
  - valor_promessa : numeric
  - data_acao : timestamp without time zone DEFAULT now()
  - criado_em : timestamp without time zone DEFAULT now()

### cobranca_acordos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cobranca_acordos_id_seq'::regclass)
  - numero : character varying
  - id_empresa : integer NOT NULL
  - id_cliente : integer NOT NULL
  - id_usuario : integer
  - data_acordo : date NOT NULL DEFAULT CURRENT_DATE
  - valor_original : numeric NOT NULL
  - valor_juros : numeric NOT NULL DEFAULT 0
  - valor_multa : numeric NOT NULL DEFAULT 0
  - valor_entrada : numeric NOT NULL DEFAULT 0
  - valor_financiado : numeric NOT NULL
  - qtd_parcelas : integer NOT NULL
  - observacao : text
  - status : character varying NOT NULL DEFAULT 'ATIVO'::character varying
  - criado_em : timestamp without time zone DEFAULT now()

### cobranca_acordos_origem
  - id_acordo : integer NOT NULL
  - id_titulo : integer NOT NULL
  - valor_saldo : numeric

### cobranca_config
  - id_empresa : integer NOT NULL
  - beneficiario_nome : character varying
  - beneficiario_cidade : character varying
  - pix_chave : character varying
  - pix_tipo : character varying
  - juros_mes : numeric NOT NULL DEFAULT 1.0
  - multa_pct : numeric NOT NULL DEFAULT 2.0
  - carencia_dias : integer NOT NULL DEFAULT 0
  - instrucoes : text
  - banco_codigo : character varying
  - agencia : character varying
  - conta : character varying
  - convenio : character varying
  - carteira : character varying
  - cedente_codigo : character varying
  - atualizado_em : timestamp without time zone DEFAULT now()

### cobranca_regua
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cobranca_regua_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - dias_de : integer NOT NULL
  - dias_ate : integer NOT NULL
  - acao : character varying
  - cor : character varying
  - ativo : boolean NOT NULL DEFAULT true

### cobranca_templates
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cobranca_templates_id_seq'::regclass)
  - id_empresa : integer
  - canal : character varying NOT NULL DEFAULT 'WHATSAPP'::character varying
  - descricao : character varying NOT NULL
  - faixa_de : integer NOT NULL DEFAULT '-9999'::integer
  - faixa_ate : integer NOT NULL DEFAULT 9999
  - assunto : character varying
  - mensagem : text NOT NULL
  - ativo : boolean NOT NULL DEFAULT true

### compras_recebimento
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".compras_recebimento_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_fornecedor : integer NOT NULL
  - id_pedido : integer
  - id_usuario : integer
  - id_centro_estoque : integer
  - numero_nf_fornecedor : character varying
  - serie_nf : character varying
  - data_emissao_nf : date
  - data_recebimento : timestamp without time zone DEFAULT now()
  - valor_produtos : numeric DEFAULT 0
  - valor_frete : numeric DEFAULT 0
  - valor_ipi : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - id_tipo_entrada : integer
  - valor_icms_st : numeric DEFAULT 0
  - valor_outras : numeric DEFAULT 0
  - status : character varying DEFAULT 'DIGITACAO'::character varying
  - chave_nfe : character varying
  - id_condicao_pagamento : integer
  - id_centro_custo : integer
  - conferida : boolean NOT NULL DEFAULT false
  - conferido_por : integer
  - conferido_em : timestamp without time zone
  - conferencia_cega : boolean NOT NULL DEFAULT true

### compras_recebimento_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".compras_recebimento_itens_id_seq'::regclass)
  - id_recebimento : integer NOT NULL
  - id_produto : integer NOT NULL
  - id_pedido_item : integer
  - descricao : character varying NOT NULL
  - quantidade : numeric DEFAULT 1
  - valor_unitario : numeric DEFAULT 0
  - valor_ipi : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - id_centro_estoque : integer
  - movimentou_estoque : boolean DEFAULT false
  - valor_icms_st : numeric DEFAULT 0
  - custo_unitario_final : numeric
  - quantidade_conferida : numeric

### conciliacoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".conciliacoes_id_seq'::regclass)
  - id_conta_financeira : integer NOT NULL
  - id_usuario : integer
  - data_inicio : date NOT NULL
  - data_fim : date NOT NULL
  - saldo_extrato : numeric DEFAULT 0
  - saldo_sistema : numeric DEFAULT 0
  - diferenca : numeric
  - status : character varying DEFAULT 'ABERTA'::character varying
  - criado_em : timestamp without time zone DEFAULT now()

### condicoes_pagamento
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".condicoes_pagamento_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - num_parcelas : integer DEFAULT 1
  - intervalo_dias : integer DEFAULT 30
  - entrada : boolean DEFAULT false
  - ativo : boolean DEFAULT true
  - libera_limite : boolean NOT NULL DEFAULT false

### condicoes_pagamento_parcelas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".condicoes_pagamento_parcelas_id_seq'::regclass)
  - id_condicao_pagamento : integer NOT NULL
  - numero_parcela : integer NOT NULL
  - prazo_dias : integer NOT NULL DEFAULT 0
  - percentual : numeric NOT NULL DEFAULT 0

### configuracoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".configuracoes_id_seq'::regclass)
  - id_empresa : integer
  - chave : character varying NOT NULL
  - valor : character varying NOT NULL
  - descricao : character varying
  - atualizado_em : timestamp without time zone DEFAULT now()
  - id_usuario_atualizacao : integer

### contas_financeiras
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".contas_financeiras_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - tipo : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - banco : character varying
  - agencia : character varying
  - conta : character varying
  - digito : character varying
  - saldo_inicial : numeric DEFAULT 0
  - saldo_atual : numeric DEFAULT 0
  - data_saldo_inicial : date DEFAULT CURRENT_DATE
  - principal : boolean DEFAULT false
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()

### contas_movimentos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".contas_movimentos_id_seq'::regclass)
  - id_conta_financeira : integer NOT NULL
  - id_titulo : integer
  - id_usuario : integer
  - tipo : character varying NOT NULL
  - origem : character varying
  - descricao : character varying NOT NULL
  - valor : numeric NOT NULL
  - saldo_anterior : numeric DEFAULT 0
  - saldo_posterior : numeric DEFAULT 0
  - data_movimento : date NOT NULL DEFAULT CURRENT_DATE
  - conciliado : boolean DEFAULT false
  - data_conciliacao : date
  - criado_em : timestamp without time zone DEFAULT now()
  - id_titulo_baixa : integer
  - id_plano_conta : integer
  - id_centro_custo : integer
  - estornado : boolean DEFAULT false

### cores
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cores_id_seq'::regclass)
  - descricao : character varying NOT NULL

### cotacoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cotacoes_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_usuario : integer
  - status : character varying DEFAULT 'ABERTA'::character varying
  - data_emissao : date DEFAULT CURRENT_DATE
  - data_validade : date
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()

### cotacoes_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cotacoes_itens_id_seq'::regclass)
  - id_cotacao : integer NOT NULL
  - id_produto : integer NOT NULL
  - quantidade : numeric DEFAULT 1
  - id_unidade : integer
  - observacao : text

### cotacoes_respostas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cotacoes_respostas_id_seq'::regclass)
  - id_cotacao : integer NOT NULL
  - id_fornecedor : integer NOT NULL
  - id_produto : integer NOT NULL
  - preco_unitario : numeric DEFAULT 0
  - prazo_entrega_dias : integer DEFAULT 0
  - condicao_pagamento : character varying
  - selecionado : boolean DEFAULT false
  - observacao : text

### cst_ibscbs
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cst_ibscbs_id_seq'::regclass)
  - codigo : character varying NOT NULL
  - descricao : character varying

### cst_is
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".cst_is_id_seq'::regclass)
  - codigo : character varying NOT NULL
  - descricao : character varying

### curva_abc
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".curva_abc_id_seq'::regclass)
  - ano : integer NOT NULL
  - mes : integer NOT NULL
  - id_empresa : integer
  - id_produto : integer NOT NULL
  - faturamento : numeric NOT NULL DEFAULT 0
  - quantidade : numeric NOT NULL DEFAULT 0
  - custo : numeric NOT NULL DEFAULT 0
  - margem : numeric NOT NULL DEFAULT 0
  - participacao : numeric NOT NULL DEFAULT 0
  - participacao_acum : numeric NOT NULL DEFAULT 0
  - classe : character NOT NULL DEFAULT 'C'::bpchar
  - posicao : integer
  - gerado_em : timestamp without time zone DEFAULT now()

### departamentos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".departamentos_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - ativo : boolean DEFAULT true

### devolucoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".devolucoes_id_seq'::regclass)
  - numero : text
  - id_empresa : integer
  - origem : text NOT NULL
  - id_origem : integer
  - numero_origem : text
  - id_cliente : integer
  - data_devolucao : date DEFAULT CURRENT_DATE
  - valor_total : numeric DEFAULT 0
  - status : text NOT NULL DEFAULT 'DIGITACAO'::text
  - motivo : text
  - observacao : text
  - id_centro_estoque : integer
  - forma_credito : text DEFAULT 'CREDITO_CLIENTE'::text
  - id_credito : integer
  - numero_nf : text
  - serie_nf : text
  - chave_nfe : text
  - id_usuario : integer
  - criado_em : timestamp with time zone DEFAULT now()
  - atualizado_em : timestamp with time zone DEFAULT now()

### devolucoes_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".devolucoes_itens_id_seq'::regclass)
  - id_devolucao : integer NOT NULL
  - id_produto : integer
  - descricao : text
  - quantidade : numeric NOT NULL DEFAULT 0
  - valor_unitario : numeric NOT NULL DEFAULT 0
  - valor_total : numeric NOT NULL DEFAULT 0
  - id_item_origem : integer
  - id_centro_estoque : integer
  - movimentou_estoque : boolean DEFAULT false

### dre_config
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".dre_config_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - id_plano_conta : integer
  - tipo : character varying
  - ordem : integer DEFAULT 0
  - formula : character varying
  - ativo : boolean DEFAULT true

### empresas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".empresas_id_seq'::regclass)
  - nome : character varying NOT NULL
  - nome_fantasia : character varying
  - cnpj : character varying
  - inscricao_estadual : character varying
  - inscricao_municipal : character varying
  - endereco : character varying
  - numero : character varying
  - complemento : character varying
  - bairro : character varying
  - cidade : character varying
  - uf : character
  - cep : character varying
  - telefone : character varying
  - email : character varying
  - ativa : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - id_empresa_precos : integer

### encomendas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".encomendas_id_seq'::regclass)
  - numero : character varying
  - id_empresa : integer
  - origem : character varying NOT NULL
  - id_venda : integer
  - id_os : integer
  - id_produto : integer
  - descricao : character varying
  - quantidade : numeric DEFAULT 1
  - status : character varying DEFAULT 'COTACAO'::character varying
  - id_vendedor : integer
  - id_comprador : integer
  - id_fornecedor : integer
  - valor_custo : numeric
  - prazo_dias : integer
  - valor_venda : numeric
  - id_pedido_compra : integer
  - id_venda_item : integer
  - id_os_peca : integer
  - custo_real : numeric
  - observacao : text
  - motivo_cancelamento : text
  - criado_em : timestamp without time zone DEFAULT now()
  - cotado_em : timestamp without time zone
  - aprovado_em : timestamp without time zone
  - recebido_em : timestamp without time zone

### estoque_movimentos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".estoque_movimentos_id_seq'::regclass)
  - id_produto : integer NOT NULL
  - id_centro : integer NOT NULL
  - id_empresa : integer
  - tipo : character varying NOT NULL
  - origem : character varying
  - id_referencia : integer
  - numero_referencia : character varying
  - quantidade : numeric NOT NULL
  - custo_unitario : numeric DEFAULT 0
  - custo_total : numeric DEFAULT 0
  - estoque_anterior : numeric DEFAULT 0
  - estoque_posterior : numeric DEFAULT 0
  - id_usuario : integer
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()

### estoque_reservas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".estoque_reservas_id_seq'::regclass)
  - id_produto : integer NOT NULL
  - id_centro : integer NOT NULL
  - quantidade : numeric NOT NULL
  - origem : character varying
  - id_referencia : integer
  - data_previsao : date
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()

### estoque_saldos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".estoque_saldos_id_seq'::regclass)
  - id_produto : integer NOT NULL
  - id_centro : integer NOT NULL
  - estoque_atual : numeric DEFAULT 0
  - estoque_reservado : numeric DEFAULT 0
  - estoque_disponivel : numeric
  - custo_medio : numeric DEFAULT 0
  - ultima_entrada : timestamp without time zone
  - ultima_saida : timestamp without time zone

### estoque_transferencias
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".estoque_transferencias_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_centro_origem : integer NOT NULL
  - id_centro_destino : integer NOT NULL
  - id_usuario : integer
  - status : character varying DEFAULT 'PENDENTE'::character varying
  - data_transferencia : timestamp without time zone DEFAULT now()
  - data_recebimento : timestamp without time zone
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()

### estoque_transferencias_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".estoque_transferencias_itens_id_seq'::regclass)
  - id_transferencia : integer NOT NULL
  - id_produto : integer NOT NULL
  - quantidade_solicitada : numeric DEFAULT 0
  - quantidade_enviada : numeric DEFAULT 0
  - quantidade_recebida : numeric DEFAULT 0
  - observacao : text

### expedicoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".expedicoes_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_venda : integer
  - id_os : integer
  - id_usuario : integer
  - id_centro_estoque : integer
  - status : character varying DEFAULT 'SOLICITADA'::character varying
  - data_previsao : date
  - data_expedicao : timestamp without time zone
  - transportadora : character varying
  - rastreamento : character varying
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - id_orcamento_venda : integer
  - id_os_orcamento : integer
  - id_solicitante : integer
  - id_separador : integer
  - data_solicitacao : timestamp without time zone DEFAULT now()
  - data_separacao : timestamp without time zone
  - data_entrega : timestamp without time zone
  - entregue_para : character varying

### expedicoes_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".expedicoes_itens_id_seq'::regclass)
  - id_expedicao : integer NOT NULL
  - id_produto : integer NOT NULL
  - id_venda_item : integer
  - quantidade_pedida : numeric DEFAULT 0
  - quantidade_separada : numeric DEFAULT 0
  - quantidade_expedida : numeric DEFAULT 0
  - observacao : text
  - valor_unitario : numeric DEFAULT 0
  - id_os_peca : integer
  - motivo_falta : character varying
  - observacao_falta : text
  - id_venda_perdida : integer
  - ajuste_resolvido : boolean DEFAULT false
  - consumo : boolean DEFAULT false

### fabricantes_veiculo
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".fabricantes_veiculo_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - ativo : boolean DEFAULT true

### formas_pagamento
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".formas_pagamento_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - tipo : character varying NOT NULL
  - modalidade : character varying NOT NULL DEFAULT 'A_VISTA'::character varying
  - usa_limite_credito : boolean DEFAULT false
  - gera_parcelas : boolean DEFAULT false
  - prazo_medio_dias : integer DEFAULT 0
  - taxa_juros : numeric DEFAULT 0
  - ativo : boolean DEFAULT true

### fornecedores
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".fornecedores_id_seq'::regclass)
  - nome : character varying NOT NULL
  - nome_fantasia : character varying
  - cpf_cnpj : character varying
  - telefone : character varying
  - email : character varying
  - cidade : character varying
  - uf : character
  - observacao : text
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()
  - codigo : integer NOT NULL

### funil_fases
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".funil_fases_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - ordem : integer DEFAULT 0
  - cor : character varying DEFAULT '#1a56a4'::character varying
  - ativo : boolean DEFAULT true

### grupos_acesso
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".grupos_acesso_id_seq'::regclass)
  - nome : character varying NOT NULL
  - descricao : character varying
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()

### grupos_permissoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".grupos_permissoes_id_seq'::regclass)
  - id_grupo : integer NOT NULL
  - id_modulo : integer NOT NULL
  - pode_visualizar : boolean DEFAULT true
  - pode_incluir : boolean DEFAULT false
  - pode_editar : boolean DEFAULT false
  - pode_excluir : boolean DEFAULT false
  - pode_aprovar : boolean DEFAULT false
  - pode_exportar : boolean DEFAULT false
  - pode_ajustar_estoque : boolean DEFAULT false
  - pode_dar_desconto : boolean DEFAULT false

### grupos_produto
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".grupos_produto_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - ativo : boolean DEFAULT true
  - permite_estoque_negativo : boolean
  - id_centro_custo : integer
  - id_categoria_despesa : integer

### grupos_servico
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".grupos_servico_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()
  - codigo : character varying

### grupos_tributarios
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".grupos_tributarios_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - id_empresa : integer
  - cst_icms : character varying
  - aliq_icms : numeric DEFAULT 0
  - red_bc_icms : numeric DEFAULT 0
  - cst_icms_st : character varying
  - aliq_icms_st : numeric DEFAULT 0
  - mva_st : numeric DEFAULT 0
  - cst_pis : character varying
  - aliq_pis : numeric DEFAULT 0
  - cst_cofins : character varying
  - aliq_cofins : numeric DEFAULT 0
  - cst_ipi : character varying
  - aliq_ipi : numeric DEFAULT 0
  - ativo : boolean DEFAULT true
  - cst_ibscbs : character varying
  - cclasstrib : character varying
  - aliq_ibs_uf : numeric DEFAULT 0
  - aliq_ibs_mun : numeric DEFAULT 0
  - aliq_cbs : numeric DEFAULT 0
  - red_ibs : numeric DEFAULT 0
  - red_cbs : numeric DEFAULT 0
  - cst_is : character varying
  - aliq_is : numeric DEFAULT 0

### icms_uf
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".icms_uf_id_seq'::regclass)
  - uf_origem : character NOT NULL
  - uf_destino : character NOT NULL
  - aliq_icms : numeric DEFAULT 0
  - aliq_fcp : numeric DEFAULT 0

### inventarios
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".inventarios_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_centro : integer NOT NULL
  - id_usuario : integer
  - status : character varying DEFAULT 'ABERTO'::character varying
  - data_inicio : timestamp without time zone DEFAULT now()
  - data_finalizacao : timestamp without time zone
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()

### inventarios_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".inventarios_itens_id_seq'::regclass)
  - id_inventario : integer NOT NULL
  - id_produto : integer NOT NULL
  - estoque_sistema : numeric DEFAULT 0
  - quantidade_contada : numeric DEFAULT 0
  - diferenca : numeric
  - custo_unitario : numeric DEFAULT 0
  - valor_diferenca : numeric DEFAULT 0
  - ajustado : boolean DEFAULT false
  - observacao : text
  - num_contagens : integer NOT NULL DEFAULT 0
  - encerrado : boolean NOT NULL DEFAULT false

### log_acessos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".log_acessos_id_seq'::regclass)
  - id_usuario : integer
  - modulo : character varying
  - acao : character varying
  - tabela_afetada : character varying
  - registro_id : integer
  - dados_anteriores : jsonb
  - dados_novos : jsonb
  - ip : character varying
  - criado_em : timestamp without time zone DEFAULT now()
  - tipo : character varying DEFAULT 'INFO'::character varying
  - mensagem : text
  - detalhes : jsonb

### marcas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".marcas_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - ativo : boolean DEFAULT true

### mdfe
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".mdfe_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - numero : integer
  - serie : character varying DEFAULT '1'::character varying
  - chave_acesso : character varying
  - protocolo : character varying
  - status : character varying DEFAULT 'PENDENTE'::character varying
  - uf_inicio : character
  - uf_fim : character
  - data_emissao : timestamp without time zone DEFAULT now()
  - data_encerramento : timestamp without time zone
  - placa_veiculo : character varying
  - valor_carga : numeric DEFAULT 0
  - xml_enviado : text
  - xml_retorno : text
  - criado_em : timestamp without time zone DEFAULT now()

### metas_vendedores
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".metas_vendedores_id_seq'::regclass)
  - id_vendedor : integer NOT NULL
  - id_empresa : integer NOT NULL
  - mes : integer NOT NULL
  - ano : integer NOT NULL
  - meta_valor : numeric DEFAULT 0
  - meta_quantidade : integer DEFAULT 0
  - realizado_valor : numeric DEFAULT 0
  - realizado_quantidade : integer DEFAULT 0

### modelos_veiculo
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".modelos_veiculo_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - id_fabricante : integer
  - ativo : boolean DEFAULT true

### modulos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".modulos_id_seq'::regclass)
  - chave : character varying NOT NULL
  - nome : character varying NOT NULL
  - icone : character varying
  - ordem : integer DEFAULT 0
  - grupo_menu : character varying
  - ativo : boolean DEFAULT true

### modulos_sistema
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".modulos_sistema_id_seq'::regclass)
  - codigo : character varying NOT NULL
  - nome : character varying NOT NULL
  - descricao : character varying
  - icone : character varying
  - ordem : integer DEFAULT 0
  - ativo : boolean DEFAULT true

### municipios
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".municipios_id_seq'::regclass)
  - codigo_ibge : character varying
  - nome : character varying NOT NULL
  - uf : character NOT NULL

### naturezas_operacao
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".naturezas_operacao_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - cfop : character varying NOT NULL
  - tipo : character varying
  - finalidade : character varying
  - gera_financeiro : boolean DEFAULT true
  - mov_estoque : boolean DEFAULT true
  - ativo : boolean DEFAULT true

### ncm
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".ncm_id_seq'::regclass)
  - codigo : character varying NOT NULL
  - descricao : text NOT NULL
  - aliq_ipi : numeric DEFAULT 0
  - ativo : boolean DEFAULT true

### nfce
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".nfce_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - id_venda : integer
  - id_cliente : integer
  - numero : integer NOT NULL
  - serie : character varying DEFAULT '1'::character varying
  - modelo : character varying DEFAULT '65'::character varying
  - chave_acesso : character varying
  - protocolo : character varying
  - status : character varying DEFAULT 'PENDENTE'::character varying
  - data_emissao : timestamp without time zone DEFAULT now()
  - data_autorizacao : timestamp without time zone
  - valor_total : numeric DEFAULT 0
  - xml_enviado : text
  - xml_retorno : text
  - ambiente : character varying DEFAULT 'HOMOLOGACAO'::character varying
  - qrcode : text
  - url_consulta : text
  - criado_em : timestamp without time zone DEFAULT now()

### nfe
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".nfe_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - id_venda : integer
  - id_os : integer
  - id_natureza_op : integer
  - numero : integer NOT NULL
  - serie : character varying DEFAULT '1'::character varying
  - modelo : character varying DEFAULT '55'::character varying
  - id_cliente : integer
  - chave_acesso : character varying
  - protocolo : character varying
  - status : character varying DEFAULT 'PENDENTE'::character varying
  - status_sefaz : character varying
  - mensagem_sefaz : text
  - data_emissao : timestamp without time zone DEFAULT now()
  - data_autorizacao : timestamp without time zone
  - data_cancelamento : timestamp without time zone
  - valor_produtos : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_frete : numeric DEFAULT 0
  - valor_ipi : numeric DEFAULT 0
  - valor_icms_st : numeric DEFAULT 0
  - valor_pis : numeric DEFAULT 0
  - valor_cofins : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - xml_enviado : text
  - xml_retorno : text
  - xml_cancelamento : text
  - motivo_cancelamento : text
  - ambiente : character varying DEFAULT 'HOMOLOGACAO'::character varying
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - valor_ibs_uf : numeric DEFAULT 0
  - valor_ibs_mun : numeric DEFAULT 0
  - valor_cbs : numeric DEFAULT 0
  - valor_is : numeric DEFAULT 0

### nfe_entrada
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".nfe_entrada_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - id_recebimento : integer
  - id_fornecedor : integer
  - numero : character varying
  - serie : character varying
  - chave_acesso : character varying
  - data_emissao : date
  - data_entrada : date DEFAULT CURRENT_DATE
  - valor_produtos : numeric DEFAULT 0
  - valor_ipi : numeric DEFAULT 0
  - valor_st : numeric DEFAULT 0
  - valor_frete : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - xml : text
  - status : character varying DEFAULT 'PENDENTE'::character varying
  - criado_em : timestamp without time zone DEFAULT now()

### nfe_inutilizacoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".nfe_inutilizacoes_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - modelo : character varying
  - serie : character varying
  - numero_ini : integer
  - numero_fim : integer
  - justificativa : text
  - protocolo : character varying
  - data_inutilizacao : timestamp without time zone DEFAULT now()

### nfe_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".nfe_itens_id_seq'::regclass)
  - id_nfe : integer NOT NULL
  - id_produto : integer
  - id_grupo_tributario : integer
  - id_natureza_op : integer
  - numero_item : integer NOT NULL
  - descricao : character varying NOT NULL
  - ncm : character varying
  - cfop : character varying
  - id_unidade : integer
  - quantidade : numeric DEFAULT 1
  - valor_unitario : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - cst_icms : character varying
  - bc_icms : numeric DEFAULT 0
  - aliq_icms : numeric DEFAULT 0
  - valor_icms : numeric DEFAULT 0
  - bc_icms_st : numeric DEFAULT 0
  - aliq_icms_st : numeric DEFAULT 0
  - valor_icms_st : numeric DEFAULT 0
  - cst_ipi : character varying
  - aliq_ipi : numeric DEFAULT 0
  - valor_ipi : numeric DEFAULT 0
  - cst_pis : character varying
  - aliq_pis : numeric DEFAULT 0
  - valor_pis : numeric DEFAULT 0
  - cst_cofins : character varying
  - aliq_cofins : numeric DEFAULT 0
  - valor_cofins : numeric DEFAULT 0
  - cst_ibscbs : character varying
  - cclasstrib : character varying
  - bc_ibs_cbs : numeric DEFAULT 0
  - aliq_ibs_uf : numeric DEFAULT 0
  - valor_ibs_uf : numeric DEFAULT 0
  - aliq_ibs_mun : numeric DEFAULT 0
  - valor_ibs_mun : numeric DEFAULT 0
  - aliq_cbs : numeric DEFAULT 0
  - valor_cbs : numeric DEFAULT 0
  - cst_is : character varying
  - aliq_is : numeric DEFAULT 0
  - valor_is : numeric DEFAULT 0

### nfse
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".nfse_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - id_os : integer
  - id_venda : integer
  - id_cliente : integer
  - numero : character varying
  - numero_rps : character varying
  - serie_rps : character varying
  - codigo_verificacao : character varying
  - status : character varying DEFAULT 'PENDENTE'::character varying
  - data_emissao : timestamp without time zone DEFAULT now()
  - data_autorizacao : timestamp without time zone
  - codigo_servico_municipio : character varying
  - descricao_servico : text
  - valor_servico : numeric DEFAULT 0
  - valor_deducoes : numeric DEFAULT 0
  - valor_pis : numeric DEFAULT 0
  - valor_cofins : numeric DEFAULT 0
  - valor_inss : numeric DEFAULT 0
  - valor_ir : numeric DEFAULT 0
  - valor_csll : numeric DEFAULT 0
  - valor_iss : numeric DEFAULT 0
  - aliq_iss : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - xml_enviado : text
  - xml_retorno : text
  - url_pdf : text
  - criado_em : timestamp without time zone DEFAULT now()

### oportunidades
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".oportunidades_id_seq'::regclass)
  - id_empresa : integer
  - id_cliente : integer NOT NULL
  - id_contato : integer
  - id_vendedor : integer
  - id_fase : integer
  - id_orcamento : integer
  - titulo : character varying NOT NULL
  - valor_estimado : numeric DEFAULT 0
  - probabilidade : integer DEFAULT 50
  - data_prevista_fechamento : date
  - status : character varying DEFAULT 'ABERTA'::character varying
  - motivo_perda : character varying
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()

### orcamentos_venda
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".orcamentos_venda_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_cliente : integer NOT NULL
  - id_contato : integer
  - id_vendedor : integer
  - id_tabela_preco : integer
  - id_forma_pagamento : integer
  - id_condicao_pagamento : integer
  - status : character varying DEFAULT 'ABERTO'::character varying
  - data_emissao : date DEFAULT CURRENT_DATE
  - data_validade : date
  - data_aprovacao : date
  - valor_produtos : numeric DEFAULT 0
  - valor_servicos : numeric DEFAULT 0
  - valor_frete : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - observacao : text
  - observacao_interna : text
  - motivo_reprovacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()

### orcamentos_venda_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".orcamentos_venda_itens_id_seq'::regclass)
  - id_orcamento : integer NOT NULL
  - tipo : character varying NOT NULL
  - id_produto : integer
  - id_servico : integer
  - descricao : character varying NOT NULL
  - referencia : character varying
  - quantidade : numeric DEFAULT 1
  - id_unidade : integer
  - valor_unitario : numeric DEFAULT 0
  - percentual_desconto : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - ordem : integer DEFAULT 0

### ordens_servico
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".ordens_servico_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_cliente : integer NOT NULL
  - id_veiculo : integer
  - id_tipo_os : integer
  - id_usuario_abertura : integer
  - id_usuario_responsavel : integer
  - status : character varying DEFAULT 'ABERTA'::character varying
  - data_entrada : timestamp without time zone DEFAULT now()
  - data_prevista : date
  - data_saida : timestamp without time zone
  - km_entrada : numeric
  - km_saida : numeric
  - defeito_relatado : text
  - defeito_constatado : text
  - solucao : text
  - observacao_interna : text
  - observacao_cliente : text
  - valor_servicos : numeric DEFAULT 0
  - valor_pecas : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - id_forma_pagamento : integer
  - id_condicao_pagamento : integer
  - cancelada : boolean DEFAULT false
  - motivo_cancelamento : text
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - id_tipo_saida : integer
  - id_centro_custo : integer
  - valor_consumo : numeric DEFAULT 0
  - id_vendedor : integer
  - id_prisma : integer

### os_andamentos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".os_andamentos_id_seq'::regclass)
  - id_os : integer NOT NULL
  - id_usuario : integer
  - status_anterior : character varying
  - status_novo : character varying
  - descricao : text NOT NULL
  - criado_em : timestamp without time zone DEFAULT now()

### os_apontamentos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".os_apontamentos_id_seq'::regclass)
  - id_os : integer NOT NULL
  - id_servico_os : integer
  - id_colaborador : integer NOT NULL
  - data_apontamento : date NOT NULL DEFAULT CURRENT_DATE
  - hora_inicio : time without time zone NOT NULL
  - hora_termino : time without time zone
  - horas_trabalhadas : numeric DEFAULT 0
  - fator : numeric DEFAULT 0
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - id_os_peca : integer
  - faturavel : boolean NOT NULL DEFAULT true
  - id_area : integer
  - id_defeito : integer

### os_comissoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".os_comissoes_id_seq'::regclass)
  - id_os : integer NOT NULL
  - id_vendedor : integer NOT NULL
  - tipo : character varying NOT NULL
  - percentual : numeric DEFAULT 0
  - valor_base : numeric DEFAULT 0
  - valor_comissao : numeric DEFAULT 0
  - status : character varying DEFAULT 'PENDENTE'::character varying
  - data_pagamento : date
  - criado_em : timestamp without time zone DEFAULT now()

### os_defeitos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".os_defeitos_id_seq'::regclass)
  - id_os : integer NOT NULL
  - codigo : character varying NOT NULL
  - descricao : text NOT NULL
  - criado_em : timestamp without time zone DEFAULT now()
  - id_area : integer
  - status : character varying NOT NULL DEFAULT 'ABERTO'::character varying

### os_fotos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".os_fotos_id_seq'::regclass)
  - id_os : integer NOT NULL
  - url_arquivo : text NOT NULL
  - descricao : character varying
  - tipo : character varying DEFAULT 'ENTRADA'::character varying
  - criado_em : timestamp without time zone DEFAULT now()

### os_orcamento_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".os_orcamento_itens_id_seq'::regclass)
  - id_orcamento : integer NOT NULL
  - tipo : character varying NOT NULL
  - id_servico : integer
  - id_produto : integer
  - descricao : character varying NOT NULL
  - quantidade : numeric DEFAULT 1
  - valor_unitario : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0

### os_orcamentos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".os_orcamentos_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_cliente : integer NOT NULL
  - id_veiculo : integer
  - id_os : integer
  - id_usuario : integer
  - status : character varying DEFAULT 'ABERTO'::character varying
  - data_emissao : date DEFAULT CURRENT_DATE
  - data_validade : date
  - valor_servicos : numeric DEFAULT 0
  - valor_pecas : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()

### os_pecas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".os_pecas_id_seq'::regclass)
  - id_os : integer NOT NULL
  - id_produto : integer
  - descricao : character varying NOT NULL
  - referencia : character varying
  - quantidade : numeric DEFAULT 1
  - valor_unitario : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - id_unidade : integer
  - movimentou_estoque : boolean DEFAULT false
  - id_tecnico : integer
  - consumo : boolean DEFAULT false
  - id_producao : integer
  - id_encomenda : integer
  - produzido : boolean DEFAULT false
  - status : character varying
  - id_area : integer
  - data_inicio : timestamp with time zone
  - id_usuario_distribuiu : integer
  - custo_composicao : numeric
  - custo_real : numeric

### os_servicos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".os_servicos_id_seq'::regclass)
  - id_os : integer NOT NULL
  - id_servico : integer
  - descricao : character varying NOT NULL
  - quantidade : numeric DEFAULT 1
  - valor_unitario : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - id_tecnico : integer
  - status : character varying DEFAULT 'PENDENTE'::character varying
  - tempo_previsto : numeric
  - tempo_realizado : numeric
  - observacao : text
  - data_inicio : timestamp with time zone DEFAULT now()
  - id_usuario_distribuiu : integer
  - id_area : integer
  - id_defeito : integer

### pedidos_compra
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".pedidos_compra_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_fornecedor : integer NOT NULL
  - id_usuario : integer
  - id_cotacao : integer
  - id_forma_pagamento : integer
  - id_condicao_pagamento : integer
  - status : character varying DEFAULT 'ABERTO'::character varying
  - data_pedido : date DEFAULT CURRENT_DATE
  - data_previsao : date
  - data_recebimento : date
  - valor_produtos : numeric DEFAULT 0
  - valor_frete : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()

### pedidos_compra_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".pedidos_compra_itens_id_seq'::regclass)
  - id_pedido : integer NOT NULL
  - id_produto : integer
  - descricao : character varying NOT NULL
  - referencia_fornecedor : character varying
  - quantidade : numeric DEFAULT 1
  - id_unidade : integer
  - valor_unitario : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - quantidade_recebida : numeric DEFAULT 0
  - status : character varying DEFAULT 'PENDENTE'::character varying

### plano_contas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".plano_contas_id_seq'::regclass)
  - codigo : character varying NOT NULL
  - descricao : character varying NOT NULL
  - tipo : character varying NOT NULL
  - natureza : character varying
  - id_pai : integer
  - nivel : integer DEFAULT 1
  - aceita_lancamento : boolean DEFAULT true
  - ativo : boolean DEFAULT true

### politica_desconto
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".politica_desconto_id_seq'::regclass)
  - id_grupo_acesso : integer NOT NULL
  - id_grupo_produto : integer
  - id_subgrupo_produto : integer
  - id_produto : integer
  - id_tabela_preco : integer
  - desconto_maximo_vista : numeric NOT NULL DEFAULT 0
  - requer_aprovacao : boolean DEFAULT false
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - desconto_maximo_prazo : numeric DEFAULT 0

### precos_cliente_produto
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".precos_cliente_produto_id_seq'::regclass)
  - id_cliente : integer NOT NULL
  - id_produto : integer NOT NULL
  - preco : numeric NOT NULL
  - ativo : boolean DEFAULT true
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - id_usuario : integer

### prismas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".prismas_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_vendedor : integer NOT NULL
  - id_empresa : integer
  - ativo : boolean NOT NULL DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()

### produto_equivalentes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".produto_equivalentes_id_seq'::regclass)
  - id_produto : integer NOT NULL
  - id_produto_equivalente : integer NOT NULL

### produto_fornecedores
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".produto_fornecedores_id_seq'::regclass)
  - id_produto : integer NOT NULL
  - id_fornecedor : integer NOT NULL
  - referencia_fornecedor : character varying
  - preco_custo : numeric DEFAULT 0
  - prazo_entrega_dias : integer DEFAULT 0
  - principal : boolean DEFAULT false
  - ativo : boolean DEFAULT true

### produtos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".produtos_id_seq'::regclass)
  - referencia : character varying
  - nome : character varying NOT NULL
  - descricao : text
  - codigo_barras : character varying
  - id_grupo : integer
  - id_subgrupo : integer
  - id_marca : integer
  - id_unidade : integer
  - ncm : character varying
  - preco_custo : numeric DEFAULT 0
  - preco_venda : numeric DEFAULT 0
  - estoque_atual : numeric DEFAULT 0
  - estoque_minimo : numeric DEFAULT 0
  - estoque_maximo : numeric DEFAULT 0
  - situacao : character varying DEFAULT 'ATIVO'::character varying
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - origem : smallint DEFAULT 0
  - cest : character varying
  - cfop_padrao : character varying
  - cst_csosn : character varying
  - aliquota_icms : numeric DEFAULT 0
  - id_grupo_tributario : integer
  - sincroniza_preco : boolean DEFAULT true
  - permite_estoque_negativo : boolean
  - produzido : boolean DEFAULT false
  - bloquear_desconto : boolean DEFAULT false
  - controla_estoque : boolean NOT NULL DEFAULT true
  - curva_abc : character varying
  - curva_abc_atualizada_em : timestamp with time zone

### produtos_composicao
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".produtos_composicao_id_seq'::regclass)
  - id_produto : integer NOT NULL
  - tipo : character varying NOT NULL
  - id_componente : integer
  - id_servico : integer
  - descricao : character varying
  - quantidade : numeric DEFAULT 1
  - custo_unitario : numeric DEFAULT 0
  - ordem : integer DEFAULT 0
  - criado_em : timestamp without time zone DEFAULT now()

### produtos_fiscal_empresa
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".produtos_fiscal_empresa_id_seq'::regclass)
  - id_produto : integer NOT NULL
  - id_empresa : integer NOT NULL
  - id_grupo_tributario : integer
  - ncm : character varying
  - cest : character varying
  - cfop_padrao : character varying
  - cst_csosn : character varying
  - origem : smallint DEFAULT 0
  - aliquota_icms : numeric
  - ativo : boolean NOT NULL DEFAULT true
  - atualizado_em : timestamp without time zone DEFAULT now()
  - cst_ibscbs : character varying
  - cclasstrib : character varying

### produtos_precos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".produtos_precos_id_seq'::regclass)
  - id_produto : integer NOT NULL
  - id_empresa : integer NOT NULL
  - id_tabela_preco : integer NOT NULL
  - tipo_calculo : character varying NOT NULL DEFAULT 'FIXO'::character varying
  - margem_percentual : numeric
  - preco_venda : numeric
  - atualizado_em : timestamp without time zone DEFAULT now()
  - id_usuario_atualizacao : integer

### promocao_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".promocao_itens_id_seq'::regclass)
  - id_promocao : integer NOT NULL
  - id_produto : integer NOT NULL
  - tipo : character varying NOT NULL
  - valor : numeric NOT NULL
  - preco_original : numeric

### promocoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".promocoes_id_seq'::regclass)
  - nome : character varying NOT NULL
  - data_inicio : date NOT NULL
  - data_fim : date NOT NULL
  - ativo : boolean DEFAULT true
  - desconto_adicional_maximo : numeric DEFAULT 0
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - criado_por : integer

### recibos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".recibos_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_cliente : integer NOT NULL
  - id_titulo : integer
  - id_usuario : integer
  - valor : numeric NOT NULL
  - data_emissao : date DEFAULT CURRENT_DATE
  - descricao : text
  - criado_em : timestamp without time zone DEFAULT now()

### renegociacoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".renegociacoes_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - id_cliente : integer NOT NULL
  - id_usuario : integer
  - data_renegociacao : date DEFAULT CURRENT_DATE
  - valor_original : numeric DEFAULT 0
  - valor_juros : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()

### renegociacoes_titulos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".renegociacoes_titulos_id_seq'::regclass)
  - id_renegociacao : integer NOT NULL
  - id_titulo_original : integer
  - id_titulo_novo : integer
  - tipo : character varying

### segmentos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".segmentos_id_seq'::regclass)
  - nome : character varying NOT NULL
  - id_centro_custo : integer
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()

### sequencias
  - entidade : text NOT NULL
  - id_empresa : integer NOT NULL DEFAULT 0
  - ultimo : bigint NOT NULL DEFAULT 0

### servicos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".servicos_id_seq'::regclass)
  - codigo : character varying
  - nome : character varying NOT NULL
  - descricao : text
  - preco : numeric DEFAULT 0
  - unidade : character varying DEFAULT 'UN'::character varying
  - situacao : character varying DEFAULT 'ATIVO'::character varying
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - id_grupo : integer

### solicitacoes_produto
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".solicitacoes_produto_id_seq'::regclass)
  - id_empresa : integer
  - origem : character varying NOT NULL
  - id_origem : integer NOT NULL
  - id_produto : integer NOT NULL
  - id_unidade : integer
  - qtd_solicitada : numeric NOT NULL
  - qtd_atendida : numeric NOT NULL DEFAULT 0
  - valor_unitario : numeric
  - id_centro_estoque : integer
  - prioridade : smallint NOT NULL DEFAULT 3
  - status : character varying NOT NULL DEFAULT 'PENDENTE'::character varying
  - observacao : text
  - id_usuario_solicitante : integer
  - id_usuario_atendente : integer
  - reservou : boolean NOT NULL DEFAULT false
  - data_solicitacao : timestamp without time zone DEFAULT now()
  - data_atendimento : timestamp without time zone
  - criado_em : timestamp without time zone DEFAULT now()

### subgrupos_produto
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".subgrupos_produto_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - id_grupo : integer
  - ativo : boolean DEFAULT true
  - permite_estoque_negativo : boolean

### tabelas_preco
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".tabelas_preco_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - percentual_desconto : numeric DEFAULT 0
  - percentual_acrescimo : numeric DEFAULT 0
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()

### taxas_forma_pagamento
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".taxas_forma_pagamento_id_seq'::regclass)
  - id_empresa : integer NOT NULL
  - id_condicao_pagamento : integer NOT NULL
  - id_forma_pagamento : integer NOT NULL
  - tipo_taxa : character NOT NULL DEFAULT 'P'::bpchar
  - perc_taxa : numeric NOT NULL DEFAULT 0
  - valor_taxa : numeric NOT NULL DEFAULT 0
  - ativo : boolean NOT NULL DEFAULT true

### tipos_entrada
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".tipos_entrada_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - mov_estoque : boolean DEFAULT true
  - atualiza_custo : boolean DEFAULT true
  - mov_financeiro : boolean DEFAULT true
  - id_natureza_dentro : integer
  - id_natureza_fora : integer
  - id_plano_conta : integer
  - padrao : boolean DEFAULT false
  - ativo : boolean DEFAULT true

### tipos_movimento_interno
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".tipos_movimento_interno_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - sentido : character varying NOT NULL
  - mexe_reserva : boolean DEFAULT false
  - exige_justificativa : boolean DEFAULT false
  - exige_aprovacao : boolean DEFAULT false
  - atualiza_custo : boolean DEFAULT false
  - padrao : boolean DEFAULT false
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()

### tipos_os
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".tipos_os_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - ativo : boolean DEFAULT true

### tipos_saida
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".tipos_saida_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - mov_estoque : boolean DEFAULT true
  - mov_financeiro : boolean DEFAULT true
  - gera_nf : boolean DEFAULT true
  - ativo : boolean DEFAULT true
  - id_natureza_dentro : integer
  - id_natureza_fora : integer
  - gera_comissao : boolean DEFAULT true
  - contabiliza_lucro : boolean DEFAULT true
  - padrao : boolean DEFAULT false
  - id_plano_conta : integer
  - tipo : character varying DEFAULT 'SAIDA'::character varying
  - atualiza_custo : boolean DEFAULT false
  - id_centro_custo : integer
  - id_categoria_despesa : integer
  - restrito : boolean NOT NULL DEFAULT false

### titulos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".titulos_id_seq'::regclass)
  - tipo : character varying NOT NULL
  - numero : character varying
  - parcela : character varying
  - id_empresa : integer NOT NULL
  - id_cliente : integer
  - id_conta_financeira : integer
  - id_plano_conta : integer
  - id_centro_custo : integer
  - id_forma_pagamento : integer
  - origem : character varying
  - id_origem : integer
  - numero_origem : character varying
  - data_emissao : date DEFAULT CURRENT_DATE
  - data_vencimento : date NOT NULL
  - data_competencia : date DEFAULT CURRENT_DATE
  - valor : numeric NOT NULL
  - valor_desconto : numeric DEFAULT 0
  - valor_juros : numeric DEFAULT 0
  - valor_multa : numeric DEFAULT 0
  - valor_pago : numeric DEFAULT 0
  - valor_saldo : numeric
  - status : character varying DEFAULT 'ABERTO'::character varying
  - data_baixa : date
  - nosso_numero : character varying
  - linha_digitavel : text
  - codigo_barras : text
  - url_boleto : text
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - modalidade : character varying DEFAULT 'NORMAL'::character varying
  - aprovado : boolean DEFAULT false
  - aprovado_em : timestamp without time zone
  - id_usuario_aprovacao : integer
  - id_fornecedor : integer

### titulos_baixas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".titulos_baixas_id_seq'::regclass)
  - id_titulo : integer NOT NULL
  - id_conta_financeira : integer NOT NULL
  - id_forma_pagamento : integer
  - id_usuario : integer
  - data_baixa : date NOT NULL DEFAULT CURRENT_DATE
  - valor_pago : numeric NOT NULL
  - valor_desconto : numeric DEFAULT 0
  - valor_juros : numeric DEFAULT 0
  - valor_multa : numeric DEFAULT 0
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()
  - estornado : boolean DEFAULT false
  - estornado_em : timestamp without time zone
  - id_usuario_estorno : integer

### transportadoras
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".transportadoras_id_seq'::regclass)
  - razao_social : character varying NOT NULL
  - nome_fantasia : character varying
  - cpf_cnpj : character varying
  - inscricao_estadual : character varying
  - telefone : character varying
  - email : character varying
  - endereco : character varying
  - bairro : character varying
  - cidade : character varying
  - uf : character varying
  - cep : character varying
  - ativo : boolean DEFAULT true

### unidades
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".unidades_id_seq'::regclass)
  - descricao : character varying NOT NULL
  - sigla : character varying NOT NULL
  - ativo : boolean DEFAULT true

### usuario_habilidades
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".usuario_habilidades_id_seq'::regclass)
  - id_usuario : integer NOT NULL
  - id_area : integer NOT NULL
  - ativo : boolean DEFAULT true
  - criado_em : timestamp with time zone DEFAULT now()

### usuarios
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".usuarios_id_seq'::regclass)
  - nome : character varying NOT NULL
  - login : character varying NOT NULL
  - senha_hash : character varying NOT NULL
  - email : character varying
  - perfil : character varying DEFAULT 'OPERADOR'::character varying
  - id_departamento : integer
  - id_cargo : integer
  - ativo : boolean DEFAULT true
  - ultimo_acesso : timestamp without time zone
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - percentual_comissao : numeric DEFAULT 0
  - perc_comissao_servico : numeric DEFAULT 0
  - perc_comissao_peca : numeric DEFAULT 0
  - segmento : character varying
  - id_pessoa : integer
  - id_centro_custo : integer

### usuarios_empresas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".usuarios_empresas_id_seq'::regclass)
  - id_usuario : integer NOT NULL
  - id_empresa : integer NOT NULL
  - modulos : jsonb DEFAULT '[]'::jsonb

### usuarios_grupos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".usuarios_grupos_id_seq'::regclass)
  - id_usuario : integer NOT NULL
  - id_grupo : integer NOT NULL

### veiculos
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".veiculos_id_seq'::regclass)
  - placa : character varying
  - id_cliente : integer
  - id_modelo : integer
  - id_cor : integer
  - ano_fabricacao : integer
  - ano_modelo : integer
  - chassi : character varying
  - renavam : character varying
  - km_atual : numeric DEFAULT 0
  - combustivel : character varying
  - observacao : text
  - ativo : boolean DEFAULT true
  - criado_em : timestamp without time zone DEFAULT now()
  - marca : character varying
  - modelo : character varying
  - cor : character varying

### vendas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".vendas_id_seq'::regclass)
  - numero : character varying NOT NULL
  - id_empresa : integer NOT NULL
  - id_cliente : integer NOT NULL
  - id_contato : integer
  - id_vendedor : integer
  - id_usuario_lancamento : integer
  - id_tipo_saida : integer DEFAULT 7
  - id_tabela_preco : integer
  - id_forma_pagamento : integer
  - id_condicao_pagamento : integer
  - id_orcamento_origem : integer
  - id_os_origem : integer
  - status : character varying DEFAULT 'ABERTA'::character varying
  - data_venda : timestamp without time zone DEFAULT now()
  - data_entrega : date
  - data_faturamento : timestamp without time zone
  - endereco_entrega : character varying
  - cidade_entrega : character varying
  - uf_entrega : character
  - cep_entrega : character varying
  - valor_produtos : numeric DEFAULT 0
  - valor_servicos : numeric DEFAULT 0
  - valor_frete : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - percentual_comissao : numeric DEFAULT 0
  - valor_comissao : numeric DEFAULT 0
  - cancelada : boolean DEFAULT false
  - motivo_cancelamento : text
  - observacao : text
  - observacao_interna : text
  - criado_em : timestamp without time zone DEFAULT now()
  - atualizado_em : timestamp without time zone DEFAULT now()
  - id_centro_custo : integer
  - valor_ipi : numeric DEFAULT 0
  - id_orcamento : integer

### vendas_comissoes
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".vendas_comissoes_id_seq'::regclass)
  - id_venda : integer NOT NULL
  - id_vendedor : integer NOT NULL
  - percentual : numeric DEFAULT 0
  - valor_base : numeric DEFAULT 0
  - valor_comissao : numeric DEFAULT 0
  - status : character varying DEFAULT 'PENDENTE'::character varying
  - data_pagamento : date
  - criado_em : timestamp without time zone DEFAULT now()

### vendas_itens
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".vendas_itens_id_seq'::regclass)
  - id_venda : integer NOT NULL
  - tipo : character varying NOT NULL
  - id_produto : integer
  - id_servico : integer
  - descricao : character varying NOT NULL
  - referencia : character varying
  - quantidade : numeric DEFAULT 1
  - id_unidade : integer
  - valor_unitario : numeric DEFAULT 0
  - valor_custo : numeric DEFAULT 0
  - percentual_desconto : numeric DEFAULT 0
  - valor_desconto : numeric DEFAULT 0
  - valor_total : numeric DEFAULT 0
  - movimentou_estoque : boolean DEFAULT false
  - ordem : integer DEFAULT 0
  - id_encomenda : integer

### vendas_perdidas
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".vendas_perdidas_id_seq'::regclass)
  - id_empresa : integer
  - id_cliente : integer
  - id_produto : integer
  - id_servico : integer
  - id_vendedor : integer
  - id_orcamento : integer
  - motivo : character varying
  - concorrente : character varying
  - valor_perdido : numeric DEFAULT 0
  - observacao : text
  - criado_em : timestamp without time zone DEFAULT now()

### vendas_rateio_financeiro
  - id : integer NOT NULL DEFAULT nextval('"Teste ERP".vendas_rateio_financeiro_id_seq'::regclass)
  - id_venda : integer NOT NULL
  - tipo_linha : character varying NOT NULL
  - descricao : character varying NOT NULL
  - valor : numeric NOT NULL DEFAULT 0
  - id_plano_conta : integer
  - id_conta_financeira : integer
  - id_centro_custo : integer
  - criado_em : timestamp without time zone DEFAULT now()

### vw_cobranca_clientes
  - id_empresa : integer
  - empresa : character varying
  - id_cliente : integer
  - cliente : character varying
  - telefone : character varying
  - celular : character varying
  - whatsapp : character varying
  - limite_credito : numeric
  - titulos_vencidos : bigint
  - total_vencido : numeric
  - total_a_vencer : numeric
  - saldo_devedor : numeric
  - maior_atraso : integer
  - vencimento_mais_antigo : date

### vw_contas_pagar
  - id : integer
  - numero : character varying
  - parcela : character varying
  - id_empresa : integer
  - empresa : character varying
  - id_fornecedor : integer
  - fornecedor : character varying
  - cpf_cnpj : character varying
  - id_plano_conta : integer
  - id_centro_custo : integer
  - origem : character varying
  - id_origem : integer
  - data_emissao : date
  - data_vencimento : date
  - valor : numeric
  - valor_pago : numeric
  - valor_saldo : numeric
  - status : character varying
  - vencido : boolean
  - dias_atraso : integer

### vw_contas_receber
  - id : integer
  - numero : character varying
  - parcela : character varying
  - id_empresa : integer
  - empresa : character varying
  - id_cliente : integer
  - cliente : character varying
  - cpf_cnpj : character varying
  - id_forma_pagamento : integer
  - forma_pagamento : character varying
  - origem : character varying
  - id_origem : integer
  - data_emissao : date
  - data_vencimento : date
  - valor : numeric
  - valor_pago : numeric
  - valor_saldo : numeric
  - status : character varying
  - vencido : boolean
  - dias_atraso : integer

### vw_gondola_saldo
  - id_centro : integer
  - gondola : character varying
  - id_empresa : integer
  - id_produto : integer
  - produto : character varying
  - referencia : character varying
  - estoque_atual : numeric
  - estoque_reservado : numeric
  - estoque_disponivel : numeric
  - preco_venda : numeric

### vw_inventarios
  - id : integer
  - numero : character varying
  - status : character varying
  - id_empresa : integer
  - empresa : character varying
  - id_centro : integer
  - centro : character varying
  - data_inicio : timestamp without time zone
  - data_finalizacao : timestamp without time zone
  - observacao : text
  - criado_em : timestamp without time zone
  - itens : bigint
  - contados : bigint

### vw_logs
  - id : integer
  - criado_em : timestamp without time zone
  - id_usuario : integer
  - usuario : character varying
  - tipo : character varying
  - modulo : character varying
  - acao : character varying
  - tabela_afetada : character varying
  - registro_id : integer
  - mensagem : text
  - ip : character varying

### vw_nfe
  - id : integer
  - id_empresa : integer
  - empresa : character varying
  - numero : integer
  - serie : character varying
  - modelo : character varying
  - id_cliente : integer
  - cliente : character varying
  - natureza : character varying
  - cfop : character varying
  - status : character varying
  - status_sefaz : character varying
  - ambiente : character varying
  - chave_acesso : character varying
  - protocolo : character varying
  - valor_produtos : numeric
  - valor_total : numeric
  - data_emissao : timestamp without time zone
  - data_autorizacao : timestamp without time zone
  - mensagem_sefaz : text
  - id_venda : integer
  - id_os : integer

### vw_orcamentos
  - id : integer
  - numero : character varying
  - id_empresa : integer
  - empresa : character varying
  - id_cliente : integer
  - cliente : character varying
  - id_vendedor : integer
  - status : character varying
  - data_emissao : date
  - data_validade : date
  - data_aprovacao : date
  - valor_total : numeric
  - criado_em : timestamp without time zone
  - id_venda : integer

### vw_os
  - id : integer
  - numero : character varying
  - id_empresa : integer
  - empresa : character varying
  - id_cliente : integer
  - cliente : character varying
  - id_veiculo : integer
  - status : character varying
  - cancelada : boolean
  - data_entrada : timestamp without time zone
  - valor_pecas : numeric
  - valor_servicos : numeric
  - valor_total : numeric
  - id_forma_pagamento : integer
  - forma_pagamento : character varying
  - id_condicao_pagamento : integer

### vw_pedidos_compra
  - id : integer
  - numero : character varying
  - id_empresa : integer
  - empresa : character varying
  - id_fornecedor : integer
  - fornecedor : character varying
  - status : character varying
  - data_pedido : date
  - data_previsao : date
  - valor_total : numeric
  - criado_em : timestamp without time zone

### vw_recebimentos
  - id : integer
  - numero : character varying
  - id_empresa : integer
  - empresa : character varying
  - id_fornecedor : integer
  - fornecedor : character varying
  - id_pedido : integer
  - numero_nf_fornecedor : character varying
  - serie_nf : character varying
  - status : character varying
  - data_emissao_nf : date
  - data_recebimento : timestamp without time zone
  - valor_total : numeric
  - criado_em : timestamp without time zone
  - tipo_entrada : character varying

### vw_solicitacoes
  - id : integer
  - id_empresa : integer
  - empresa : character varying
  - origem : character varying
  - id_origem : integer
  - numero_doc : character varying
  - id_produto : integer
  - produto : character varying
  - referencia : character varying
  - qtd_solicitada : numeric
  - qtd_atendida : numeric
  - qtd_pendente : numeric
  - valor_unitario : numeric
  - id_centro_estoque : integer
  - prioridade : smallint
  - status : character varying
  - id_usuario_solicitante : integer
  - data_solicitacao : timestamp without time zone
  - observacao : text

### vw_transferencias
  - id : integer
  - numero : character varying
  - status : character varying
  - data_transferencia : timestamp without time zone
  - data_recebimento : timestamp without time zone
  - observacao : text
  - criado_em : timestamp without time zone
  - id_centro_origem : integer
  - centro_origem : character varying
  - id_empresa_origem : integer
  - empresa_origem : character varying
  - id_centro_destino : integer
  - centro_destino : character varying
  - id_empresa_destino : integer
  - empresa_destino : character varying
  - entre_empresas : boolean

### vw_vendas
  - id : integer
  - numero : character varying
  - id_empresa : integer
  - empresa : character varying
  - id_cliente : integer
  - cliente : character varying
  - status : character varying
  - cancelada : boolean
  - data_venda : timestamp without time zone
  - valor_produtos : numeric
  - valor_total : numeric
  - id_forma_pagamento : integer
  - forma_pagamento : character varying
  - id_condicao_pagamento : integer

---

## Funções RPC expostas (schema `public`: `erp_*`, `os_*`)

- erp_abrir_caixa(p_id_empresa integer, p_id_conta_financeira integer, p_id_usuario integer, p_valor_abertura numeric)
- erp_admin_dados()
- erp_admin_desconto_auxiliares()
- erp_aprovar_titulo(p_id_titulo integer, p_id_usuario integer)
- erp_atender_solicitacao(p_id_solicitacao integer, p_qtd_atendida numeric, p_id_centro integer, p_id_usuario integer)
- erp_autenticar_aprovador(p_login text, p_senha text, p_modulo text, p_acao text, p_contexto jsonb)
- erp_auxiliar_salvar(p_tabela character varying, p_dados jsonb)
- erp_baixar_estoque(p_id_produto integer, p_quantidade numeric, p_id_empresa integer, p_origem text, p_id_referencia integer, p_numero_referencia text, p_id_usuario integer, p_id_centro integer)
- erp_baixar_titulo(p_id_titulo integer, p_id_conta_financeira integer, p_id_forma_pagamento integer, p_valor_pago numeric, p_valor_desconto numeric, p_valor_juros numeric, p_valor_multa numeric, p_data_baixa date, p_observacao text, p_id_usuario integer)
- erp_baixar_titulo_wrapper_legado(p_id_titulo integer, p_id_conta_financeira integer, p_valor_pago numeric, p_id_forma_pagamento integer, p_id_usuario integer, p_valor_desconto numeric, p_valor_juros numeric, p_valor_multa numeric, p_data_baixa date, p_observacao text)
- erp_cadastros_comerciais()
- erp_cadastros_operacionais()
- erp_cadastros_veiculos_os()
- erp_caixa_movimentos_listar(p_id_sessao integer)
- erp_caixas_listar(p_id_empresa integer, p_id_usuario integer, p_status character varying)
- erp_cancelar_solicitacao(p_id integer, p_id_usuario integer, p_motivo text)
- erp_centro_custo_salvar(p_id integer, p_codigo character varying, p_descricao character varying, p_id_empresa integer, p_ativo boolean, p_id_usuario integer)
- erp_centro_estoque_salvar(p jsonb)
- erp_centros_custo_listar(p_id_empresa integer)
- erp_cheque_compensar(p_id_cheque integer, p_id_conta_financeira integer, p_data_compensacao date, p_id_usuario integer)
- erp_cheque_devolver(p_id_cheque integer, p_motivo character varying, p_id_usuario integer)
- erp_cheque_salvar(p_id integer, p_id_empresa integer, p_tipo character varying, p_banco character varying, p_agencia character varying, p_conta character varying, p_numero character varying, p_valor numeric, p_data_emissao date, p_data_bom_para date, p_id_cliente integer, p_id_conta_financeira integer, p_id_titulo integer, p_observacao text, p_id_usuario integer)
- erp_cheques_listar(p_id_empresa integer, p_tipo character varying, p_status character varying)
- erp_cliente_condicao_set(p_id_cliente integer, p_id_condicao integer, p_liberar boolean)
- erp_cliente_contato_excluir(p_id integer)
- erp_cliente_contato_salvar(p_id_cliente integer, p jsonb)
- erp_cliente_credito(p_id_cliente integer, p_id_empresa integer)
- erp_cliente_full(p_id_cliente integer)
- erp_cliente_historico(p_id_cliente integer, p_id_empresa integer, p_limit integer)
- erp_cliente_por_telefone(p_tel text)
- erp_cliente_salvar(p jsonb)
- erp_cobranca_acordo_parcelas(p_id integer)
- erp_cobranca_acordos_listar(p_id_empresa integer)
- erp_cobranca_cliente_titulos(p_id_cliente integer, p_id_empresa integer)
- erp_cobranca_config_get(p_id_empresa integer)
- erp_cobranca_config_salvar(p_dados jsonb)
- erp_colunas(p_tabela text)
- erp_condicoes_liberadas_cliente(p_id_cliente integer)
- erp_config(p_chave text, p_default text)
- erp_config_listar()
- erp_config_salvar(p_chave text, p_valor text, p_id_usuario integer)
- erp_consultar_limite_desconto(p_id_usuario integer, p_id_produto integer)
- erp_conta_financeira_salvar(p_id integer, p_descricao character varying, p_tipo character varying, p_id_empresa integer, p_banco character varying, p_agencia character varying, p_conta character varying, p_digito character varying, p_saldo_inicial numeric, p_principal boolean, p_ativo boolean)
- erp_contas_financeiras_listar(p_id_empresa integer)
- erp_cotacao_detalhe(p_id integer)
- erp_cotacao_gerar_pedidos(p_id_cotacao integer, p_id_usuario integer)
- erp_cotacao_listar(p_id_empresa integer, p_status text)
- erp_cotacao_resposta_salvar(p_id_cotacao integer, p_id_fornecedor integer, p_itens jsonb, p_id_usuario integer)
- erp_cotacao_salvar(p_cab jsonb, p_itens jsonb)
- erp_cotacao_selecionar(p_id_cotacao integer, p_id_produto integer, p_id_fornecedor integer)
- erp_cotacao_selecionar_menor(p_id_cotacao integer)
- erp_cotacao_status(p_id integer, p_status text)
- erp_criar_os(p_id_empresa integer, p_id_cliente integer, p_id_veiculo integer, p_id_tipo_os integer, p_id_forma integer, p_id_condicao integer, p_id_usuario integer)
- erp_criar_venda(p_id_empresa integer, p_id_cliente integer, p_id_forma integer, p_id_condicao integer, p_id_vendedor integer, p_id_usuario integer)
- erp_curva_abc(p_ano integer, p_mes integer, p_id_empresa integer, p_classe text, p_limit integer)
- erp_delete(p_tabela text, p_id text)
- erp_demanda_abc(p_id_empresa integer, p_dias integer, p_lead_time_dias integer)
- erp_demanda_compra(p_id_empresa integer, p_dias_analise integer)
- erp_demanda_filtros()
- erp_demanda_gerar_pedidos(p_itens jsonb, p_id_empresa integer, p_id_usuario integer)
- erp_demanda_listar(p_id_empresa integer, p_dias integer, p_modo text, p_id_grupo integer, p_id_subgrupo integer, p_id_fornecedor integer, p_busca text, p_urgencia text, p_cobertura_alvo integer, p_lead_time integer, p_somente_demanda boolean)
- erp_devolucao_cancelar(p_id integer, p_id_usuario integer)
- erp_devolucao_confirmar(p_id integer, p_id_usuario integer)
- erp_devolucao_dados(p_id_empresa integer)
- erp_devolucao_origem(p_origem text, p_id_origem integer)
- erp_devolucao_salvar(p_cab jsonb, p_itens jsonb)
- erp_devolucao_solicitar(p_id integer, p_id_usuario integer)
- erp_devolver_estoque(p_id_produto integer, p_quantidade numeric, p_id_empresa integer, p_origem text, p_id_referencia integer, p_numero_referencia text, p_id_usuario integer, p_id_centro integer)
- erp_dre(p jsonb)
- erp_empresa_precos_definir(p_id_empresa integer, p_id_empresa_precos integer)
- erp_empresas_precos_listar()
- erp_entrada_cancelar(p_id integer, p_id_usuario integer)
- erp_entrada_conferir(p_id integer, p_itens jsonb, p_id_usuario integer, p_finalizar boolean)
- erp_entrada_dados(p_id_empresa integer, p_status character varying)
- erp_entrada_estoque(p_id_produto integer, p_quantidade numeric, p_custo_unitario numeric, p_id_empresa integer, p_origem text, p_id_referencia integer, p_numero_referencia text, p_id_usuario integer, p_atualiza_custo boolean, p_id_centro integer)
- erp_entrada_finalizar(p_id integer, p_id_usuario integer, p_plano_contas jsonb)
- erp_entrada_salvar(p_id integer, p_id_empresa integer, p_id_fornecedor integer, p_id_pedido integer, p_id_usuario integer, p_id_centro_estoque integer, p_id_tipo_entrada integer, p_numero_nf_fornecedor character varying, p_serie_nf character varying, p_chave_nfe character varying, p_data_emissao_nf date, p_valor_frete numeric, p_valor_desconto numeric, p_valor_outras numeric, p_observacao text, p_id_condicao_pagamento integer, p_id_centro_custo integer, p_itens jsonb)
- erp_estoque_ajuste(p_id_produto integer, p_id_centro integer, p_quantidade numeric, p_tipo character varying, p_observacao text, p_id_usuario integer)
- erp_estoque_dados()
- erp_estoque_kardex(p_id_produto integer, p_id_centro integer)
- erp_estoque_parado(p_id_empresa integer, p_dias integer, p_id_grupo integer, p_id_subgrupo integer, p_busca text)
- erp_estoque_posicao(p_id_empresa integer, p_id_centro integer, p_id_grupo integer, p_busca text, p_somente_com_saldo boolean, p_detalhado boolean)
- erp_estornar_baixa(p_id_baixa integer, p_id_usuario integer)
- erp_estornar_baixa(p_id_baixa integer, p_id_usuario integer, p_observacao text)
- erp_extrato_conta(p_id_conta integer, p_data_ini date, p_data_fim date)
- erp_fechar_caixa(p_id_sessao integer, p_id_usuario integer, p_valor_contado numeric, p_observacao text)
- erp_fechar_caixa(p_id_sessao integer, p_valor_contado numeric, p_id_usuario integer, p_observacao text)
- erp_finalizar_os(p_id_os integer, p_id_usuario integer)
- erp_finalizar_venda(p_id_venda integer, p_id_usuario integer)
- erp_fiscal_empresa_salvar(p_id_produto integer, p_id_empresa integer, p jsonb)
- erp_gerar_curva_abc(p_ano integer, p_mes integer, p_id_empresa integer)
- erp_gerar_curva_abc_mes_anterior()
- erp_gerar_nfe(p_origem text, p_id_origem integer, p_id_natureza_op integer, p_id_usuario integer, p_serie text)
- erp_gerar_titulos_pagar(p_id_compra integer, p_id_usuario integer, p_reprocessar boolean)
- erp_gerar_titulos_receber(p_origem text, p_id_origem integer, p_id_usuario integer, p_reprocessar boolean)
- erp_gondola_abastecer(p_id_produto integer, p_id_centro_origem integer, p_id_centro_gondola integer, p_qtd numeric, p_id_usuario integer)
- erp_grupo_permissoes(p_id_grupo integer)
- erp_grupo_permissoes_salvar(p_id_grupo integer, p_permissoes jsonb)
- erp_grupo_salvar(p jsonb)
- erp_grupos_admin()
- erp_inventario_add_item(p_id_inventario integer, p_id_produto integer)
- erp_inventario_ajustar(p_id integer, p_id_usuario integer, p_forcar boolean)
- erp_inventario_aplicar(p_id_inventario integer, p_id_usuario integer)
- erp_inventario_cancelar(p_id integer)
- erp_inventario_contar(p_id_item integer, p_qtd numeric)
- erp_inventario_criar(p_id_empresa integer, p_id_centro integer, p_id_usuario integer, p_todos boolean)
- erp_inventario_detalhe(p_id integer)
- erp_inventario_itens(p_id_inventario integer)
- erp_inventario_salvar_contagem(p_id_inventario integer, p_itens jsonb)
- erp_inventarios_listar(p_id_empresa integer, p_status character varying)
- erp_lancar_produto_gondola(p_origem text, p_id_origem integer, p_id_produto integer, p_qtd numeric, p_id_centro_gondola integer, p_id_usuario integer, p_valor_unitario numeric)
- erp_list(p_tabela text, p_busca text, p_limit integer, p_offset integer)
- erp_log(p_id_usuario integer, p_tipo text, p_modulo text, p_acao text, p_tabela text, p_registro integer, p_mensagem text, p_detalhes jsonb)
- erp_log(p_id_usuario integer, p_modulo text, p_acao text, p_tabela text, p_registro integer, p_dados_anteriores jsonb, p_dados_novos jsonb)
- erp_log_erro(p_id_usuario integer, p_modulo text, p_acao text, p_mensagem text, p_detalhes jsonb)
- erp_log_frontend(p_nivel text, p_mensagem text, p_modulo text, p_acao text, p_stack text, p_url text, p_id_usuario integer, p_navegador text, p_payload jsonb)
- erp_log_frontend(p_id_usuario integer, p_modulo text, p_acao text, p_mensagem text, p_detalhes jsonb)
- erp_login(p_login text, p_senha text)
- erp_logs_erros(p_limite integer, p_dias integer)
- erp_movimento_caixa(p_id_sessao integer, p_tipo text, p_valor numeric, p_descricao text, p_id_usuario integer, p_id_forma_pagamento integer, p_id_plano_conta integer, p_id_centro_custo integer)
- erp_movimento_caixa(p_id_sessao integer, p_tipo character varying, p_valor numeric, p_descricao character varying, p_id_usuario integer, p_id_titulo_baixa integer, p_id_forma_pagamento integer, p_id_plano_conta integer, p_id_centro_custo integer)
- erp_nfe_payload(p_id_nfe integer)
- erp_orcamento_aprovar(p_id integer, p_id_usuario integer)
- erp_orcamento_detalhe(p_id integer)
- erp_orcamento_salvar(p_cab jsonb, p_itens jsonb)
- erp_orcamento_status(p_id integer, p_status text, p_motivo text)
- erp_os_detalhe(p_id integer)
- erp_pedido_compra_cancelar(p_id integer, p_id_usuario integer)
- erp_pedido_compra_dados(p_id_empresa integer, p_status character varying)
- erp_pedido_compra_detalhe(p_id integer)
- erp_pedido_compra_salvar(p_cab jsonb, p_itens jsonb)
- erp_pedido_compra_status(p_id integer, p_status text)
- erp_perm_matrix(p_id_grupo integer)
- erp_perm_set(p_id_grupo integer, p_id_modulo integer, p_acao text, p_valor boolean)
- erp_permissoes_usuario(p_id_usuario integer)
- erp_permite_estoque_negativo(p_id_produto integer)
- erp_plano_conta_salvar(p_id integer, p_codigo character varying, p_descricao character varying, p_tipo character varying, p_natureza character varying, p_id_pai integer, p_aceita_lancamento boolean, p_ativo boolean, p_id_usuario integer)
- erp_plano_contas_listar()
- erp_pode_tipo_restrito(p_id_usuario integer, p_id_tipo_saida integer)
- erp_politica_desconto_excluir(p_id integer)
- erp_politica_desconto_listar(p_id_grupo integer)
- erp_politica_desconto_salvar(p jsonb)
- erp_preco_cliente_excluir(p_id integer, p_id_usuario integer)
- erp_preco_cliente_listar(p_id_cliente integer, p_id_produto integer, p_busca text)
- erp_preco_cliente_salvar(p_id integer, p_id_cliente integer, p_id_produto integer, p_preco numeric, p_ativo boolean, p_observacao text, p_id_usuario integer)
- erp_preco_empresa_salvar(p_id_produto integer, p_id_empresa integer, p_id_tabela integer, p jsonb)
- erp_precos_recalcular_margem(p_id_produto integer)
- erp_produto_a_chegar(p_id_produto integer, p_id_empresa integer)
- erp_produto_curva_abc(p_id_produto integer, p_id_empresa integer, p_meses integer)
- erp_produto_estoque_limites(p_id integer, p_min numeric, p_max numeric, p_id_usuario integer)
- erp_produto_full(p_id_produto integer, p_id_empresa integer)
- erp_produto_historico(p_id_produto integer, p_id_empresa integer, p_limit integer)
- erp_produto_salvar(p jsonb)
- erp_promocao_excluir(p_id integer)
- erp_promocao_item_excluir(p_id integer)
- erp_promocao_item_salvar(p jsonb)
- erp_promocao_itens_listar(p_id_promocao integer)
- erp_promocao_salvar(p jsonb)
- erp_promocoes_dados()
- erp_recalcular_curva_abc(p_dias integer)
- erp_recebimento_cancelar(p_id integer)
- erp_recebimento_confirmar(p_id integer, p_id_usuario integer)
- erp_recebimento_detalhe(p_id integer)
- erp_recebimento_salvar(p_cab jsonb, p_itens jsonb)
- erp_reg(p_tabela text)
- erp_registrar_retorno_nfe(p_id_nfe integer, p_status text, p_chave text, p_protocolo text, p_xml_retorno text, p_mensagem text, p_status_sefaz text)
- erp_rel_clientes(p jsonb)
- erp_rel_compras(p jsonb)
- erp_rel_produtos(p jsonb)
- erp_rel_vendas(p jsonb)
- erp_renegociar_titulos(p_ids integer[], p_id_usuario integer, p_qtd_parcelas integer, p_primeiro_venc date, p_valor_entrada numeric, p_valor_juros numeric, p_valor_multa numeric, p_id_forma integer, p_observacao text)
- erp_resolver_preco(p_id_cliente integer, p_id_produto integer, p_id_empresa integer, p_id_tabela_preco integer)
- erp_separacao_assumir(p_id integer, p_id_usuario integer)
- erp_separacao_cancelar(p_id integer, p_id_usuario integer)
- erp_separacao_confirmar(p_id_expedicao integer, p_id_usuario integer, p_itens jsonb)
- erp_separacao_dados(p_status text[], p_id_empresa integer, p_busca text)
- erp_separacao_detalhe(p_id integer)
- erp_separacao_entregar(p_id integer, p_entregue_para character varying, p_id_usuario integer)
- erp_solicitar_produto(p_origem text, p_id_origem integer, p_id_produto integer, p_qtd numeric, p_id_usuario integer, p_id_unidade integer, p_valor_unitario numeric, p_id_centro_estoque integer, p_prioridade integer, p_observacao text, p_reservar boolean)
- erp_titulo_salvar(p_tipo character varying, p_id_empresa integer, p_id_cliente integer, p_numero character varying, p_parcela character varying, p_valor numeric, p_data_vencimento date, p_id_forma_pagamento integer, p_id_plano_conta integer, p_id_centro_custo integer, p_modalidade character varying, p_observacao text, p_id_usuario integer, p_origem character varying, p_id_origem integer, p_numero_origem character varying, p_data_emissao date)
- erp_titulos_baixas_listar(p_id_titulo integer)
- erp_titulos_listar(p_tipo character varying, p_id_empresa integer, p_status character varying, p_data_ini date, p_data_fim date, p_busca character varying)
- erp_transferencia_cancelar(p_id integer)
- erp_transferencia_detalhe(p_id integer)
- erp_transferencia_enviar(p_id integer, p_id_usuario integer)
- erp_transferencia_receber(p_id integer, p_id_usuario integer)
- erp_transferencia_salvar(p_cab jsonb, p_itens jsonb)
- erp_transferencias_listar(p_id_empresa integer, p_status character varying)
- erp_transferir_contas(p_id_empresa integer, p_id_conta_origem integer, p_id_conta_destino integer, p_valor numeric, p_data date, p_descricao character varying, p_id_usuario integer)
- erp_upsert(p_tabela text, p_dados jsonb, p_id text)
- erp_usuario_detalhe(p_id integer)
- erp_usuario_empresa_set(p_id_usuario integer, p_id_empresa integer, p_incluir boolean)
- erp_usuario_grupo_set(p_id_usuario integer, p_id_grupo integer, p_incluir boolean)
- erp_usuario_pode(p_id_usuario integer, p_modulo text, p_acao text)
- erp_usuario_salvar(p jsonb)
- erp_usuarios_admin()
- erp_validar_credito(p_id_cliente integer, p_valor numeric)
- erp_validar_desconto(p_id_usuario integer, p_id_produto integer, p_id_tabela_preco integer, p_percentual numeric, p_liberado boolean)
- erp_validar_desconto(p_id_usuario integer, p_id_produto integer, p_percentual numeric, p_a_vista boolean)
- erp_venda_detalhe(p_id integer)
- erp_vendedores()
- os_apontamento_dados(p_id_empresa integer)
- os_apontamento_excluir(p_id integer)
- os_apontamento_faturavel(p_id integer, p_faturavel boolean)
- os_apontamento_salvar(p_id integer, p_id_os integer, p_id_servico_os integer, p_id_os_peca integer, p_id_colaborador integer, p_data_apontamento date, p_hora_inicio text, p_hora_termino text, p_horas_trabalhadas numeric, p_fator numeric, p_id_area integer, p_observacao text)
- os_avaliar_servicos(p_id_os integer, p_servicos jsonb, p_id_usuario integer)
- os_cancelar(p jsonb)
- os_dados()
- os_defeito_excluir(p_id integer)
- os_defeito_salvar(p_id_os integer, p_descricao text, p_id integer, p_id_area integer)
- os_defeito_salvar_legado(p_id_os integer, p_descricao text, p_id integer)
- os_defeitos_listar(p_id_os integer)
- os_detalhe_dados(p_id_os integer)
- os_distribuicao_dados(p_id_empresa integer)
- os_distribuir_producao(p_id_os_peca integer, p_id_tecnico integer, p_id_usuario integer)
- os_distribuir_servico(p_id_servico_os integer, p_id_tecnico integer, p_id_usuario integer)
- os_faturamento_dados()
- os_faturar(p jsonb)
- os_lancar_peca(p jsonb)
- os_lancar_producao(p jsonb)
- os_patio_consumo(p_id_colaborador integer, p_id_os integer, p_id_produto integer, p_qtd numeric, p_id_defeito integer)
- os_patio_contexto(p_prisma text)
- os_patio_defeito_acao(p_id_defeito integer, p_id_colaborador integer, p_acao text)
- os_patio_login(p_login text, p_senha text)
- os_patio_solicitar_peca(p_id_colaborador integer, p_id_os integer, p_id_produto integer, p_qtd numeric, p_id_defeito integer, p_observacao text)
- os_patio_tem_apont_aberto(p_id_os integer, p_id_colaborador integer)
- os_precificacao_dados(p_id_empresa integer)
- os_prisma_atribuir(p_id_os integer, p_id_prisma integer, p_id_usuario integer)
- os_prisma_excluir(p_id integer)
- os_prisma_salvar(p_id integer, p_numero text, p_id_vendedor integer, p_ativo boolean)
- os_prismas_dados(p_id_vendedor integer)
- os_prismas_livres(p_id_vendedor integer)
- os_producao_concluir(p_id_os_peca integer, p_id_usuario integer)
- os_produtos_dados()
- os_recalcular_totais(p_id_os integer)
- os_recarregar(p_id_os integer)
- os_remover_peca(p jsonb)
- os_salvar(p_id integer, p_numero text, p_id_empresa integer, p_id_cliente integer, p_id_veiculo integer, p_id_tipo_os integer, p_id_usuario_abertura integer, p_id_usuario_responsavel integer, p_status text, p_data_prevista date, p_km_entrada numeric, p_defeito_relatado text, p_observacao_interna text, p_id_vendedor integer, p_km_saida numeric, p_data_saida timestamp without time zone, p_valor_desconto numeric, p_observacao_cliente text)
- os_servico_criar_de_apontamentos(p_id_os integer, p_descricao text, p_valor_total numeric, p_apontamentos integer[], p_id_area integer, p_id_servico integer, p_id_usuario integer)
- os_servico_salvar(p_id_os integer, p_id_servico integer, p_descricao text, p_quantidade numeric, p_valor_unitario numeric, p_valor_total numeric, p_id_tecnico integer, p_status text, p_id integer, p_id_area integer, p_id_defeito integer)
- os_servico_salvar(p_id_os integer, p_id_servico integer, p_descricao text, p_quantidade numeric, p_valor_unitario numeric, p_valor_total numeric, p_id_tecnico integer, p_status text, p_id integer, p_id_area integer)
- os_solicitacoes_listar(p_id_empresa integer, p_status text)
- os_solicitar_peca(p_id_os integer, p_id_produto integer, p_quantidade numeric, p_valor_unitario numeric, p_id_usuario integer, p_consumo boolean, p_id_producao integer)
