-- 20260804_51_permissoes_arvore_e_aux_cadastros
--
-- (1) Preenche modulos.grupo_menu para a árvore de permissões (Grupo → categoria → módulos).
-- (2) RPCs de cadastros auxiliares: Formas de Pagamento, Unidades, Áreas de Serviço,
--     Grupos e Subgrupos de Produto — dados + salvar (upsert) por entidade.

-- ── (1) Categorias de menu nos módulos ──────────────────────────────────────
UPDATE "Teste ERP".modulos SET grupo_menu = 'Comercial'  WHERE chave IN ('orcamentos','vendas','os');
UPDATE "Teste ERP".modulos SET grupo_menu = 'Cadastros'  WHERE chave IN ('clientes','produtos','veiculos','tipos_operacao');
UPDATE "Teste ERP".modulos SET grupo_menu = 'Estoque'    WHERE chave IN ('estoque','separacao');
UPDATE "Teste ERP".modulos SET grupo_menu = 'Compras'    WHERE chave IN ('compras');
UPDATE "Teste ERP".modulos SET grupo_menu = 'Financeiro' WHERE chave IN ('financeiro','financeiro_receber','financeiro_pagar','financeiro_caixa','fiscal');
UPDATE "Teste ERP".modulos SET grupo_menu = 'Sistema'    WHERE chave IN ('admin','configuracoes','relatorios');
UPDATE "Teste ERP".modulos SET grupo_menu = 'Geral'      WHERE chave IN ('dashboard');

-- ── (2) Cadastros auxiliares ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.erp_aux_cadastros_dados()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
  SELECT jsonb_build_object(
    'formas_pagamento', COALESCE((SELECT jsonb_agg(row_to_json(f)::jsonb ORDER BY f.descricao) FROM formas_pagamento f), '[]'::jsonb),
    'unidades',         COALESCE((SELECT jsonb_agg(row_to_json(u)::jsonb ORDER BY u.descricao) FROM unidades u), '[]'::jsonb),
    'areas_servico',    COALESCE((SELECT jsonb_agg(row_to_json(a)::jsonb ORDER BY a.descricao) FROM grupos_servico a), '[]'::jsonb),
    'grupos_produto',   COALESCE((SELECT jsonb_agg(row_to_json(g)::jsonb ORDER BY g.descricao) FROM grupos_produto g), '[]'::jsonb),
    'subgrupos_produto',COALESCE((SELECT jsonb_agg(row_to_json(s)::jsonb ORDER BY s.descricao) FROM subgrupos_produto s), '[]'::jsonb)
  );
$$;

