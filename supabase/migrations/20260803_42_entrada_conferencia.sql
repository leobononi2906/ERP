-- 42 — Conferência de recebimento (entrada de NF)
-- Acrescenta um passo de conferência física antes de finalizar a entrada:
-- o conferente conta e lança a quantidade conferida por item (conferência cega),
-- o sistema mostra divergências e o estoque entra pela quantidade CONFERIDA.
-- Não-quebrável: sem conferência (quantidade_conferida NULL) o finalizar age como antes.

-- 1) Colunas -----------------------------------------------------------------
ALTER TABLE "Teste ERP".compras_recebimento_itens
  ADD COLUMN IF NOT EXISTS quantidade_conferida numeric;

ALTER TABLE "Teste ERP".compras_recebimento
  ADD COLUMN IF NOT EXISTS conferida boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conferido_por integer,
  ADD COLUMN IF NOT EXISTS conferido_em timestamp without time zone,
  ADD COLUMN IF NOT EXISTS conferencia_cega boolean NOT NULL DEFAULT true;

-- 2) RPC: gravar conferência --------------------------------------------------
CREATE OR REPLACE FUNCTION "Teste ERP".erp_entrada_conferir(
  p_id integer, p_itens jsonb, p_id_usuario integer DEFAULT NULL, p_finalizar boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_ent record; v_it jsonb; v_div jsonb := '[]'::jsonb; v_qtd_conf numeric; v_n integer := 0;
BEGIN
  SELECT * INTO v_ent FROM "Teste ERP".compras_recebimento WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'erro', 'Entrada não encontrada.'); END IF;
  IF v_ent.status <> 'DIGITACAO' THEN RETURN jsonb_build_object('ok', false, 'erro', 'Só é possível conferir entradas em digitação.'); END IF;

  FOR v_it IN SELECT * FROM jsonb_array_elements(COALESCE(p_itens, '[]'::jsonb)) LOOP
    v_qtd_conf := NULLIF(v_it->>'quantidade_conferida', '')::numeric;
    UPDATE "Teste ERP".compras_recebimento_itens
      SET quantidade_conferida = v_qtd_conf
      WHERE id = (v_it->>'id')::integer AND id_recebimento = p_id;
    v_n := v_n + 1;
  END LOOP;

  -- monta lista de divergências (conferida <> quantidade da NF)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', ri.id, 'id_produto', ri.id_produto, 'descricao', ri.descricao,
           'quantidade', ri.quantidade, 'quantidade_conferida', ri.quantidade_conferida,
           'diferenca', COALESCE(ri.quantidade_conferida, ri.quantidade) - ri.quantidade)), '[]'::jsonb)
    INTO v_div
    FROM "Teste ERP".compras_recebimento_itens ri
    WHERE ri.id_recebimento = p_id
      AND ri.quantidade_conferida IS NOT NULL
      AND ri.quantidade_conferida <> ri.quantidade;

  IF p_finalizar THEN
    UPDATE "Teste ERP".compras_recebimento
      SET conferida = true, conferido_por = p_id_usuario, conferido_em = NOW()
      WHERE id = p_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'itens_conferidos', v_n,
    'total_divergencias', jsonb_array_length(v_div), 'divergencias', v_div);
END;
$function$;

