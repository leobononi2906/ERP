-- 41: devolução com aval da boqueta (vendedor solicita; estoque/boqueta confirma o recebimento físico)
-- Fluxo: DIGITACAO (rascunho) -> AGUARDANDO (solicitada) -> CONFIRMADA (boqueta recebeu: estoque + saldo)

CREATE OR REPLACE FUNCTION public.erp_devolucao_solicitar(p_id int, p_id_usuario int)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public'
AS $function$
DECLARE v_st text; v_itens int;
BEGIN
  SELECT status INTO v_st FROM "Teste ERP".devolucoes WHERE id=p_id;
  IF v_st IS NULL THEN RETURN jsonb_build_object('ok',false,'erro','Devolução não encontrada.'); END IF;
  IF v_st<>'DIGITACAO' THEN RETURN jsonb_build_object('ok',false,'erro','Só é possível solicitar uma devolução em rascunho.'); END IF;
  SELECT COUNT(*) INTO v_itens FROM "Teste ERP".devolucoes_itens WHERE id_devolucao=p_id AND quantidade>0;
  IF v_itens=0 THEN RETURN jsonb_build_object('ok',false,'erro','Informe os itens a devolver.'); END IF;
  UPDATE "Teste ERP".devolucoes SET status='AGUARDANDO', atualizado_em=now() WHERE id=p_id;
  RETURN jsonb_build_object('ok',true);
END $function$;
GRANT EXECUTE ON FUNCTION public.erp_devolucao_solicitar(int,int) TO anon, authenticated;

-- erp_devolucao_confirmar: exige status AGUARDANDO e permissão ESTOQUE.aprovar (boqueta).
-- erp_devolucao_cancelar: permite cancelar rascunho OU aguardando (boqueta recusa).
-- (corpo completo aplicado no Supabase — dá entrada no estoque com origem DEVOLUCAO_VENDA e gera clientes_creditos)
