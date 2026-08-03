-- 40: saldo de crédito (vale-compra) disponível do cliente
CREATE OR REPLACE FUNCTION public.erp_cliente_credito(p_id_cliente int, p_id_empresa int DEFAULT NULL)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'Teste ERP','public'
AS $function$
  SELECT jsonb_build_object(
    'saldo', COALESCE((SELECT SUM(saldo) FROM "Teste ERP".clientes_creditos
                        WHERE id_cliente = p_id_cliente AND status='ATIVO'
                          AND (p_id_empresa IS NULL OR id_empresa IS NULL OR id_empresa = p_id_empresa)),0),
    'qtd', COALESCE((SELECT COUNT(*) FROM "Teste ERP".clientes_creditos
                      WHERE id_cliente = p_id_cliente AND status='ATIVO' AND saldo>0
                        AND (p_id_empresa IS NULL OR id_empresa IS NULL OR id_empresa = p_id_empresa)),0)
  );
$function$;
GRANT EXECUTE ON FUNCTION public.erp_cliente_credito(int,int) TO anon, authenticated;