CREATE OR REPLACE FUNCTION public.erp_entrada_conferir(
  p_id integer, p_itens jsonb, p_id_usuario integer DEFAULT NULL, p_finalizar boolean DEFAULT true
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'Teste ERP','public','pg_temp'
AS $function$ SELECT "Teste ERP".erp_entrada_conferir(p_id, p_itens, p_id_usuario, p_finalizar) $function$;

GRANT EXECUTE ON FUNCTION public.erp_entrada_conferir(integer, jsonb, integer, boolean) TO anon, authenticated, service_role;

-- 3) finalizar passa a lançar pela quantidade CONFERIDA (fallback = quantidade) --
CREATE OR REPLACE FUNCTION "Teste ERP".erp_entrada_finalizar(p_id integer, p_id_usuario integer, p_plano_contas jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_ent record; v_item record; v_saldo record;
  v_novo_estoque numeric; v_novo_custo numeric; v_qtd numeric;
  v_movimentos integer := 0; v_titulos integer := 0;
  v_pc_item jsonb; v_soma_plano numeric := 0; v_centro integer;
BEGIN
  SELECT * INTO v_ent FROM "Teste ERP".compras_recebimento WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'erro', 'Entrada não encontrada.'); END IF;
  IF v_ent.status <> 'DIGITACAO' THEN RETURN jsonb_build_object('ok', false, 'erro', 'Entrada não está em digitação.'); END IF;

  IF jsonb_array_length(p_plano_contas) > 0 THEN
    SELECT SUM((elem->>'valor')::numeric) INTO v_soma_plano FROM jsonb_array_elements(p_plano_contas) elem;
    IF ABS(v_soma_plano - v_ent.valor_total) > 0.01 THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Soma do plano de contas (' || v_soma_plano || ') não bate com valor total (' || v_ent.valor_total || ').');
    END IF;
  END IF;

  -- ENTRADA NO ESTOQUE (quantidade conferida quando houver)
  FOR v_item IN SELECT * FROM "Teste ERP".compras_recebimento_itens WHERE id_recebimento = p_id LOOP
    v_qtd := COALESCE(v_item.quantidade_conferida, v_item.quantidade);
    v_centro := COALESCE(v_item.id_centro_estoque, v_ent.id_centro_estoque);
    IF v_centro IS NULL OR COALESCE(v_qtd,0) = 0 THEN CONTINUE; END IF;
    SELECT * INTO v_saldo FROM "Teste ERP".estoque_saldos WHERE id_produto = v_item.id_produto AND id_centro = v_centro FOR UPDATE;
    v_novo_estoque := COALESCE(v_saldo.estoque_atual, 0) + v_qtd;
    IF v_novo_estoque > 0 THEN
      v_novo_custo := ROUND(((COALESCE(v_saldo.estoque_atual, 0) * COALESCE(v_saldo.custo_medio, 0)) + (v_qtd * COALESCE(v_item.custo_unitario_final, v_item.valor_unitario))) / v_novo_estoque, 4);
    ELSE v_novo_custo := COALESCE(v_item.custo_unitario_final, v_item.valor_unitario); END IF;

    INSERT INTO "Teste ERP".estoque_movimentos (id_produto, id_centro, id_empresa, tipo, origem, id_referencia, numero_referencia, quantidade, custo_unitario, custo_total, estoque_anterior, estoque_posterior, id_usuario, observacao)
    VALUES (v_item.id_produto, v_centro, v_ent.id_empresa, 'ENTRADA_COMPRA', 'COMPRAS', p_id, COALESCE(v_ent.numero_nf_fornecedor, v_ent.numero), v_qtd, COALESCE(v_item.custo_unitario_final, v_item.valor_unitario), v_qtd * COALESCE(v_item.custo_unitario_final, v_item.valor_unitario), COALESCE(v_saldo.estoque_atual, 0), v_novo_estoque, p_id_usuario, 'Entrada ' || v_ent.numero || ' NF ' || COALESCE(v_ent.numero_nf_fornecedor, '-'));

    IF v_saldo.id IS NOT NULL THEN
      UPDATE "Teste ERP".estoque_saldos SET estoque_atual = v_novo_estoque, custo_medio = v_novo_custo, ultima_entrada = NOW() WHERE id = v_saldo.id;
    ELSE
      INSERT INTO "Teste ERP".estoque_saldos (id_produto, id_centro, estoque_atual, custo_medio, ultima_entrada) VALUES (v_item.id_produto, v_centro, v_novo_estoque, v_novo_custo, NOW());
    END IF;
    UPDATE "Teste ERP".compras_recebimento_itens SET movimentou_estoque = true WHERE id = v_item.id;
    v_movimentos := v_movimentos + 1;
  END LOOP;

  -- ATUALIZA PEDIDO (pela quantidade conferida quando houver)
  IF v_ent.id_pedido IS NOT NULL THEN
    UPDATE "Teste ERP".pedidos_compra_itens pi
    SET quantidade_recebida = COALESCE(pi.quantidade_recebida, 0) + COALESCE(ri.quantidade_conferida, ri.quantidade),
        status = CASE WHEN COALESCE(pi.quantidade_recebida, 0) + COALESCE(ri.quantidade_conferida, ri.quantidade) >= pi.quantidade THEN 'RECEBIDO' ELSE 'RECEBIDO_PARCIAL' END
    FROM "Teste ERP".compras_recebimento_itens ri
    WHERE ri.id_recebimento = p_id AND ri.id_pedido_item = pi.id AND ri.id_pedido_item IS NOT NULL;

    IF NOT EXISTS (SELECT 1 FROM "Teste ERP".pedidos_compra_itens WHERE id_pedido = v_ent.id_pedido AND status <> 'RECEBIDO') THEN
      UPDATE "Teste ERP".pedidos_compra SET status = 'RECEBIDO', data_recebimento = CURRENT_DATE, atualizado_em = NOW() WHERE id = v_ent.id_pedido;
    ELSE
      UPDATE "Teste ERP".pedidos_compra SET status = 'RECEBIDO_PARCIAL', atualizado_em = NOW() WHERE id = v_ent.id_pedido AND status IN ('PENDENTE', 'APROVADO', 'ENVIADO');
    END IF;
  END IF;

  -- TITULOS A PAGAR
  IF jsonb_array_length(p_plano_contas) > 0 THEN
    FOR v_pc_item IN SELECT * FROM jsonb_array_elements(p_plano_contas) LOOP
      PERFORM "Teste ERP".erp_titulo_salvar(
        p_tipo := 'CP', p_id_empresa := v_ent.id_empresa, p_id_cliente := v_ent.id_fornecedor,
        p_numero := COALESCE(v_ent.numero_nf_fornecedor, v_ent.numero),
        p_parcela := COALESCE(v_pc_item->>'parcela', '1/1'),
        p_valor := (v_pc_item->>'valor')::numeric,
        p_data_vencimento := COALESCE((v_pc_item->>'data_vencimento')::date, CURRENT_DATE + 30),
        p_id_plano_conta := (v_pc_item->>'id_plano_conta')::integer,
        p_id_centro_custo := COALESCE((v_pc_item->>'id_centro_custo')::integer, v_ent.id_centro_custo),
        p_modalidade := 'NORMAL',
        p_observacao := COALESCE(v_pc_item->>'observacao', 'Entrada ' || v_ent.numero),
        p_id_usuario := p_id_usuario);
      v_titulos := v_titulos + 1;
    END LOOP;
  END IF;

  -- NF ENTRADA
  IF v_ent.numero_nf_fornecedor IS NOT NULL THEN
    INSERT INTO "Teste ERP".nfe_entrada (id_empresa, id_recebimento, id_fornecedor, numero, serie, chave_acesso, data_emissao, data_entrada, valor_produtos, valor_ipi, valor_st, valor_frete, valor_desconto, valor_total, status)
    VALUES (v_ent.id_empresa, p_id, v_ent.id_fornecedor, v_ent.numero_nf_fornecedor, v_ent.serie_nf, v_ent.chave_nfe, v_ent.data_emissao_nf, CURRENT_DATE, v_ent.valor_produtos, v_ent.valor_ipi, v_ent.valor_icms_st, v_ent.valor_frete, v_ent.valor_desconto, v_ent.valor_total, 'CONFIRMADA')
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE "Teste ERP".compras_recebimento SET status = 'CONFIRMADO' WHERE id = p_id;
  RETURN jsonb_build_object('ok', true, 'movimentos_estoque', v_movimentos, 'titulos_gerados', v_titulos);
