-- 20260804_46_fix_baixar_titulo_overload
--
-- BUG: a baixa de títulos (Financeiro > Receber/Pagar) falhava para QUALQUER valor
-- (parcial e total). Causa: existiam DUAS funções public.erp_baixar_titulo com o
-- mesmo conjunto de nomes de parâmetro. O PostgREST não consegue escolher entre
-- overloads ambíguos e retorna PGRST203 ("Could not choose the best candidate
-- function"), então a chamada RPC do front nunca chegava a executar.
--
-- As duas funções eram:
--   A) public.erp_baixar_titulo(p_id_titulo, p_id_conta_financeira, p_id_forma_pagamento,
--        p_valor_pago, p_valor_desconto, p_valor_juros, p_valor_multa, p_data_baixa,
--        p_observacao, p_id_usuario)  -> self-contained; retorna {ok, novo_saldo_titulo, ...}
--   B) public.erp_baixar_titulo(p_id_titulo, p_id_conta_financeira, p_valor_pago,
--        p_id_forma_pagamento, p_id_usuario, p_valor_desconto, p_valor_juros,
--        p_valor_multa, p_data_baixa, p_observacao)  -> wrapper p/ "Teste ERP".fn_baixar_titulo;
--        retorna {ok, saldo_conta, ...} e usa RAISE EXCEPTION em vez de {ok:false}
--
-- O front (ContasReceber.jsx / ContasPagar.jsx) espera a Versão A: lê
-- res.novo_saldo_titulo e trata {ok:false, erro}. Então tiramos a Versão B do nome
-- ambíguo RENOMEANDO-a (reversível, não destrói nada). A "Teste ERP".fn_baixar_titulo
-- por baixo continua intacta.

ALTER FUNCTION public.erp_baixar_titulo(
  integer,  -- p_id_titulo
  integer,  -- p_id_conta_financeira
  numeric,  -- p_valor_pago
  integer,  -- p_id_forma_pagamento
  integer,  -- p_id_usuario
  numeric,  -- p_valor_desconto
  numeric,  -- p_valor_juros
  numeric,  -- p_valor_multa
  date,     -- p_data_baixa
  text      -- p_observacao
) RENAME TO erp_baixar_titulo_wrapper_legado;
