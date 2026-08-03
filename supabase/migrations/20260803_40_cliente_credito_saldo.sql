-- 40: painel de crédito do cliente para a venda
-- Vale-compra (clientes_creditos) + limite/uso/disponível a prazo (via erp_validar_credito)
CREATE OR REPLACE FUNCTION public.erp_cliente_credito(p_id_cliente int, p_id_empresa int DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'Teste ERP','public'
AS $function$
DECLARE v_val jsonb; v_saldo numeric; v_qtd int;
BEGIN
  v_val := public.erp_validar_credito(p_id_cliente, 0);
  SELECT COALESCE(SUM(saldo),0), COUNT(*) FILTER (WHERE saldo>0) INTO v_saldo, v_qtd
  FROM "Teste ERP".clientes_creditos
  WHERE id_cliente=p_id_cliente AND status='ATIVO'
    AND (p_id_empresa IS NULL OR id_empresa IS NULL OR id_empresa=p_id_empresa);
  RETURN jsonb_build_object(
    'saldo', v_saldo, 'qtd', v_qtd,
    'limite', COALESCE((v_val->>'limite')::numeric,0),
    'devedor', COALESCE((v_val->>'devedor')::numeric,0),
    'disponivel', COALESCE((v_val->>'disponivel')::numeric,0),
    'vencidos', COALESCE((v_val->>'vencidos')::numeric,0),
    'qtd_vencidos', COALESCE((v_val->>'qtd_vencidos')::int,0)
  );
END $function$;
GRANT EXECUTE ON FUNCTION public.erp_cliente_credito(int,int) TO anon, authenticated;
