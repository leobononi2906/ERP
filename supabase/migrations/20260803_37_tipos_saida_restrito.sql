-- 37: Tipos de Operação restritos (vendedor comum não pode usar sem aprovação)
ALTER TABLE "Teste ERP".tipos_saida ADD COLUMN IF NOT EXISTS restrito boolean NOT NULL DEFAULT false;
UPDATE "Teste ERP".tipos_saida SET restrito = true WHERE id IN (3,4,5,6,8,10,11);

CREATE OR REPLACE FUNCTION public.erp_pode_tipo_restrito(p_id_usuario integer, p_id_tipo_saida integer)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'Teste ERP','public'
AS $function$
DECLARE v_restrito boolean;
BEGIN
  SELECT COALESCE(restrito,false) INTO v_restrito FROM "Teste ERP".tipos_saida WHERE id = p_id_tipo_saida;
  IF NOT COALESCE(v_restrito,false) THEN RETURN true; END IF;
  IF p_id_usuario IS NULL THEN RETURN false; END IF;
  IF "Teste ERP".fn_is_admin(p_id_usuario) THEN RETURN true; END IF;
  IF NOT EXISTS (SELECT 1 FROM "Teste ERP".usuarios_grupos WHERE id_usuario = p_id_usuario) THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM "Teste ERP".grupos_permissoes gp
    JOIN "Teste ERP".usuarios_grupos ug ON ug.id_grupo = gp.id_grupo
    JOIN "Teste ERP".modulos_sistema m ON m.id = gp.id_modulo
    WHERE ug.id_usuario = p_id_usuario AND m.codigo = 'VENDAS' AND COALESCE(gp.pode_aprovar,false));
END $function$;
-- venda_salvar e tipos_saida_salvar: ver aplicação completa no projeto (bloqueio de tipo restrito
-- em venda_salvar via erp_pode_tipo_restrito; tipos_saida_salvar grava a coluna restrito).
