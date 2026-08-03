-- 44 — Correção: sobrecarga de auditoria de erp_log() ausente
-- venda_salvar, orcamento_salvar/_reprovar e encomenda_aprovar chamam
--   erp_log(usuario, modulo, acao, tabela, registro_id, dados_anteriores, dados_novos)
-- mas só existia a versão erp_log(usuario, tipo, modulo, acao, tabela, registro, mensagem, detalhes),
-- fazendo o salvamento falhar com "function public.erp_log(...) does not exist".
-- Recria a sobrecarga de auditoria (7 args) gravando em log_acessos.

CREATE OR REPLACE FUNCTION public.erp_log(
  p_id_usuario integer,
  p_modulo text,
  p_acao text,
  p_tabela text,
  p_registro integer,
  p_dados_anteriores jsonb,
  p_dados_novos jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'Teste ERP','public','pg_temp' AS $function$
BEGIN
  INSERT INTO "Teste ERP".log_acessos
    (id_usuario, modulo, acao, tabela_afetada, registro_id, dados_anteriores, dados_novos, tipo, criado_em)
  VALUES
    (p_id_usuario, p_modulo, p_acao, p_tabela, p_registro, p_dados_anteriores, p_dados_novos, 'AUDITORIA', now());
END;
$function$;

GRANT EXECUTE ON FUNCTION public.erp_log(integer, text, text, text, integer, jsonb, jsonb) TO anon, authenticated, service_role;
