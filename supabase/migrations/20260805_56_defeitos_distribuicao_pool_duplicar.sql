-- 2026-08-05 — Redesenho Defeito -> Distribuição (backend aditivo; não altera as telas atuais).
-- Modelo: Área = pool (+ técnico opcional); Duplicar = cópias por área com vínculo à origem.

ALTER TABLE "Teste ERP".os_defeitos
  ADD COLUMN IF NOT EXISTS id_tecnico        integer,
  ADD COLUMN IF NOT EXISTS id_defeito_origem integer;

CREATE OR REPLACE FUNCTION public.os_defeito_distribuir(p_id_defeito integer, p_id_area integer, p_id_tecnico integer DEFAULT NULL, p_ator integer DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_os integer;
BEGIN
  UPDATE "Teste ERP".os_defeitos SET id_area = p_id_area, id_tecnico = p_id_tecnico
   WHERE id = p_id_defeito RETURNING id_os INTO v_os;
  IF v_os IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Defeito não encontrado'); END IF;
  PERFORM public.erp_log(p_ator, 'DISTRIBUICAO', 'DISTRIBUIR_DEFEITO', 'os_defeitos', p_id_defeito,
     NULL, jsonb_build_object('id_area', p_id_area, 'id_tecnico', p_id_tecnico));
  RETURN jsonb_build_object('ok', true);
END $function$;

CREATE OR REPLACE FUNCTION public.os_defeito_duplicar(p_id_defeito integer, p_id_area integer DEFAULT NULL, p_ator integer DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_orig "Teste ERP".os_defeitos; v_new_id integer; v_origem integer; v_codigo text;
BEGIN
  SELECT * INTO v_orig FROM "Teste ERP".os_defeitos WHERE id = p_id_defeito;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'erro', 'Defeito não encontrado'); END IF;
  v_origem := COALESCE(v_orig.id_defeito_origem, v_orig.id);
  SELECT 'D' || lpad((COALESCE(max(NULLIF(regexp_replace(codigo,'\D','','g'),'')::int),0)+1)::text, 3, '0')
    INTO v_codigo FROM "Teste ERP".os_defeitos WHERE id_os = v_orig.id_os;
  INSERT INTO "Teste ERP".os_defeitos (id_os, codigo, descricao, id_area, status, id_defeito_origem)
  VALUES (v_orig.id_os, v_codigo, v_orig.descricao, COALESCE(p_id_area, v_orig.id_area), 'ABERTO', v_origem)
  RETURNING id INTO v_new_id;
  PERFORM public.erp_log(p_ator, 'DISTRIBUICAO', 'DUPLICAR_DEFEITO', 'os_defeitos', v_new_id,
     NULL, jsonb_build_object('origem', v_origem, 'id_area', COALESCE(p_id_area, v_orig.id_area)));
  RETURN jsonb_build_object('ok', true, 'id', v_new_id, 'codigo', v_codigo);
END $function$;

-- Login do Pátio por login, nome OU código (id)
CREATE OR REPLACE FUNCTION public.os_patio_login(p_login text, p_senha text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP', 'public', 'extensions'
AS $function$
DECLARE v record;
BEGIN
  SELECT id, nome INTO v FROM usuarios
   WHERE ativo = true
     AND senha_hash = extensions.crypt(p_senha, senha_hash)
     AND ( lower(login) = lower(p_login) OR lower(nome) = lower(p_login)
        OR (p_login ~ '^\d+$' AND id = p_login::int) )
   LIMIT 1;
  IF v IS NULL THEN RETURN jsonb_build_object('ok',false,'erro','Colaborador ou senha inválidos'); END IF;
  RETURN jsonb_build_object('ok',true,'id_colaborador',v.id,'nome',v.nome);
END $function$;

-- os_distribuicao_dados: nova chave 'servicos_solicitados' (defeitos ABERTOS). Chaves antigas intactas.
-- (corpo completo aplicado via migration remota; ver banco / apply_migration 'defeitos_distribuicao_pool_e_duplicar')
