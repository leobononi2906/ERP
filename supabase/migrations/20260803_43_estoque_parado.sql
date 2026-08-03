-- 43 — Estoque parado (Compras)
-- Produtos com saldo contábil > 0 e SEM saída no período informado.
-- Saída = movimento onde o saldo diminuiu (estoque_posterior < estoque_anterior),
-- robusto a variações de nomenclatura de tipo. Filtros: empresa, período (dias),
-- grupo, subgrupo, busca. Retorna itens + resumo + lookups para os filtros.

CREATE OR REPLACE FUNCTION "Teste ERP".erp_estoque_parado(
  p_id_empresa integer DEFAULT NULL,
  p_dias integer DEFAULT 90,
  p_id_grupo integer DEFAULT NULL,
  p_id_subgrupo integer DEFAULT NULL,
  p_busca text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_itens jsonb;
BEGIN
  WITH saldo AS (
    SELECT s.id_produto,
           SUM(s.estoque_atual) AS estoque,
           SUM(s.estoque_atual * COALESCE(s.custo_medio, 0)) AS valor,
           MAX(s.ultima_entrada) AS ultima_entrada
    FROM "Teste ERP".estoque_saldos s
    JOIN "Teste ERP".centros_estoque c ON c.id = s.id_centro AND COALESCE(c.contabiliza, true) = true
    WHERE (p_id_empresa IS NULL OR c.id_empresa = p_id_empresa)
    GROUP BY s.id_produto
    HAVING SUM(s.estoque_atual) > 0
  ),
  saida AS (
    SELECT m.id_produto,
           MAX(m.criado_em) FILTER (WHERE m.estoque_posterior < m.estoque_anterior) AS ultima_saida,
           SUM(CASE WHEN m.estoque_posterior < m.estoque_anterior
                     AND m.criado_em >= NOW() - (p_dias || ' days')::interval
                    THEN (m.estoque_anterior - m.estoque_posterior) ELSE 0 END) AS saida_periodo
    FROM "Teste ERP".estoque_movimentos m
    WHERE (p_id_empresa IS NULL OR m.id_empresa = p_id_empresa)
    GROUP BY m.id_produto
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id_produto', p.id, 'referencia', p.referencia, 'nome', p.nome,
    'id_grupo', p.id_grupo, 'grupo', g.descricao,
    'id_subgrupo', p.id_subgrupo, 'subgrupo', sg.descricao,
    'estoque', sd.estoque, 'custo_medio', CASE WHEN sd.estoque > 0 THEN ROUND(sd.valor / sd.estoque, 4) ELSE 0 END,
    'valor_parado', ROUND(sd.valor, 2),
    'ultima_saida', sa.ultima_saida, 'ultima_entrada', sd.ultima_entrada,
    'dias_parado', (CURRENT_DATE - COALESCE(sa.ultima_saida::date, sd.ultima_entrada::date, p.criado_em::date))
  ) ORDER BY sd.valor DESC), '[]'::jsonb)
  INTO v_itens
  FROM saldo sd
  JOIN "Teste ERP".produtos p ON p.id = sd.id_produto
  LEFT JOIN "Teste ERP".grupos_produto g ON g.id = p.id_grupo
  LEFT JOIN "Teste ERP".subgrupos_produto sg ON sg.id = p.id_subgrupo
  LEFT JOIN saida sa ON sa.id_produto = sd.id_produto
  WHERE COALESCE(sa.saida_periodo, 0) = 0
    AND (p_id_grupo IS NULL OR p.id_grupo = p_id_grupo)
    AND (p_id_subgrupo IS NULL OR p.id_subgrupo = p_id_subgrupo)
    AND (p_busca IS NULL OR p.nome ILIKE '%' || p_busca || '%' OR p.referencia ILIKE '%' || p_busca || '%');

  RETURN jsonb_build_object(
    'itens', v_itens,
    'resumo', jsonb_build_object(
      'produtos', jsonb_array_length(v_itens),
      'valor_total', COALESCE((SELECT SUM((x->>'valor_parado')::numeric) FROM jsonb_array_elements(v_itens) x), 0),
      'estoque_total', COALESCE((SELECT SUM((x->>'estoque')::numeric) FROM jsonb_array_elements(v_itens) x), 0)
    ),
    'empresas', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome) ORDER BY e.nome)
      FROM "Teste ERP".empresas e WHERE e.ativa = true), '[]'::jsonb),
    'grupos', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', g.id, 'descricao', g.descricao) ORDER BY g.descricao)
      FROM "Teste ERP".grupos_produto g), '[]'::jsonb),
    'subgrupos', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', sg.id, 'id_grupo', sg.id_grupo, 'descricao', sg.descricao) ORDER BY sg.descricao)
      FROM "Teste ERP".subgrupos_produto sg), '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.erp_estoque_parado(
  p_id_empresa integer DEFAULT NULL, p_dias integer DEFAULT 90,
  p_id_grupo integer DEFAULT NULL, p_id_subgrupo integer DEFAULT NULL, p_busca text DEFAULT NULL
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'Teste ERP','public','pg_temp'
AS $function$ SELECT "Teste ERP".erp_estoque_parado(p_id_empresa, p_dias, p_id_grupo, p_id_subgrupo, p_busca) $function$;

GRANT EXECUTE ON FUNCTION public.erp_estoque_parado(integer, integer, integer, integer, text) TO anon, authenticated, service_role;
