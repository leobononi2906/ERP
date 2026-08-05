-- 20260805_53_produto_composicao_custo_e_mo
--
-- Composicao de produto (produtos + servicos) SO para custo/comissao — nao baixa estoque.
-- + valor/hora no servico; mao de obra (MO) do produto = horas x valor/hora, DINAMICA
--   (mudou o valor/hora no cadastro de servico, o MO de todos os produtos recalcula).
ALTER TABLE "Teste ERP".servicos ADD COLUMN IF NOT EXISTS valor_hora numeric DEFAULT 0;

CREATE OR REPLACE FUNCTION public.servico_salvar(
  p_id integer DEFAULT NULL, p_codigo text DEFAULT NULL, p_nome text DEFAULT NULL,
  p_descricao text DEFAULT NULL, p_preco numeric DEFAULT 0, p_unidade text DEFAULT 'UN',
  p_situacao text DEFAULT 'ATIVO', p_id_grupo integer DEFAULT NULL, p_valor_hora numeric DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE r "Teste ERP".servicos;
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE "Teste ERP".servicos SET
      codigo = COALESCE(p_codigo, codigo), nome = COALESCE(p_nome, nome), descricao = p_descricao,
      preco = COALESCE(p_preco, preco), unidade = COALESCE(p_unidade, unidade),
      situacao = COALESCE(p_situacao, situacao), id_grupo = p_id_grupo,
      valor_hora = COALESCE(p_valor_hora, valor_hora)
    WHERE id = p_id RETURNING * INTO r;
  ELSE
    INSERT INTO "Teste ERP".servicos (codigo, nome, descricao, preco, unidade, situacao, id_grupo, valor_hora)
    VALUES (p_codigo, p_nome, p_descricao, COALESCE(p_preco,0), COALESCE(p_unidade,'UN'), COALESCE(p_situacao,'ATIVO'), p_id_grupo, COALESCE(p_valor_hora,0))
    RETURNING * INTO r;
  END IF;
  RETURN row_to_json(r);
END $function$;
GRANT EXECUTE ON FUNCTION public.servico_salvar(integer,text,text,text,numeric,text,text,integer,numeric) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.produtos_servicos_dados()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
BEGIN
  RETURN jsonb_build_object(
    'servicos', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'preco', s.preco, 'valor_hora', s.valor_hora) ORDER BY s.nome)
                          FROM "Teste ERP".servicos s WHERE s.situacao = 'ATIVO'), '[]'::jsonb)
  );
END; $function$;

CREATE OR REPLACE FUNCTION public.produto_composicao_listar(p_id_produto integer)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $function$
  WITH linhas AS (
    SELECT c.id, c.tipo, c.id_componente, c.id_servico, c.ordem,
           COALESCE(pr.nome, sv.nome, c.descricao) AS nome, pr.referencia,
           c.quantidade, (c.id_servico IS NOT NULL) AS is_servico,
           CASE WHEN c.id_servico IS NOT NULL
                THEN COALESCE(NULLIF(sv.valor_hora,0), c.custo_unitario, 0)
                ELSE COALESCE(NULLIF(pr.preco_custo,0), c.custo_unitario, 0) END AS custo_unitario
    FROM "Teste ERP".produtos_composicao c
    LEFT JOIN "Teste ERP".produtos pr ON pr.id = c.id_componente
    LEFT JOIN "Teste ERP".servicos sv ON sv.id = c.id_servico
    WHERE c.id_produto = p_id_produto
  )
  SELECT jsonb_build_object(
    'itens', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'tipo', tipo, 'id_componente', id_componente, 'id_servico', id_servico,
        'nome', nome, 'referencia', referencia, 'is_servico', is_servico,
        'quantidade', quantidade, 'custo_unitario', custo_unitario,
        'custo_total', quantidade * custo_unitario
      ) ORDER BY ordem, id) FROM linhas), '[]'::jsonb),
    'valor_mo', COALESCE((SELECT SUM(quantidade * custo_unitario) FROM linhas WHERE is_servico), 0),
    'custo_materiais', COALESCE((SELECT SUM(quantidade * custo_unitario) FROM linhas WHERE NOT is_servico), 0),
    'custo_total', COALESCE((SELECT SUM(quantidade * custo_unitario) FROM linhas), 0)
  );
$function$;

CREATE OR REPLACE FUNCTION public.produto_composicao_salvar(p jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE r "Teste ERP".produtos_composicao; v_custo numeric;
BEGIN
  v_custo := COALESCE(nullif(p->>'custo_unitario','')::numeric,
    (SELECT COALESCE(NULLIF(preco_custo,0),0) FROM "Teste ERP".produtos WHERE id = nullif(p->>'id_componente','')::int),
    (SELECT COALESCE(NULLIF(valor_hora,0), preco) FROM "Teste ERP".servicos WHERE id = nullif(p->>'id_servico','')::int), 0);
  IF nullif(p->>'id','') IS NOT NULL THEN
    UPDATE "Teste ERP".produtos_composicao SET
      quantidade = COALESCE(nullif(p->>'quantidade','')::numeric, quantidade),
      custo_unitario = v_custo
    WHERE id = (p->>'id')::int RETURNING * INTO r;
  ELSE
    INSERT INTO "Teste ERP".produtos_composicao (id_produto, tipo, id_componente, id_servico, descricao, quantidade, custo_unitario)
    VALUES ((p->>'id_produto')::int, COALESCE(p->>'tipo','PECA'),
            nullif(p->>'id_componente','')::int, nullif(p->>'id_servico','')::int,
            p->>'descricao', COALESCE(nullif(p->>'quantidade','')::numeric,1), v_custo)
    RETURNING * INTO r;
  END IF;
  RETURN row_to_json(r);
END $function$;
