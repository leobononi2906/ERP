-- ============================================================
-- FIX_NOITE.sql — correções das quebras achadas na validação de 2026-08-17
-- Sessão "Cérebro de implantação". REVISAR antes de aplicar.
-- Aplicar no Supabase projeto vishxwdxqiygbxmtpfoy, schema "Teste ERP".
-- Tudo é aditivo/reversível. Ordem: críticas primeiro.
-- NÃO inclui decisões de negócio (ver RELATORIO_NOITE.md, seção 🟡).
-- ============================================================

-- ------------------------------------------------------------
-- FIX 3 (CRÍTICA) — baixa de título: contas_movimentos.tipo é varchar(2)
-- mas a RPC grava 'ENTRADA'/'SAIDA'. Alargar a coluna. (tabela vazia hoje)
-- ------------------------------------------------------------
ALTER TABLE "Teste ERP".contas_movimentos ALTER COLUMN tipo TYPE varchar(10);

-- ------------------------------------------------------------
-- FIX 5 (ALTA) — wrappers public faltando (o front chama via public)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_solicitar_produto(
  p_origem text, p_id_origem integer, p_id_produto integer, p_qtd numeric,
  p_id_usuario integer, p_id_unidade integer DEFAULT NULL, p_valor_unitario numeric DEFAULT NULL,
  p_id_centro_estoque integer DEFAULT NULL, p_prioridade integer DEFAULT 3,
  p_observacao text DEFAULT NULL, p_reservar boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'Teste ERP','public'
AS $$ SELECT "Teste ERP".fn_solicitar_produto(p_origem,p_id_origem,p_id_produto,p_qtd,p_id_usuario,
  p_id_unidade,p_valor_unitario,p_id_centro_estoque,p_prioridade,p_observacao,p_reservar); $$;

CREATE OR REPLACE FUNCTION public.fn_gerar_titulos_receber(
  p_origem text, p_id_origem integer, p_id_usuario integer DEFAULT NULL, p_reprocessar boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'Teste ERP','public'
AS $$ SELECT "Teste ERP".fn_gerar_titulos_receber(p_origem,p_id_origem,p_id_usuario,p_reprocessar); $$;

-- ------------------------------------------------------------
-- FIX 4 (ALTA) — os_salvar / os_servico_salvar: overload duplicado -> HTTP 300.
-- PRECISA CONFIRMAR A ASSINATURA EXATA (o read foi bloqueado na noite).
-- 1) rode a query de descoberta:
--    SELECT n.nspname, p.proname, p.pronargs,
--           pg_get_function_identity_arguments(p.oid) AS args
--    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE p.proname IN ('os_salvar','os_servico_salvar') AND n.nspname='public'
--    ORDER BY p.proname, p.pronargs;
-- 2) DROP a versão ANTIGA (a que NÃO tem p_ator / p_id_defeito), ex.:
--    DROP FUNCTION public.os_salvar(<lista de args da versão antiga, sem p_ator>);
--    DROP FUNCTION public.os_servico_salvar(<lista de args da versão antiga, sem p_id_defeito>);
-- Mantém só a versão nova (com p_ator / p_id_defeito), que já é a usada.

