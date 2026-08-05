-- 2026-08-05 — Base do popup "Movimento Financeiro" no faturamento (item 1.12 do BACKLOG).
-- Aditivo/seguro: não altera o fluxo de faturar atual. Só adiciona campos de cartão e uma RPC de preview.

-- (1) Campos de cartão no título (nullable)
ALTER TABLE "Teste ERP".titulos
  ADD COLUMN IF NOT EXISTS nsu               varchar,
  ADD COLUMN IF NOT EXISTS num_transacao     varchar,
  ADD COLUMN IF NOT EXISTS bandeira          varchar,
  ADD COLUMN IF NOT EXISTS data_conciliacao  date;

-- (2) Preview do faturamento: parcelas (da condição de pagamento) + rateio sugerido (dos totais) + forma
CREATE OR REPLACE FUNCTION public.erp_venda_faturamento_preview(p_id_venda integer)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'Teste ERP', 'public'
AS $function$
  WITH v AS (SELECT * FROM vendas WHERE id = p_id_venda),
  cond AS (SELECT c.* FROM condicoes_pagamento c JOIN v ON v.id_condicao_pagamento = c.id),
  forma AS (SELECT f.* FROM formas_pagamento f JOIN v ON v.id_forma_pagamento = f.id),
  parc AS (
    SELECT cpp.numero_parcela AS numero,
           (CURRENT_DATE + (cpp.prazo_dias || ' days')::interval)::date AS vencimento,
           round(((SELECT valor_total FROM v) * COALESCE(cpp.percentual,0) / 100.0)::numeric, 2) AS valor
    FROM condicoes_pagamento_parcelas cpp
    WHERE cpp.id_condicao_pagamento = (SELECT id FROM cond)
    UNION ALL
    SELECT g AS numero,
           (CURRENT_DATE + (g * COALESCE((SELECT intervalo_dias FROM cond),30) || ' days')::interval)::date AS vencimento,
           round(((SELECT valor_total FROM v) / GREATEST((SELECT num_parcelas FROM cond),1))::numeric, 2) AS valor
    FROM generate_series(1, COALESCE((SELECT num_parcelas FROM cond),1)) g
    WHERE NOT EXISTS (SELECT 1 FROM condicoes_pagamento_parcelas c2 WHERE c2.id_condicao_pagamento = (SELECT id FROM cond))
      AND (SELECT id FROM cond) IS NOT NULL
  )
  SELECT jsonb_build_object(
    'id_venda',    (SELECT id FROM v),
    'valor_total', (SELECT valor_total FROM v),
    'forma',       (SELECT to_jsonb(forma) FROM forma),
    'is_cartao',   COALESCE((SELECT lower(COALESCE(modalidade,'')) LIKE '%cart%' OR lower(COALESCE(tipo,'')) LIKE '%cart%' FROM forma), false),
    'condicao',    (SELECT to_jsonb(cond) FROM cond),
    'parcelas',    COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.numero) FROM parc p), '[]'::jsonb),
    'rateio',      COALESCE((SELECT jsonb_agg(x) FROM (
        SELECT 'PRODUTO'  AS tipo_linha, (SELECT valor_produtos FROM v) AS valor WHERE COALESCE((SELECT valor_produtos FROM v),0) <> 0
        UNION ALL SELECT 'SERVICO',  (SELECT valor_servicos FROM v) WHERE COALESCE((SELECT valor_servicos FROM v),0) <> 0
        UNION ALL SELECT 'FRETE',    (SELECT valor_frete FROM v)    WHERE COALESCE((SELECT valor_frete FROM v),0) <> 0
        UNION ALL SELECT 'IPI',      (SELECT valor_ipi FROM v)      WHERE COALESCE((SELECT valor_ipi FROM v),0) <> 0
        UNION ALL SELECT 'DESCONTO', -(SELECT valor_desconto FROM v) WHERE COALESCE((SELECT valor_desconto FROM v),0) <> 0
    ) x), '[]'::jsonb)
  );
$function$;

GRANT EXECUTE ON FUNCTION public.erp_venda_faturamento_preview(integer) TO anon, authenticated;