-- Formas de pagamento
CREATE OR REPLACE FUNCTION public.erp_forma_pagamento_salvar(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_id integer := NULLIF((p->>'id')::text,'0')::integer;
BEGIN
  IF v_id IS NULL THEN
    INSERT INTO formas_pagamento (descricao,tipo,modalidade,usa_limite_credito,gera_parcelas,prazo_medio_dias,taxa_juros,ativo)
    VALUES (p->>'descricao', COALESCE(p->>'tipo','OUTROS'), COALESCE(p->>'modalidade','A_VISTA'),
            COALESCE((p->>'usa_limite_credito')::boolean,false), COALESCE((p->>'gera_parcelas')::boolean,false),
            COALESCE((p->>'prazo_medio_dias')::integer,0), COALESCE((p->>'taxa_juros')::numeric,0),
            COALESCE((p->>'ativo')::boolean,true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE formas_pagamento SET
      descricao=p->>'descricao', tipo=COALESCE(p->>'tipo',tipo), modalidade=COALESCE(p->>'modalidade',modalidade),
      usa_limite_credito=COALESCE((p->>'usa_limite_credito')::boolean,usa_limite_credito),
      gera_parcelas=COALESCE((p->>'gera_parcelas')::boolean,gera_parcelas),
      prazo_medio_dias=COALESCE((p->>'prazo_medio_dias')::integer,prazo_medio_dias),
      taxa_juros=COALESCE((p->>'taxa_juros')::numeric,taxa_juros),
      ativo=COALESCE((p->>'ativo')::boolean,ativo)
    WHERE id=v_id;
  END IF;
  RETURN jsonb_build_object('id', v_id);
END; $$;

-- Unidades
CREATE OR REPLACE FUNCTION public.erp_unidade_salvar(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_id integer := NULLIF((p->>'id')::text,'0')::integer;
BEGIN
  IF v_id IS NULL THEN
    INSERT INTO unidades (descricao,sigla,ativo)
    VALUES (p->>'descricao', p->>'sigla', COALESCE((p->>'ativo')::boolean,true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE unidades SET descricao=p->>'descricao', sigla=p->>'sigla', ativo=COALESCE((p->>'ativo')::boolean,ativo) WHERE id=v_id;
  END IF;
  RETURN jsonb_build_object('id', v_id);
END; $$;

-- Áreas de serviço (grupos_servico)
CREATE OR REPLACE FUNCTION public.erp_area_servico_salvar(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_id integer := NULLIF((p->>'id')::text,'0')::integer;
BEGIN
  IF v_id IS NULL THEN
    INSERT INTO grupos_servico (descricao,codigo,ativo)
    VALUES (p->>'descricao', NULLIF(p->>'codigo',''), COALESCE((p->>'ativo')::boolean,true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE grupos_servico SET descricao=p->>'descricao', codigo=NULLIF(p->>'codigo',''), ativo=COALESCE((p->>'ativo')::boolean,ativo) WHERE id=v_id;
  END IF;
  RETURN jsonb_build_object('id', v_id);
END; $$;

-- Grupos de produto
CREATE OR REPLACE FUNCTION public.erp_grupo_produto_salvar(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_id integer := NULLIF((p->>'id')::text,'0')::integer;
BEGIN
  IF v_id IS NULL THEN
    INSERT INTO grupos_produto (descricao,ativo,permite_estoque_negativo)
    VALUES (p->>'descricao', COALESCE((p->>'ativo')::boolean,true), COALESCE((p->>'permite_estoque_negativo')::boolean,false))
    RETURNING id INTO v_id;
  ELSE
    UPDATE grupos_produto SET descricao=p->>'descricao', ativo=COALESCE((p->>'ativo')::boolean,ativo),
      permite_estoque_negativo=COALESCE((p->>'permite_estoque_negativo')::boolean,permite_estoque_negativo) WHERE id=v_id;
  END IF;
  RETURN jsonb_build_object('id', v_id);
END; $$;

-- Subgrupos de produto
CREATE OR REPLACE FUNCTION public.erp_subgrupo_produto_salvar(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_id integer := NULLIF((p->>'id')::text,'0')::integer;
BEGIN
  IF v_id IS NULL THEN
    INSERT INTO subgrupos_produto (descricao,id_grupo,ativo,permite_estoque_negativo)
    VALUES (p->>'descricao', NULLIF(p->>'id_grupo','')::integer, COALESCE((p->>'ativo')::boolean,true), COALESCE((p->>'permite_estoque_negativo')::boolean,false))
    RETURNING id INTO v_id;
  ELSE
    UPDATE subgrupos_produto SET descricao=p->>'descricao', id_grupo=NULLIF(p->>'id_grupo','')::integer,
      ativo=COALESCE((p->>'ativo')::boolean,ativo),
      permite_estoque_negativo=COALESCE((p->>'permite_estoque_negativo')::boolean,permite_estoque_negativo) WHERE id=v_id;
  END IF;
  RETURN jsonb_build_object('id', v_id);
END; $$;

GRANT EXECUTE ON FUNCTION public.erp_aux_cadastros_dados() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erp_forma_pagamento_salvar(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erp_unidade_salvar(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erp_area_servico_salvar(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erp_grupo_produto_salvar(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erp_subgrupo_produto_salvar(jsonb) TO anon, authenticated;
