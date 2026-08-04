-- 20260804_50_busca_por_campo
--
-- Busca no servidor por CAMPO escolhido (não carrega a base inteira no front).
-- Pensado p/ escala (50 usuários, muitos cadastros): sempre com LIMIT e por campo.
--   Cliente: nome | cnpj | codigo.  Produto: nome | referencia | codigo_barras.
-- Índices btree de apoio p/ código/CNPJ/referência/cód. de barras.
-- (Índices trigram p/ nome ficam p/ quando a base crescer — pg_trgm.)

CREATE INDEX IF NOT EXISTS ix_clientes_codigo ON "Teste ERP".clientes (codigo);
CREATE INDEX IF NOT EXISTS ix_clientes_cnpj   ON "Teste ERP".clientes (cpf_cnpj);
CREATE INDEX IF NOT EXISTS ix_produtos_ref    ON "Teste ERP".produtos (referencia);
CREATE INDEX IF NOT EXISTS ix_produtos_barras ON "Teste ERP".produtos (codigo_barras);

CREATE OR REPLACE FUNCTION public.erp_clientes_buscar(p_campo text DEFAULT 'nome', p_termo text DEFAULT '', p_id_empresa integer DEFAULT NULL, p_limit integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id',id,'codigo',codigo,'nome',nome,'nome_fantasia',nome_fantasia,'cpf_cnpj',cpf_cnpj,'cidade',cidade)), '[]'::jsonb)
  FROM (
    SELECT id,codigo,nome,nome_fantasia,cpf_cnpj,cidade FROM clientes
    WHERE (p_id_empresa IS NULL OR id_empresa=p_id_empresa)
      AND CASE lower(p_campo)
        WHEN 'codigo' THEN codigo::text ILIKE p_termo||'%'
        WHEN 'cnpj'   THEN regexp_replace(COALESCE(cpf_cnpj,''),'\D','','g') LIKE '%'||regexp_replace(COALESCE(p_termo,''),'\D','','g')||'%'
        ELSE (nome ILIKE '%'||p_termo||'%' OR COALESCE(nome_fantasia,'') ILIKE '%'||p_termo||'%')
      END
    ORDER BY nome
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit,30), 100))
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.erp_produtos_buscar(p_campo text DEFAULT 'nome', p_termo text DEFAULT '', p_limit integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id',id,'referencia',referencia,'nome',nome,'preco_venda',preco_venda,'id_unidade',id_unidade,'codigo_barras',codigo_barras)), '[]'::jsonb)
  FROM (
    SELECT id,referencia,nome,preco_venda,id_unidade,codigo_barras FROM produtos
    WHERE CASE lower(p_campo)
        WHEN 'referencia'    THEN COALESCE(referencia,'') ILIKE p_termo||'%'
        WHEN 'codigo_barras' THEN COALESCE(codigo_barras,'') ILIKE p_termo||'%'
        ELSE (nome ILIKE '%'||p_termo||'%' OR COALESCE(descricao,'') ILIKE '%'||p_termo||'%')
      END
    ORDER BY nome
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit,30), 100))
  ) t;
$$;
