-- 38: cliente criado por quem não aprova nasce sem crédito; vendedor pode incluir cliente
CREATE OR REPLACE FUNCTION public.erp_usuario_pode(p_id_usuario integer, p_modulo text, p_acao text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'Teste ERP','public'
AS $function$
DECLARE v_col text; v_ok boolean;
BEGIN
  IF p_id_usuario IS NULL THEN RETURN false; END IF;
  IF "Teste ERP".fn_is_admin(p_id_usuario) THEN RETURN true; END IF;
  IF NOT EXISTS (SELECT 1 FROM "Teste ERP".usuarios_grupos WHERE id_usuario = p_id_usuario) THEN RETURN true; END IF;
  v_col := CASE lower(p_acao)
    WHEN 'incluir' THEN 'pode_incluir' WHEN 'editar' THEN 'pode_editar'
    WHEN 'excluir' THEN 'pode_excluir' WHEN 'aprovar' THEN 'pode_aprovar'
    WHEN 'exportar' THEN 'pode_exportar' ELSE 'pode_visualizar' END;
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM "Teste ERP".grupos_permissoes gp
      JOIN "Teste ERP".usuarios_grupos ug ON ug.id_grupo = gp.id_grupo
      JOIN "Teste ERP".modulos_sistema m ON m.id = gp.id_modulo
      WHERE ug.id_usuario = $1 AND m.codigo = $2 AND COALESCE(gp.%I,false))', v_col)
    INTO v_ok USING p_id_usuario, upper(p_modulo);
  RETURN COALESCE(v_ok,false);
END $function$;

-- cliente_salvar: força limite_credito=0 quando o ator não tem aprovação em Clientes (ver função completa aplicada).
-- Permissão: grupos 'Vendedor Loja' e 'Vendedor Externo' recebem pode_incluir em CLIENTES.
UPDATE "Teste ERP".grupos_permissoes gp SET pode_visualizar=true, pode_incluir=true
FROM "Teste ERP".grupos_acesso g, "Teste ERP".modulos_sistema m
WHERE gp.id_grupo=g.id AND gp.id_modulo=m.id
  AND g.nome IN ('Vendedor Loja','Vendedor Externo') AND m.codigo='CLIENTES';
INSERT INTO "Teste ERP".grupos_permissoes (id_grupo, id_modulo, pode_visualizar, pode_incluir)
SELECT g.id, m.id, true, true FROM "Teste ERP".grupos_acesso g
JOIN "Teste ERP".modulos_sistema m ON m.codigo='CLIENTES'
WHERE g.nome IN ('Vendedor Loja','Vendedor Externo')
  AND NOT EXISTS (SELECT 1 FROM "Teste ERP".grupos_permissoes x WHERE x.id_grupo=g.id AND x.id_modulo=m.id);
