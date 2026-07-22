-- ============================================================================
-- MIGRATION: Sistema de logs expandido + autenticação de aprovador
-- Data: 2026-07-22
-- ============================================================================
SET search_path TO "Teste ERP", public;

-- ═══════════════════════════════════════════════════════════════════
-- 1. CORRIGIR BUGS: drop funções que referenciam coluna renomeada
-- ═══════════════════════════════════════════════════════════════════

-- erp_desconto_maximo referenciava pd.desconto_maximo (agora desconto_maximo_vista)
DROP FUNCTION IF EXISTS public.erp_desconto_maximo(integer, integer, integer);

-- Versão antiga de erp_validar_desconto (5 params) — substituída pela nova (4 params)
DROP FUNCTION IF EXISTS public.erp_validar_desconto(integer, integer, integer, numeric, boolean);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Atualizar venda_solicitar_item — usa nova validação + aprovador
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.venda_solicitar_item(
  p_id_venda INTEGER,
  p_id_produto INTEGER,
  p_descricao TEXT,
  p_referencia TEXT DEFAULT NULL,
  p_quantidade NUMERIC DEFAULT 1,
  p_valor_unitario NUMERIC DEFAULT 0,
  p_percentual_desconto NUMERIC DEFAULT 0,
  p_valor_desconto NUMERIC DEFAULT 0,
  p_valor_total NUMERIC DEFAULT 0,
  p_id_usuario INTEGER DEFAULT NULL,
  p_lib_desconto BOOLEAN DEFAULT FALSE,
  p_id_aprovador INTEGER DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_venda "Teste ERP".vendas;
  v_exp "Teste ERP".expedicoes;
  v_item "Teste ERP".vendas_itens;
  v_num varchar;
  v_a_vista boolean;
  v_validacao jsonb;
BEGIN
  SELECT * INTO v_venda FROM "Teste ERP".vendas WHERE id = p_id_venda;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF v_venda.status = 'FATURADA' THEN RAISE EXCEPTION 'Venda já faturada'; END IF;
  IF v_venda.status = 'CANCELADA' THEN RAISE EXCEPTION 'Venda cancelada'; END IF;

  v_a_vista := v_venda.id_condicao_pagamento IS NULL;

  IF COALESCE(p_percentual_desconto, 0) > 0 AND p_id_produto IS NOT NULL THEN
    v_validacao := public.erp_validar_desconto(
      COALESCE(p_id_aprovador, p_id_usuario), p_id_produto, p_percentual_desconto, v_a_vista
    );
    IF NOT (v_validacao->>'permitido')::boolean THEN
      IF p_lib_desconto AND p_id_aprovador IS NOT NULL THEN
        PERFORM public.erp_log(p_id_aprovador, 'VENDAS', 'DESCONTO_LIBERADO',
          'vendas_itens', p_id_produto, NULL,
          jsonb_build_object(
            'percentual', p_percentual_desconto,
            'limite', (v_validacao->>'limite')::numeric,
            'origem', v_validacao->>'origem',
            'id_venda', p_id_venda,
            'solicitante', p_id_usuario
          ));
      ELSIF p_lib_desconto THEN
        PERFORM public.erp_log(p_id_usuario, 'VENDAS', 'DESCONTO_LIBERADO',
          'vendas_itens', p_id_produto, NULL,
          jsonb_build_object('percentual', p_percentual_desconto, 'limite', (v_validacao->>'limite')::numeric));
      ELSE
        RAISE EXCEPTION 'DESCONTO_EXCEDIDO|%', COALESCE(v_validacao->>'mensagem',
          'Desconto de ' || p_percentual_desconto || '% acima do permitido.');
      END IF;
    END IF;
  END IF;

  INSERT INTO "Teste ERP".vendas_itens
    (id_venda, tipo, id_produto, descricao, referencia,
     quantidade, valor_unitario, percentual_desconto, valor_desconto, valor_total)
  VALUES (
    p_id_venda, 'PRODUTO', p_id_produto,
    p_descricao, p_referencia,
    p_quantidade, p_valor_unitario,
    p_percentual_desconto, p_valor_desconto, p_valor_total
  ) RETURNING * INTO v_item;

  SELECT * INTO v_exp FROM "Teste ERP".expedicoes
  WHERE id_venda = p_id_venda AND status IN ('SOLICITADA','EM_SEPARACAO')
  ORDER BY id DESC LIMIT 1;

  IF NOT FOUND THEN
    v_num := 'SEP-' || TO_CHAR(now(), 'YYYYMMDD') || '-' ||
             LPAD(((SELECT COUNT(*) FROM "Teste ERP".expedicoes
                    WHERE criado_em::date = CURRENT_DATE) + 1)::text, 4, '0');

    INSERT INTO "Teste ERP".expedicoes
      (numero, id_empresa, id_venda, id_solicitante, status, data_solicitacao, id_centro_estoque)
    VALUES (v_num, v_venda.id_empresa, p_id_venda, p_id_usuario, 'SOLICITADA', now(),
            (SELECT id FROM "Teste ERP".centros_estoque WHERE id_empresa = v_venda.id_empresa ORDER BY id LIMIT 1))
    RETURNING * INTO v_exp;
  END IF;

  INSERT INTO "Teste ERP".expedicoes_itens
    (id_expedicao, id_produto, id_venda_item, quantidade_pedida, valor_unitario)
  VALUES (v_exp.id, p_id_produto, v_item.id, p_quantidade, p_valor_unitario);

  UPDATE "Teste ERP".vendas SET
    valor_total = COALESCE(
      (SELECT SUM(valor_total) FROM "Teste ERP".vendas_itens WHERE id_venda = p_id_venda), 0),
    atualizado_em = now()
  WHERE id = p_id_venda;

  RETURN json_build_object('ok', true, 'id_item', v_item.id,
                           'id_expedicao', v_exp.id, 'numero_sep', v_exp.numero);
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Corrigir login_erp — desconto_maximo → desconto_maximo_vista/prazo
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION "Teste ERP".login_erp(p_login text, p_senha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user record;
  v_grupos jsonb;
  v_permissoes jsonb;
  v_politicas jsonb;
BEGIN
  SELECT u.id, u.nome, u.login, u.email, u.perfil, u.segmento, u.id_pessoa, u.id_centro_custo,
         u.percentual_comissao, u.perc_comissao_servico, u.perc_comissao_peca
  INTO v_user
  FROM "Teste ERP".usuarios u
  WHERE lower(u.login) = lower(p_login)
    AND u.ativo = true
    AND u.senha_hash = extensions.crypt(p_senha, u.senha_hash);

  IF v_user IS NULL THEN RETURN NULL; END IF;

  UPDATE "Teste ERP".usuarios SET ultimo_acesso = now() WHERE id = v_user.id;

  SELECT jsonb_agg(jsonb_build_object('id', g.id, 'nome', g.nome))
  INTO v_grupos
  FROM "Teste ERP".usuarios_grupos ug
  JOIN "Teste ERP".grupos_acesso g ON g.id = ug.id_grupo AND g.ativo = true
  WHERE ug.id_usuario = v_user.id;

  SELECT jsonb_object_agg(sub.chave, jsonb_build_object(
    'visualizar', sub.v, 'incluir', sub.i, 'editar', sub.e,
    'excluir', sub.x, 'aprovar', sub.a, 'exportar', sub.exp,
    'ajustar_estoque', sub.ae, 'dar_desconto', sub.dd
  ))
  INTO v_permissoes
  FROM (
    SELECT m.chave,
      bool_or(gp.pode_visualizar) as v, bool_or(gp.pode_incluir) as i,
      bool_or(gp.pode_editar) as e, bool_or(gp.pode_excluir) as x,
      bool_or(gp.pode_aprovar) as a, bool_or(gp.pode_exportar) as exp,
      bool_or(COALESCE(gp.pode_ajustar_estoque, false)) as ae,
      bool_or(COALESCE(gp.pode_dar_desconto, false)) as dd
    FROM "Teste ERP".grupos_permissoes gp
    JOIN "Teste ERP".modulos m ON m.id = gp.id_modulo
    WHERE gp.id_grupo IN (
      SELECT ug2.id_grupo FROM "Teste ERP".usuarios_grupos ug2 WHERE ug2.id_usuario = v_user.id
    )
    GROUP BY m.chave
  ) sub;

  SELECT jsonb_agg(jsonb_build_object(
    'id_grupo_produto', pd.id_grupo_produto,
    'id_subgrupo_produto', pd.id_subgrupo_produto,
    'id_produto', pd.id_produto,
    'id_tabela_preco', pd.id_tabela_preco,
    'desconto_maximo_vista', pd.desconto_maximo_vista,
    'desconto_maximo_prazo', pd.desconto_maximo_prazo,
    'requer_aprovacao', pd.requer_aprovacao
  ))
  INTO v_politicas
  FROM "Teste ERP".politica_desconto pd
  WHERE pd.id_grupo_acesso IN (
    SELECT ug3.id_grupo FROM "Teste ERP".usuarios_grupos ug3 WHERE ug3.id_usuario = v_user.id
  );

  RETURN jsonb_build_object(
    'id', v_user.id, 'nome', v_user.nome, 'login', v_user.login,
    'email', v_user.email, 'perfil', v_user.perfil, 'segmento', v_user.segmento,
    'id_pessoa', v_user.id_pessoa, 'id_centro_custo', v_user.id_centro_custo,
    'percentual_comissao', v_user.percentual_comissao,
    'perc_comissao_servico', v_user.perc_comissao_servico,
    'perc_comissao_peca', v_user.perc_comissao_peca,
    'grupos', COALESCE(v_grupos, '[]'::jsonb),
    'permissoes', COALESCE(v_permissoes, '{}'::jsonb),
    'politicas_desconto', COALESCE(v_politicas, '[]'::jsonb)
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. Expandir log_acessos com tipo, mensagem, detalhes
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE log_acessos ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'INFO';
ALTER TABLE log_acessos ADD COLUMN IF NOT EXISTS mensagem TEXT;
ALTER TABLE log_acessos ADD COLUMN IF NOT EXISTS detalhes JSONB;

CREATE INDEX IF NOT EXISTS idx_log_acessos_tipo_criado ON log_acessos(tipo, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_log_acessos_modulo_criado ON log_acessos(modulo, criado_em DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 5. Atualizar erp_log para aceitar novos campos
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.erp_log(
  p_id_usuario INTEGER,
  p_modulo TEXT,
  p_acao TEXT,
  p_tabela TEXT,
  p_registro_id INTEGER,
  p_antes JSONB DEFAULT NULL,
  p_depois JSONB DEFAULT NULL,
  p_tipo TEXT DEFAULT 'INFO',
  p_mensagem TEXT DEFAULT NULL,
  p_detalhes JSONB DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO "Teste ERP".log_acessos
    (id_usuario, modulo, acao, tabela_afetada, registro_id, dados_anteriores, dados_novos,
     tipo, mensagem, detalhes, criado_em)
  VALUES (p_id_usuario, p_modulo, p_acao, p_tabela, p_registro_id, p_antes, p_depois,
     COALESCE(p_tipo, 'INFO'), p_mensagem, p_detalhes, now());
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 6. erp_log_erro — conveniência para RPCs capturarem exceções
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.erp_log_erro(
  p_id_usuario INTEGER,
  p_modulo TEXT,
  p_acao TEXT,
  p_mensagem TEXT,
  p_detalhes JSONB DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO "Teste ERP".log_acessos
    (id_usuario, modulo, acao, tabela_afetada, registro_id, tipo, mensagem, detalhes, criado_em)
  VALUES (p_id_usuario, p_modulo, p_acao, NULL, NULL, 'ERRO', p_mensagem, p_detalhes, now());
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 7. erp_log_frontend — RPC pública para frontend reportar erros
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.erp_log_frontend(
  p_id_usuario INTEGER DEFAULT NULL,
  p_modulo TEXT DEFAULT 'FRONTEND',
  p_acao TEXT DEFAULT 'ERRO_RPC',
  p_mensagem TEXT DEFAULT NULL,
  p_detalhes JSONB DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO "Teste ERP".log_acessos
    (id_usuario, modulo, acao, tabela_afetada, registro_id, tipo, mensagem, detalhes, criado_em)
  VALUES (p_id_usuario, p_modulo, p_acao, NULL, NULL, 'ERRO', p_mensagem, p_detalhes, now());
  RETURN jsonb_build_object('ok', true);
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 8. erp_autenticar_aprovador — login+senha para operações críticas
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.erp_autenticar_aprovador(
  p_login TEXT,
  p_senha TEXT,
  p_modulo TEXT,
  p_acao TEXT DEFAULT 'APROVACAO',
  p_contexto JSONB DEFAULT '{}'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user RECORD;
  v_pode_aprovar BOOLEAN := FALSE;
  v_modulo_id INTEGER;
BEGIN
  SELECT u.id, u.nome, u.login
  INTO v_user
  FROM "Teste ERP".usuarios u
  WHERE lower(u.login) = lower(p_login)
    AND u.ativo = true
    AND u.senha_hash = extensions.crypt(p_senha, u.senha_hash);

  IF v_user IS NULL THEN
    INSERT INTO "Teste ERP".log_acessos
      (id_usuario, modulo, acao, tipo, mensagem, detalhes, criado_em)
    VALUES (NULL, p_modulo, 'APROVACAO_FALHA', 'AUDITORIA',
      'Tentativa de aprovação com credenciais inválidas — login: ' || p_login,
      p_contexto, now());
    RETURN jsonb_build_object('ok', false, 'erro', 'Credenciais inválidas.');
  END IF;

  SELECT m.id INTO v_modulo_id FROM "Teste ERP".modulos m WHERE m.chave = p_modulo;

  IF v_modulo_id IS NOT NULL THEN
    SELECT bool_or(gp.pode_aprovar) INTO v_pode_aprovar
    FROM "Teste ERP".grupos_permissoes gp
    JOIN "Teste ERP".usuarios_grupos ug ON ug.id_grupo = gp.id_grupo
    WHERE ug.id_usuario = v_user.id AND gp.id_modulo = v_modulo_id;
  END IF;

  IF NOT COALESCE(v_pode_aprovar, false) THEN
    INSERT INTO "Teste ERP".log_acessos
      (id_usuario, modulo, acao, tipo, mensagem, detalhes, criado_em)
    VALUES (v_user.id, p_modulo, 'APROVACAO_SEM_PERMISSAO', 'AUDITORIA',
      v_user.nome || ' autenticou mas não tem permissão de aprovação no módulo ' || p_modulo,
      p_contexto, now());
    RETURN jsonb_build_object('ok', false, 'erro', v_user.nome || ' não tem permissão de aprovação neste módulo.');
  END IF;

  INSERT INTO "Teste ERP".log_acessos
    (id_usuario, modulo, acao, tipo, mensagem, detalhes, criado_em)
  VALUES (v_user.id, p_modulo, p_acao, 'AUDITORIA',
    v_user.nome || ' aprovou: ' || p_acao,
    jsonb_build_object('aprovador', v_user.nome, 'aprovador_id', v_user.id) || p_contexto,
    now());

  RETURN jsonb_build_object(
    'ok', true,
    'aprovador', jsonb_build_object('id', v_user.id, 'nome', v_user.nome, 'login', v_user.login)
  );
END $$;