END;
$function$;

-- 4) dados: expõe campos de conferência ao front ------------------------------
CREATE OR REPLACE FUNCTION "Teste ERP".erp_entrada_dados(p_id_empresa integer DEFAULT NULL::integer, p_status character varying DEFAULT NULL::character varying)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  RETURN jsonb_build_object(
    'entradas', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'data_recebimento' DESC) FROM (
        SELECT jsonb_build_object(
          'id', r1.id, 'numero', r1.numero, 'status', r1.status,
          'id_empresa', r1.id_empresa, 'id_fornecedor', r1.id_fornecedor,
          'fornecedor_nome', f1.nome,
          'id_pedido', r1.id_pedido, 'pedido_numero', pc1.numero,
          'id_centro_estoque', r1.id_centro_estoque, 'centro_nome', ce1.descricao,
          'numero_nf_fornecedor', r1.numero_nf_fornecedor, 'serie_nf', r1.serie_nf,
          'chave_nfe', r1.chave_nfe, 'data_emissao_nf', r1.data_emissao_nf,
          'data_recebimento', r1.data_recebimento,
          'valor_produtos', r1.valor_produtos, 'valor_frete', r1.valor_frete,
          'valor_ipi', r1.valor_ipi, 'valor_icms_st', r1.valor_icms_st,
          'valor_desconto', r1.valor_desconto, 'valor_outras', r1.valor_outras,
          'valor_total', r1.valor_total, 'observacao', r1.observacao,
          'id_condicao_pagamento', r1.id_condicao_pagamento,
          'id_centro_custo', r1.id_centro_custo, 'id_tipo_entrada', r1.id_tipo_entrada,
          'conferida', r1.conferida, 'conferido_por', r1.conferido_por,
          'conferido_em', r1.conferido_em, 'conferencia_cega', r1.conferencia_cega,
          'total_itens', (SELECT COUNT(*) FROM "Teste ERP".compras_recebimento_itens ri0 WHERE ri0.id_recebimento = r1.id),
          'itens', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', ri1.id, 'id_produto', ri1.id_produto, 'id_pedido_item', ri1.id_pedido_item,
              'descricao', ri1.descricao, 'quantidade', ri1.quantidade,
              'quantidade_conferida', ri1.quantidade_conferida,
              'valor_unitario', ri1.valor_unitario, 'valor_ipi', ri1.valor_ipi,
              'valor_icms_st', ri1.valor_icms_st, 'valor_total', ri1.valor_total,
              'id_centro_estoque', ri1.id_centro_estoque,
              'movimentou_estoque', ri1.movimentou_estoque,
              'custo_unitario_final', ri1.custo_unitario_final,
              'produto_ref', pp1.referencia
            ))
            FROM "Teste ERP".compras_recebimento_itens ri1
            LEFT JOIN "Teste ERP".produtos pp1 ON pp1.id = ri1.id_produto
            WHERE ri1.id_recebimento = r1.id
          ), '[]'::jsonb)
        ) as x
        FROM "Teste ERP".compras_recebimento r1
        JOIN "Teste ERP".fornecedores f1 ON f1.id = r1.id_fornecedor
        LEFT JOIN "Teste ERP".pedidos_compra pc1 ON pc1.id = r1.id_pedido
        LEFT JOIN "Teste ERP".centros_estoque ce1 ON ce1.id = r1.id_centro_estoque
        WHERE (p_id_empresa IS NULL OR r1.id_empresa = p_id_empresa)
          AND (p_status IS NULL OR r1.status = p_status)
      ) sub
    ), '[]'::jsonb),
    'pedidos_abertos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pc2.id, 'numero', pc2.numero, 'id_fornecedor', pc2.id_fornecedor,
        'fornecedor_nome', f2.nome, 'valor_total', pc2.valor_total, 'data_pedido', pc2.data_pedido
      ))
      FROM "Teste ERP".pedidos_compra pc2
      JOIN "Teste ERP".fornecedores f2 ON f2.id = pc2.id_fornecedor
      WHERE pc2.status IN ('PENDENTE', 'APROVADO', 'ENVIADO', 'RECEBIDO_PARCIAL')
    ), '[]'::jsonb),
    'fornecedores', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', f3.id, 'nome', f3.nome) ORDER BY f3.nome)
      FROM "Teste ERP".fornecedores f3 WHERE f3.ativo = true
    ), '[]'::jsonb),
    'centros_estoque', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', c3.id, 'descricao', c3.descricao, 'id_empresa', c3.id_empresa) ORDER BY c3.descricao)
      FROM "Teste ERP".centros_estoque c3 WHERE c3.ativo = true
    ), '[]'::jsonb),
    'empresas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', e3.id, 'nome', e3.nome) ORDER BY e3.nome)
      FROM "Teste ERP".empresas e3 WHERE e3.ativa = true
    ), '[]'::jsonb),
    'produtos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', p3.id, 'descricao', p3.nome, 'referencia', p3.referencia, 'unidade', u3.sigla) ORDER BY p3.nome)
      FROM "Teste ERP".produtos p3
      LEFT JOIN "Teste ERP".unidades u3 ON u3.id = p3.id_unidade
      WHERE p3.situacao = 'ATIVO'
    ), '[]'::jsonb),
    'plano_contas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', pl3.id, 'codigo', pl3.codigo, 'descricao', pl3.descricao) ORDER BY pl3.codigo)
      FROM "Teste ERP".plano_contas pl3 WHERE pl3.aceita_lancamento = true AND pl3.ativo = true
    ), '[]'::jsonb),
    'centros_custo', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', cc3.id, 'codigo', cc3.codigo, 'descricao', cc3.descricao) ORDER BY cc3.codigo)
      FROM "Teste ERP".centros_custo cc3 WHERE cc3.ativo = true
    ), '[]'::jsonb),
    'condicoes_pagamento', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', cp3.id, 'descricao', cp3.descricao) ORDER BY cp3.descricao)
      FROM "Teste ERP".condicoes_pagamento cp3 WHERE cp3.ativo = true
    ), '[]'::jsonb),
    'tipos_entrada', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', te3.id, 'descricao', te3.descricao) ORDER BY te3.descricao)
      FROM "Teste ERP".tipos_entrada te3
    ), '[]'::jsonb)
  );
END;
$function$;
