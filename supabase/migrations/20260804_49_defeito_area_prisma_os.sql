-- 20260804_49_defeito_area_prisma_os
--
-- Fecha o ciclo do módulo Pátio/Serviço no lado da OS:
--  - os_defeito_salvar passa a aceitar p_id_area (a antiga 3-args vira _legado p/ evitar
--    overload ambíguo no PostgREST); status default 'ABERTO'.
--  - os_defeitos_listar(p_id_os): defeitos com área, status e flag tem_apontamento.
--  - os_prismas_livres(p_id_vendedor): prismas ativos do vendedor não usados por OS aberta.
--  - os_prisma_atribuir(p_id_os, p_id_prisma): vincula prisma à OS (valida não estar em uso).
--  - trigger trg_os_liberar_prisma: zera id_prisma quando a OS vira FATURADA/CANCELADA.

ALTER FUNCTION public.os_defeito_salvar(integer, text, integer) RENAME TO os_defeito_salvar_legado;

CREATE OR REPLACE FUNCTION public.os_defeito_salvar(p_id_os integer, p_descricao text, p_id integer DEFAULT NULL, p_id_area integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_codigo varchar(10); v_seq integer; v_row os_defeitos;
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE os_defeitos SET descricao=p_descricao, id_area=COALESCE(p_id_area, id_area) WHERE id=p_id RETURNING * INTO v_row;
    RETURN to_jsonb(v_row);
  END IF;
  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 2) AS integer)),0)+1 INTO v_seq FROM os_defeitos WHERE id_os=p_id_os;
  v_codigo := 'D'||LPAD(v_seq::text,3,'0');
  INSERT INTO os_defeitos (id_os, codigo, descricao, id_area, status)
  VALUES (p_id_os, v_codigo, p_descricao, p_id_area, 'ABERTO') RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION public.os_defeitos_listar(p_id_os integer)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',d.id,'codigo',d.codigo,'descricao',d.descricao,
     'id_area',d.id_area,'area',g.descricao,'status',d.status,
     'tem_apontamento', EXISTS(SELECT 1 FROM os_apontamentos a WHERE a.id_defeito=d.id)) ORDER BY d.id), '[]'::jsonb)
  FROM os_defeitos d LEFT JOIN grupos_servico g ON g.id=d.id_area WHERE d.id_os=p_id_os;
$$;

CREATE OR REPLACE FUNCTION public.os_prismas_livres(p_id_vendedor integer)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'numero',p.numero) ORDER BY p.numero),'[]'::jsonb)
  FROM prismas p
  WHERE p.ativo AND (p_id_vendedor IS NULL OR p.id_vendedor=p_id_vendedor)
    AND NOT EXISTS (SELECT 1 FROM ordens_servico o WHERE o.id_prisma=p.id AND COALESCE(o.cancelada,false)=false AND o.status NOT IN ('FATURADA','CANCELADA'));
$$;

CREATE OR REPLACE FUNCTION public.os_prisma_atribuir(p_id_os integer, p_id_prisma integer, p_id_usuario integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
BEGIN
  IF p_id_prisma IS NOT NULL AND EXISTS (SELECT 1 FROM ordens_servico o WHERE o.id_prisma=p_id_prisma AND o.id<>p_id_os AND COALESCE(o.cancelada,false)=false AND o.status NOT IN ('FATURADA','CANCELADA')) THEN
    RETURN jsonb_build_object('ok',false,'erro','Prisma já está em uso por outra OS aberta');
  END IF;
  UPDATE ordens_servico SET id_prisma=p_id_prisma WHERE id=p_id_os;
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION "Teste ERP".trg_os_liberar_prisma() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.status IN ('FATURADA','CANCELADA') OR COALESCE(NEW.cancelada,false)=true) AND NEW.id_prisma IS NOT NULL THEN
    NEW.id_prisma := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER trg_os_liberar_prisma BEFORE UPDATE ON "Teste ERP".ordens_servico
  FOR EACH ROW EXECUTE FUNCTION "Teste ERP".trg_os_liberar_prisma();