-- ------------------------------------------------------------
-- FIX 1 (CRÍTICA) — venda_faturar: remover valor_saldo (coluna GERADA) de
-- TODOS os INSERT INTO titulos. Reprodução da função com essa única mudança.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.venda_faturar(p jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_venda   "Teste ERP".vendas;
  v_forma   "Teste ERP".formas_pagamento;
  v_cond    "Teste ERP".condicoes_pagamento;
  v_tipo_op "Teste ERP".tipos_saida;
  v_credito jsonb;
  v_ator    int := nullif(p->>'_ator','')::int;
  v_lib     boolean := COALESCE((p->>'_lib_credito')::boolean, false);
  v_pend    int;
  v_cc_id           int;
  v_pc_nacional     int;
  v_pc_importado    int;
  v_pc_servicos     int;
  v_pc_frete        int;
  v_pc_ipi          int;
  v_valor_nacional  numeric := 0;
  v_valor_importado numeric := 0;
  v_valor_servicos  numeric := 0;
  v_valor_frete     numeric := 0;
  v_valor_ipi       numeric := 0;
  v_valor_desconto  numeric := 0;
  v_item            record;
  v_origem_prod     smallint;
  v_parcela         int;
  v_valor_parcela   numeric;
  v_venc            date;
  v_num_parcelas    int;
  v_parcelas_restantes int;
  v_perc_comissao   numeric;
  v_parcelas_in     jsonb := p->'parcelas';
  v_p_elem          jsonb;
  v_p_ord           int;
  v_pago            boolean;
  v_nsu             text := nullif(p->>'nsu','');
  v_num_transacao   text := nullif(p->>'num_transacao','');
  v_bandeira        text := nullif(p->>'bandeira','');
BEGIN
  SELECT * INTO v_venda FROM "Teste ERP".vendas WHERE id = (p->>'id_venda')::int FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF v_venda.status = 'FATURADA' THEN RAISE EXCEPTION 'Venda já faturada'; END IF;
  IF v_venda.status = 'CANCELADA' THEN RAISE EXCEPTION 'Venda cancelada'; END IF;

  SELECT COUNT(*) INTO v_pend FROM "Teste ERP".encomendas
  WHERE id_venda = v_venda.id AND status NOT IN ('RECEBIDA','CANCELADA','REPROVADA');
  IF v_pend > 0 THEN
    RETURN json_build_object('ok', false, 'msg', 'Venda tem ' || v_pend || ' encomenda(s) aguardando chegada.');
  END IF;

  SELECT COUNT(*) INTO v_pend FROM "Teste ERP".expedicoes
  WHERE id_venda = v_venda.id AND status IN ('SOLICITADA','EM_SEPARACAO','SEPARADA');
  IF v_pend > 0 THEN
    RETURN json_build_object('ok', false, 'msg', 'Venda tem separação pendente.');
  END IF;

  SELECT * INTO v_tipo_op FROM "Teste ERP".tipos_saida WHERE id = COALESCE(v_venda.id_tipo_saida, 7);

  SELECT * INTO v_forma FROM "Teste ERP".formas_pagamento
  WHERE id = COALESCE(nullif(p->>'id_forma_pagamento','')::int, v_venda.id_forma_pagamento);
  IF NOT FOUND THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;

  SELECT * INTO v_cond FROM "Teste ERP".condicoes_pagamento
  WHERE id = COALESCE(nullif(p->>'id_condicao_pagamento','')::int, v_venda.id_condicao_pagamento, 1);

  IF v_forma.usa_limite_credito AND COALESCE(v_tipo_op.mov_financeiro, true) THEN
    v_credito := public.erp_validar_credito(v_venda.id_cliente, COALESCE(v_venda.valor_total, 0));
    IF NOT (v_credito->>'ok')::boolean THEN
      IF v_lib AND public.erp_config('credito_permite_liberacao','S') = 'S' THEN
        PERFORM public.erp_exigir_aprovador(nullif(p->>'_id_aprovador','')::int, 'VENDAS');
        PERFORM public.erp_log(v_ator, 'VENDAS', 'CREDITO_LIBERADO', 'vendas', v_venda.id, null,
          jsonb_build_object('motivo', v_credito->>'motivo', 'valor', v_venda.valor_total,
                             'aprovador', nullif(p->>'_id_aprovador','')::int));
      ELSE
        RETURN json_build_object('ok', false, 'msg', v_credito->>'msg', 'credito', v_credito);
      END IF;
    END IF;
  END IF;

  v_cc_id := COALESCE(v_tipo_op.id_centro_custo, v_venda.id_centro_custo);

  SELECT id INTO v_pc_nacional  FROM "Teste ERP".plano_contas WHERE codigo = '1.1.1.1';
  SELECT id INTO v_pc_importado FROM "Teste ERP".plano_contas WHERE codigo = '1.1.1.2';
  SELECT id INTO v_pc_servicos  FROM "Teste ERP".plano_contas WHERE codigo = '1.1.2';
  SELECT id INTO v_pc_frete     FROM "Teste ERP".plano_contas WHERE codigo = '1.1.4';
  SELECT id INTO v_pc_ipi       FROM "Teste ERP".plano_contas WHERE codigo = '2.4.5';

  FOR v_item IN
    SELECT vi.tipo, vi.valor_total, vi.id_produto
    FROM "Teste ERP".vendas_itens vi WHERE vi.id_venda = v_venda.id
  LOOP
    IF v_item.tipo = 'PRODUTO' AND v_item.id_produto IS NOT NULL THEN
      SELECT origem INTO v_origem_prod FROM "Teste ERP".produtos WHERE id = v_item.id_produto;
      IF COALESCE(v_origem_prod, 0) = 0 THEN
        v_valor_nacional := v_valor_nacional + COALESCE(v_item.valor_total, 0);
      ELSE
        v_valor_importado := v_valor_importado + COALESCE(v_item.valor_total, 0);
      END IF;
    ELSIF v_item.tipo = 'SERVICO' THEN
      v_valor_servicos := v_valor_servicos + COALESCE(v_item.valor_total, 0);
    END IF;
  END LOOP;

  v_valor_frete    := COALESCE(v_venda.valor_frete, 0);
  v_valor_ipi      := COALESCE(v_venda.valor_ipi, 0);
  v_valor_desconto := COALESCE(v_venda.valor_desconto, 0);

  DELETE FROM "Teste ERP".vendas_rateio_financeiro WHERE id_venda = v_venda.id;

  IF v_valor_nacional > 0 THEN
    INSERT INTO "Teste ERP".vendas_rateio_financeiro (id_venda, tipo_linha, descricao, valor, id_plano_conta, id_centro_custo)
    VALUES (v_venda.id, 'PRODUTO_NACIONAL', 'Venda Produtos Nacional', v_valor_nacional, v_pc_nacional, v_cc_id);
  END IF;
  IF v_valor_importado > 0 THEN
    INSERT INTO "Teste ERP".vendas_rateio_financeiro (id_venda, tipo_linha, descricao, valor, id_plano_conta, id_centro_custo)
    VALUES (v_venda.id, 'PRODUTO_IMPORTADO', 'Venda Produtos Importados', v_valor_importado, v_pc_importado, v_cc_id);
  END IF;
  IF v_valor_servicos > 0 THEN
    INSERT INTO "Teste ERP".vendas_rateio_financeiro (id_venda, tipo_linha, descricao, valor, id_plano_conta, id_centro_custo)
    VALUES (v_venda.id, 'SERVICO', 'Venda Serviços', v_valor_servicos, v_pc_servicos, v_cc_id);
  END IF;
  IF v_valor_frete > 0 THEN
    INSERT INTO "Teste ERP".vendas_rateio_financeiro (id_venda, tipo_linha, descricao, valor, id_plano_conta, id_centro_custo)
    VALUES (v_venda.id, 'FRETE', 'Receita de Frete', v_valor_frete, v_pc_frete, v_cc_id);
  END IF;
  IF v_valor_ipi > 0 THEN
    INSERT INTO "Teste ERP".vendas_rateio_financeiro (id_venda, tipo_linha, descricao, valor, id_plano_conta, id_centro_custo)
    VALUES (v_venda.id, 'IPI', 'IPI sobre Vendas', v_valor_ipi, v_pc_ipi, v_cc_id);
  END IF;
  IF v_valor_desconto > 0 THEN
    INSERT INTO "Teste ERP".vendas_rateio_financeiro (id_venda, tipo_linha, descricao, valor, id_plano_conta, id_centro_custo)
    VALUES (v_venda.id, 'DESCONTO', 'Desconto Concedido', -v_valor_desconto, null, v_cc_id);
  END IF;

  IF COALESCE(v_tipo_op.mov_financeiro, true) THEN

    IF v_parcelas_in IS NOT NULL AND jsonb_typeof(v_parcelas_in) = 'array' AND jsonb_array_length(v_parcelas_in) > 0 THEN
      v_num_parcelas := jsonb_array_length(v_parcelas_in);
      FOR v_p_elem, v_p_ord IN
        SELECT value, ordinality FROM jsonb_array_elements(v_parcelas_in) WITH ORDINALITY
      LOOP
        v_valor_parcela := COALESCE((v_p_elem->>'valor')::numeric, 0);
        v_venc := COALESCE((v_p_elem->>'vencimento')::date, CURRENT_DATE);
        v_parcela := COALESCE((v_p_elem->>'numero')::int, v_p_ord);
        v_pago := COALESCE((v_p_elem->>'pago')::boolean, v_forma.modalidade = 'A_VISTA' OR v_venc <= CURRENT_DATE);
        INSERT INTO "Teste ERP".titulos
          (tipo, numero, parcela, id_empresa, id_cliente, id_forma_pagamento,
           id_plano_conta, id_centro_custo, origem, id_origem, numero_origem,
           data_emissao, data_vencimento, data_competencia,
           valor, valor_pago, status, data_baixa,
           nsu, num_transacao, bandeira)
        VALUES ('CR', v_venda.numero, v_parcela || '/' || v_num_parcelas,
                v_venda.id_empresa, v_venda.id_cliente, v_forma.id,
                v_pc_nacional, v_cc_id, 'VENDA', v_venda.id, v_venda.numero,
                CURRENT_DATE, v_venc, CURRENT_DATE,
                v_valor_parcela,
                CASE WHEN v_pago THEN v_valor_parcela ELSE 0 END,
                CASE WHEN v_pago THEN 'PAGO' ELSE 'ABERTO' END,
                CASE WHEN v_pago THEN CURRENT_DATE ELSE NULL END,
                v_nsu, v_num_transacao, v_bandeira);
      END LOOP;

    ELSE
      v_num_parcelas := COALESCE(v_cond.num_parcelas, 1);

      IF v_forma.gera_parcelas AND v_num_parcelas > 1 THEN
        IF COALESCE(v_cond.entrada, false) THEN
          v_valor_parcela := ROUND(COALESCE(v_venda.valor_total, 0) / v_num_parcelas, 2);
          INSERT INTO "Teste ERP".titulos
            (tipo, numero, parcela, id_empresa, id_cliente, id_forma_pagamento,
             id_plano_conta, id_centro_custo, origem, id_origem, numero_origem,
             data_emissao, data_vencimento, data_competencia,
             valor, valor_pago, status, data_baixa)
          VALUES ('CR', v_venda.numero, '0/' || v_num_parcelas,
                  v_venda.id_empresa, v_venda.id_cliente, v_forma.id,
                  v_pc_nacional, v_cc_id, 'VENDA', v_venda.id, v_venda.numero,
                  CURRENT_DATE, CURRENT_DATE, CURRENT_DATE,
                  v_valor_parcela, v_valor_parcela, 'PAGO', CURRENT_DATE);

          v_parcelas_restantes := v_num_parcelas - 1;
          FOR v_parcela IN 1..v_parcelas_restantes LOOP
            v_venc := CURRENT_DATE + (v_parcela * COALESCE(v_cond.intervalo_dias, 30));
            IF v_parcela = v_parcelas_restantes THEN
              v_valor_parcela := COALESCE(v_venda.valor_total, 0) - (ROUND(COALESCE(v_venda.valor_total, 0) / v_num_parcelas, 2) * (v_num_parcelas - 1));
            ELSE
              v_valor_parcela := ROUND(COALESCE(v_venda.valor_total, 0) / v_num_parcelas, 2);
            END IF;
            INSERT INTO "Teste ERP".titulos
              (tipo, numero, parcela, id_empresa, id_cliente, id_forma_pagamento,
               id_plano_conta, id_centro_custo, origem, id_origem, numero_origem,
               data_emissao, data_vencimento, data_competencia,
               valor, status)
            VALUES ('CR', v_venda.numero, v_parcela || '/' || v_num_parcelas,
                    v_venda.id_empresa, v_venda.id_cliente, v_forma.id,
                    v_pc_nacional, v_cc_id, 'VENDA', v_venda.id, v_venda.numero,
                    CURRENT_DATE, v_venc, CURRENT_DATE,
                    v_valor_parcela, 'ABERTO');
          END LOOP;

        ELSE
          FOR v_parcela IN 1..v_num_parcelas LOOP
            v_venc := CURRENT_DATE + (v_parcela * COALESCE(v_cond.intervalo_dias, 30));
            IF v_parcela = v_num_parcelas THEN
              v_valor_parcela := COALESCE(v_venda.valor_total, 0) - (ROUND(COALESCE(v_venda.valor_total, 0) / v_num_parcelas, 2) * (v_num_parcelas - 1));
            ELSE
              v_valor_parcela := ROUND(COALESCE(v_venda.valor_total, 0) / v_num_parcelas, 2);
            END IF;
            INSERT INTO "Teste ERP".titulos
              (tipo, numero, parcela, id_empresa, id_cliente, id_forma_pagamento,
               id_plano_conta, id_centro_custo, origem, id_origem, numero_origem,
               data_emissao, data_vencimento, data_competencia,
               valor, status)
            VALUES ('CR', v_venda.numero, v_parcela || '/' || v_num_parcelas,
                    v_venda.id_empresa, v_venda.id_cliente, v_forma.id,
                    v_pc_nacional, v_cc_id, 'VENDA', v_venda.id, v_venda.numero,
                    CURRENT_DATE, v_venc, CURRENT_DATE,
                    v_valor_parcela, 'ABERTO');
          END LOOP;
        END IF;

      ELSE
        INSERT INTO "Teste ERP".titulos
          (tipo, numero, parcela, id_empresa, id_cliente, id_forma_pagamento,
           id_plano_conta, id_centro_custo, origem, id_origem, numero_origem,
           data_emissao, data_vencimento, data_competencia,
           valor, valor_pago, status, data_baixa,
           nsu, num_transacao, bandeira)
        VALUES ('CR', v_venda.numero, '1/1',
                v_venda.id_empresa, v_venda.id_cliente, v_forma.id,
                v_pc_nacional, v_cc_id, 'VENDA', v_venda.id, v_venda.numero,
                CURRENT_DATE, CURRENT_DATE, CURRENT_DATE,
                COALESCE(v_venda.valor_total, 0), COALESCE(v_venda.valor_total, 0), 'PAGO', CURRENT_DATE,
                v_nsu, v_num_transacao, v_bandeira);
      END IF;
    END IF;
  END IF;

  IF COALESCE(v_tipo_op.gera_comissao, true) AND v_venda.id_vendedor IS NOT NULL THEN
    v_perc_comissao := COALESCE(v_venda.percentual_comissao, 0);
    IF v_perc_comissao <= 0 THEN
      SELECT COALESCE(percentual_comissao, 0) INTO v_perc_comissao FROM "Teste ERP".usuarios WHERE id = v_venda.id_vendedor;
    END IF;
    IF v_perc_comissao > 0 THEN
      INSERT INTO "Teste ERP".vendas_comissoes (id_venda, id_vendedor, percentual, valor_base, valor_comissao, status)
      VALUES (v_venda.id, v_venda.id_vendedor, v_perc_comissao, COALESCE(v_venda.valor_total, 0),
              ROUND(COALESCE(v_venda.valor_total, 0) * v_perc_comissao / 100, 2), 'PENDENTE');
    END IF;
  END IF;

  UPDATE "Teste ERP".vendas SET
    status = 'FATURADA',
    id_centro_custo = COALESCE(v_cc_id, id_centro_custo),
    id_forma_pagamento = v_forma.id,
    id_condicao_pagamento = v_cond.id,
    data_faturamento = now(),
    atualizado_em = now()
  WHERE id = v_venda.id;

  PERFORM public.erp_log(v_ator, 'VENDAS', 'FATURAMENTO', 'vendas', v_venda.id,
    jsonb_build_object('status', v_venda.status),
    jsonb_build_object('status', 'FATURADA', 'forma', v_forma.descricao, 'valor', v_venda.valor_total,
      'nsu', v_nsu, 'parcelas_editadas', (v_parcelas_in IS NOT NULL),
      'rateio', jsonb_build_object('nacional', v_valor_nacional, 'importado', v_valor_importado,
        'servicos', v_valor_servicos, 'frete', v_valor_frete, 'ipi', v_valor_ipi)));

  RETURN json_build_object('ok', true, 'msg', 'Venda faturada com sucesso');
END;
$function$;

-- ------------------------------------------------------------
-- FIX 2 (CRÍTICA) + FIX 6 (ALTA, lógica) — os_faturar:
--   (a) ramo parcelado: 14 colunas x 15 valores -> remover v_valor_parcela duplicado.
--   (b) ramo parcela única: respeitar a condição a prazo (vencimento = hoje + intervalo_dias;
--       só marca PAGO quando à vista, intervalo_dias=0). << mudança de LÓGICA, revisar >>
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.os_faturar(p jsonb)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_os       "Teste ERP".ordens_servico;
  v_tipo     "Teste ERP".tipos_saida;
  v_forma    "Teste ERP".formas_pagamento;
  v_cond     "Teste ERP".condicoes_pagamento;
  v_credito  jsonb;
  v_parcela  int;
  v_valor_parcela numeric;
  v_venc     date;
  v_ator     int := nullif(p->>'_ator','')::int;
  v_mov_fin  boolean := true;
  v_gera_com boolean := true;
  v_vendedor "Teste ERP".usuarios;
  v_tecnico  "Teste ERP".usuarios;
  v_rec      record;
  v_val_base numeric;
  v_val_com  numeric;
  v_lib boolean := COALESCE((p->>'_lib_credito')::boolean, false);
  v_pend int;
  v_avista boolean;
BEGIN
  SELECT * INTO v_os FROM "Teste ERP".ordens_servico WHERE id = (p->>'id_os')::int FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OS não encontrada'; END IF;
  IF v_os.status = 'FATURADA' THEN RAISE EXCEPTION 'OS já faturada'; END IF;
  IF v_os.cancelada THEN RAISE EXCEPTION 'OS cancelada'; END IF;

  SELECT COUNT(*) INTO v_pend FROM "Teste ERP".encomendas
  WHERE id_os = v_os.id AND status NOT IN ('RECEBIDA','CANCELADA','REPROVADA');
  IF v_pend > 0 THEN
    RETURN json_build_object('ok', false, 'msg', 'OS tem ' || v_pend || ' encomenda(s) aguardando chegada. Receba ou cancele antes de faturar.');
  END IF;

  SELECT COUNT(*) INTO v_pend FROM "Teste ERP".os_pecas
  WHERE id_os = v_os.id AND produzido = true AND COALESCE(status,'PENDENTE') <> 'CONCLUIDO';
  IF v_pend > 0 THEN
    RETURN json_build_object('ok', false, 'msg', 'OS tem ' || v_pend || ' produção(ões) não concluída(s). Conclua antes de faturar.');
  END IF;

  IF v_os.id_tipo_saida IS NOT NULL THEN
    SELECT * INTO v_tipo FROM "Teste ERP".tipos_saida WHERE id = v_os.id_tipo_saida;
    IF FOUND THEN
      v_mov_fin  := COALESCE(v_tipo.mov_financeiro, true);
      v_gera_com := COALESCE(v_tipo.gera_comissao, true);
    END IF;
  END IF;

  SELECT * INTO v_forma FROM "Teste ERP".formas_pagamento
    WHERE id = COALESCE(nullif(p->>'id_forma_pagamento','')::int, v_os.id_forma_pagamento);
  IF NOT FOUND THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;

  SELECT * INTO v_cond FROM "Teste ERP".condicoes_pagamento
    WHERE id = COALESCE(nullif(p->>'id_condicao_pagamento','')::int, v_os.id_condicao_pagamento, 1);

  IF v_mov_fin THEN
    IF v_forma.usa_limite_credito THEN
      v_credito := public.erp_validar_credito(v_os.id_cliente, COALESCE(v_os.valor_total, 0));
      IF NOT (v_credito->>'ok')::boolean THEN
        IF v_lib AND public.erp_config('credito_permite_liberacao','S') = 'S' THEN
          PERFORM public.erp_exigir_aprovador(nullif(p->>'_id_aprovador','')::int, 'OS');
          PERFORM public.erp_log(v_ator, 'OS', 'CREDITO_LIBERADO', 'ordens_servico', v_os.id, null,
            jsonb_build_object('motivo', v_credito->>'motivo', 'valor', v_os.valor_total, 'credito', v_credito,
                               'aprovador', nullif(p->>'_id_aprovador','')::int));
        ELSE
          RETURN json_build_object('ok', false, 'msg', v_credito->>'msg', 'credito', v_credito);
        END IF;
      END IF;
    END IF;

    IF v_forma.gera_parcelas AND v_cond.num_parcelas > 1 THEN
      v_valor_parcela := ROUND(COALESCE(v_os.valor_total, 0) / v_cond.num_parcelas, 2);
      FOR v_parcela IN 1..v_cond.num_parcelas LOOP
        v_venc := CURRENT_DATE + (v_parcela * COALESCE(v_cond.intervalo_dias, 30));
        INSERT INTO "Teste ERP".titulos
          (tipo, numero, parcela, id_empresa, id_cliente, id_forma_pagamento,
           origem, id_origem, numero_origem,
           data_emissao, data_vencimento, data_competencia,
           valor, status)
        VALUES ('CR', v_os.numero, v_parcela::text || '/' || v_cond.num_parcelas,
                v_os.id_empresa, v_os.id_cliente, v_forma.id,
                'OS', v_os.id, v_os.numero,
                CURRENT_DATE, v_venc, CURRENT_DATE,
                v_valor_parcela, 'ABERTO');
      END LOOP;
    ELSE
      -- parcela única: respeita condição a prazo
      v_avista := COALESCE(v_cond.intervalo_dias, 0) = 0;
      v_venc := CURRENT_DATE + COALESCE(v_cond.intervalo_dias, 0);
      IF v_avista THEN
        INSERT INTO "Teste ERP".titulos
          (tipo, numero, parcela, id_empresa, id_cliente, id_forma_pagamento,
           origem, id_origem, numero_origem,
           data_emissao, data_vencimento, data_competencia,
           valor, valor_pago, status, data_baixa)
        VALUES ('CR', v_os.numero, '1/1',
                v_os.id_empresa, v_os.id_cliente, v_forma.id,
                'OS', v_os.id, v_os.numero,
                CURRENT_DATE, CURRENT_DATE, CURRENT_DATE,
                COALESCE(v_os.valor_total, 0), COALESCE(v_os.valor_total, 0),
                'PAGO', CURRENT_DATE);
      ELSE
        INSERT INTO "Teste ERP".titulos
          (tipo, numero, parcela, id_empresa, id_cliente, id_forma_pagamento,
           origem, id_origem, numero_origem,
           data_emissao, data_vencimento, data_competencia,
           valor, status)
        VALUES ('CR', v_os.numero, '1/1',
                v_os.id_empresa, v_os.id_cliente, v_forma.id,
                'OS', v_os.id, v_os.numero,
                CURRENT_DATE, v_venc, CURRENT_DATE,
                COALESCE(v_os.valor_total, 0), 'ABERTO');
      END IF;
    END IF;
  END IF;

  IF v_gera_com THEN
    IF v_os.id_usuario_responsavel IS NOT NULL THEN
      SELECT * INTO v_vendedor FROM "Teste ERP".usuarios WHERE id = v_os.id_usuario_responsavel;
      IF FOUND THEN
        SELECT COALESCE(SUM(valor_total), 0) INTO v_val_base
        FROM "Teste ERP".os_servicos WHERE id_os = v_os.id;
        IF v_val_base > 0 AND COALESCE(v_vendedor.perc_comissao_servico, 0) > 0 THEN
          v_val_com := ROUND(v_val_base * v_vendedor.perc_comissao_servico / 100, 2);
          INSERT INTO "Teste ERP".os_comissoes
            (id_os, id_vendedor, tipo, percentual, valor_base, valor_comissao, status)
          VALUES (v_os.id, v_vendedor.id, 'VENDEDOR_SERVICO',
                  v_vendedor.perc_comissao_servico, v_val_base, v_val_com, 'PENDENTE');
        END IF;

        SELECT COALESCE(SUM(valor_total), 0) INTO v_val_base
        FROM "Teste ERP".os_pecas WHERE id_os = v_os.id AND COALESCE(consumo,false) = false;
        IF v_val_base > 0 AND COALESCE(v_vendedor.perc_comissao_peca, 0) > 0 THEN
          v_val_com := ROUND(v_val_base * v_vendedor.perc_comissao_peca / 100, 2);
          INSERT INTO "Teste ERP".os_comissoes
            (id_os, id_vendedor, tipo, percentual, valor_base, valor_comissao, status)
          VALUES (v_os.id, v_vendedor.id, 'VENDEDOR_PECA',
                  v_vendedor.perc_comissao_peca, v_val_base, v_val_com, 'PENDENTE');
        END IF;
      END IF;
    END IF;

    FOR v_rec IN
      SELECT s.id_tecnico, SUM(s.valor_total) AS total_servicos
      FROM "Teste ERP".os_servicos s
      WHERE s.id_os = v_os.id AND s.id_tecnico IS NOT NULL
      GROUP BY s.id_tecnico
    LOOP
      SELECT * INTO v_tecnico FROM "Teste ERP".usuarios WHERE id = v_rec.id_tecnico;
      IF FOUND AND COALESCE(v_tecnico.perc_comissao_servico, 0) > 0 AND v_rec.total_servicos > 0 THEN
        v_val_com := ROUND(v_rec.total_servicos * v_tecnico.perc_comissao_servico / 100, 2);
        INSERT INTO "Teste ERP".os_comissoes
          (id_os, id_vendedor, tipo, percentual, valor_base, valor_comissao, status)
        VALUES (v_os.id, v_tecnico.id, 'TECNICO_SERVICO',
                v_tecnico.perc_comissao_servico, v_rec.total_servicos, v_val_com, 'PENDENTE');
      END IF;
    END LOOP;

    FOR v_rec IN
      SELECT pc.id_tecnico, SUM(pc.valor_total) AS total_pecas
      FROM "Teste ERP".os_pecas pc
      WHERE pc.id_os = v_os.id AND pc.id_tecnico IS NOT NULL AND COALESCE(pc.consumo,false) = false
      GROUP BY pc.id_tecnico
    LOOP
      SELECT * INTO v_tecnico FROM "Teste ERP".usuarios WHERE id = v_rec.id_tecnico;
      IF FOUND AND COALESCE(v_tecnico.perc_comissao_peca, 0) > 0 AND v_rec.total_pecas > 0 THEN
        v_val_com := ROUND(v_rec.total_pecas * v_tecnico.perc_comissao_peca / 100, 2);
        INSERT INTO "Teste ERP".os_comissoes
          (id_os, id_vendedor, tipo, percentual, valor_base, valor_comissao, status)
        VALUES (v_os.id, v_tecnico.id, 'TECNICO_PECA',
                v_tecnico.perc_comissao_peca, v_rec.total_pecas, v_val_com, 'PENDENTE');
      END IF;
    END LOOP;
  END IF;

  UPDATE "Teste ERP".ordens_servico SET
    status = 'FATURADA',
    id_forma_pagamento = v_forma.id,
    id_condicao_pagamento = v_cond.id,
    data_saida = now(),
    atualizado_em = now()
  WHERE id = v_os.id;

  PERFORM public.erp_log(v_ator, 'OS', 'FATURAMENTO', 'ordens_servico', v_os.id,
    jsonb_build_object('status', v_os.status),
    jsonb_build_object('status', 'FATURADA', 'forma', v_forma.descricao,
                       'valor', v_os.valor_total, 'mov_financeiro', v_mov_fin,
                       'gera_comissao', v_gera_com));

  RETURN json_build_object('ok', true, 'msg', 'OS faturada com sucesso',
                           'mov_financeiro', v_mov_fin, 'gera_comissao', v_gera_com);
END $function$;

-- ------------------------------------------------------------
-- FIX 7 (ALTA) — erp_separacao_entregar: checar retorno de erp_baixar_estoque
-- (aborta a entrega se a baixa falhar). Só a linha do v_res ganhou a checagem.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION "Teste ERP".erp_separacao_entregar(p_id integer, p_entregue_para character varying, p_id_usuario integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP', 'public'
AS $function$
DECLARE
  v_exp expedicoes%ROWTYPE;
  v_item expedicoes_itens%ROWTYPE;
  v_res jsonb;
BEGIN
  IF p_entregue_para NOT IN ('VENDAS', 'PATIO') THEN
    RAISE EXCEPTION 'Destino de entrega inválido — use VENDAS ou PATIO';
  END IF;

  SELECT * INTO v_exp FROM expedicoes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_exp.status <> 'SEPARADA' THEN
    RAISE EXCEPTION 'Só é possível registrar entrega de solicitações com status SEPARADA';
  END IF;

  FOR v_item IN SELECT * FROM expedicoes_itens WHERE id_expedicao = p_id AND COALESCE(quantidade_separada,0) > 0 LOOP
    UPDATE estoque_reservas SET ativo = false
    WHERE origem = 'SEPARACAO' AND id_referencia = p_id AND id_produto = v_item.id_produto AND ativo = true;

    UPDATE estoque_saldos
       SET estoque_reservado = GREATEST(COALESCE(estoque_reservado,0) - v_item.quantidade_separada, 0)
     WHERE id_produto = v_item.id_produto AND id_centro = v_exp.id_centro_estoque;

    v_res := public.erp_baixar_estoque(v_item.id_produto, v_item.quantidade_separada,
      v_exp.id_empresa, CASE WHEN v_exp.id_os IS NOT NULL THEN 'OS' ELSE 'VENDA' END,
      COALESCE(v_exp.id_os, v_exp.id_venda), v_exp.numero, p_id_usuario, v_exp.id_centro_estoque);

    IF NOT COALESCE((v_res->>'ok')::boolean, false) THEN
      RAISE EXCEPTION 'Falha ao baixar estoque na entrega: %', COALESCE(v_res->>'msg','erro desconhecido');
    END IF;

    IF v_item.id_venda_item IS NOT NULL THEN
      UPDATE vendas_itens SET movimentou_estoque = true WHERE id = v_item.id_venda_item;
    END IF;
    IF v_item.id_os_peca IS NOT NULL THEN
      UPDATE os_pecas SET movimentou_estoque = true WHERE id = v_item.id_os_peca;
    END IF;
  END LOOP;

  UPDATE expedicoes SET status = 'ENTREGUE', entregue_para = p_entregue_para, data_entrega = now()
   WHERE id = p_id;

  IF v_exp.id_os IS NOT NULL THEN
    PERFORM public.os_recalcular_totais(v_exp.id_os);
  END IF;

  RETURN jsonb_build_object('ok', true);
END $function$;

-- ------------------------------------------------------------
-- FIX 8 (ALTA) — os_producao_concluir: custo zero quando produto sem composição
-- e sem custo médio. Fallback: custo_real -> preco_custo. (única mudança: bloco de fallback)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.os_producao_concluir(p_id_os_peca integer, p_id_usuario integer DEFAULT NULL::integer)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  r "Teste ERP".os_pecas; v_os "Teste ERP".ordens_servico;
  v_modo text := public.erp_config('op_custo_modo','COMPOSICAO');
  v_custo_comp numeric; v_custo_real numeric; v_custo numeric;
  v_ent jsonb; v_sai jsonb;
BEGIN
  SELECT * INTO r FROM "Teste ERP".os_pecas WHERE id = p_id_os_peca FOR UPDATE;
  IF NOT FOUND OR r.produzido = false THEN RAISE EXCEPTION 'Item de produção não encontrado'; END IF;
  IF r.status = 'CONCLUIDO' THEN RAISE EXCEPTION 'Produção já concluída'; END IF;
  SELECT * INTO v_os FROM "Teste ERP".ordens_servico WHERE id = r.id_os;

  v_custo_comp := COALESCE(r.custo_composicao,
    COALESCE((SELECT SUM(quantidade * custo_unitario) FROM "Teste ERP".produtos_composicao WHERE id_produto = r.id_produto), 0) * r.quantidade);

  SELECT COALESCE(SUM(valor_total), 0) INTO v_custo_real
  FROM "Teste ERP".os_pecas WHERE id_producao = r.id AND consumo = true;

  v_custo := CASE WHEN v_modo = 'REAL' AND v_custo_real > 0 THEN v_custo_real ELSE v_custo_comp END;

  -- FIX: fallback quando o custo ficou 0 (sem BOM e sem custo médio)
  IF COALESCE(v_custo, 0) = 0 THEN
    v_custo := COALESCE(NULLIF(v_custo_real, 0),
                        (SELECT COALESCE(preco_custo,0) FROM "Teste ERP".produtos WHERE id = r.id_produto) * r.quantidade,
                        0);
  END IF;

  v_ent := public.erp_entrada_estoque(r.id_produto, r.quantidade,
    CASE WHEN r.quantidade > 0 THEN ROUND(v_custo / r.quantidade, 4) ELSE 0 END,
    v_os.id_empresa, 'PRODUCAO_OS', v_os.id, v_os.numero, p_id_usuario, true, null);
  IF NOT (v_ent->>'ok')::boolean THEN RETURN json_build_object('ok', false, 'msg', v_ent->>'msg'); END IF;

  v_sai := public.erp_baixar_estoque(r.id_produto, r.quantidade, v_os.id_empresa,
    'OS', v_os.id, v_os.numero, p_id_usuario);

  UPDATE "Teste ERP".os_pecas SET status = 'CONCLUIDO', movimentou_estoque = true,
    custo_composicao = v_custo_comp, custo_real = v_custo_real
  WHERE id = r.id;

  PERFORM public.erp_log(p_id_usuario, 'OS', 'PRODUCAO_CONCLUIDA', 'os_pecas', r.id, null,
    jsonb_build_object('modo_custo', v_modo, 'custo_composicao', v_custo_comp, 'custo_real', v_custo_real, 'custo_usado', v_custo));

  RETURN json_build_object('ok', true, 'modo_custo', v_modo,
    'custo_composicao', v_custo_comp, 'custo_real', v_custo_real, 'custo_usado', v_custo);
END $function$;

-- ============================================================
-- DECISÕES DE NEGÓCIO (ver RELATORIO_NOITE.md 🟡) — NÃO aplicar sem o Leo:
--   solicitação->picking; baixa antes do gate de crédito; unificar 2 lógicas de título;
--   ponto único de baixa do consumo; conta financeira empresa 5; custo médio por centro;
--   validar conta x empresa no caixa; centro por principal=true.
-- ============================================================
