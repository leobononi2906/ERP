-- 20260805_52_comissoes_os_por_apontamento
--
-- Relatório de comissão de SERVIÇO a partir dos APONTAMENTOS (não do id_tecnico único).
-- Rateia o valor de cada serviço proporcional às horas faturáveis de cada colaborador
-- e aplica o % de comissão de serviço de cada colaborador. Assim, se um serviço reúne
-- apontamentos de colaboradores/áreas diferentes, cada um recebe pela sua parcela de horas.
CREATE OR REPLACE FUNCTION public.erp_comissoes_os_dados(
  p_data_ini date DEFAULT NULL, p_data_fim date DEFAULT NULL,
  p_id_os integer DEFAULT NULL, p_somente_faturadas boolean DEFAULT true
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
WITH apt AS (
  SELECT a.id_servico_os, a.id_colaborador, a.id_area, COALESCE(a.horas_trabalhadas,0) AS horas
  FROM os_apontamentos a
  WHERE a.faturavel = true AND a.id_servico_os IS NOT NULL
),
serv AS (
  SELECT s.id, s.id_os, s.descricao, COALESCE(s.valor_total,0) AS valor_total, s.id_area,
         o.numero AS numero_os, o.status AS status_os, o.data_saida
  FROM os_servicos s
  JOIN ordens_servico o ON o.id = s.id_os
  WHERE (p_id_os IS NULL OR s.id_os = p_id_os)
    AND (NOT p_somente_faturadas OR o.status = 'FATURADA')
    AND (p_data_ini IS NULL OR o.data_saida::date >= p_data_ini)
    AND (p_data_fim IS NULL OR o.data_saida::date <= p_data_fim)
),
tot AS (
  SELECT id_servico_os, SUM(horas) AS horas_serv FROM apt GROUP BY id_servico_os
),
linhas AS (
  SELECT s.id_os, s.numero_os, s.descricao AS servico,
         ga.descricao AS area, apt.id_colaborador, u.nome AS colaborador,
         SUM(apt.horas) AS horas,
         CASE WHEN t.horas_serv > 0 THEN ROUND(s.valor_total * SUM(apt.horas) / t.horas_serv, 2) ELSE 0 END AS valor_rateado,
         COALESCE(u.perc_comissao_servico,0) AS perc
  FROM serv s
  JOIN apt ON apt.id_servico_os = s.id
  JOIN tot t ON t.id_servico_os = s.id
  LEFT JOIN usuarios u ON u.id = apt.id_colaborador
  LEFT JOIN grupos_servico ga ON ga.id = COALESCE(apt.id_area, s.id_area)
  GROUP BY s.id_os, s.numero_os, s.descricao, ga.descricao, apt.id_colaborador, u.nome, t.horas_serv, s.valor_total, u.perc_comissao_servico
)
SELECT jsonb_build_object(
  'linhas', COALESCE((SELECT jsonb_agg(jsonb_build_object(
       'id_os', id_os, 'numero_os', numero_os, 'servico', servico, 'area', area,
       'id_colaborador', id_colaborador, 'colaborador', COALESCE(colaborador,'—'),
       'horas', horas, 'valor_rateado', valor_rateado, 'perc', perc,
       'valor_comissao', ROUND(valor_rateado*perc/100,2)
     ) ORDER BY numero_os, colaborador) FROM linhas), '[]'::jsonb),
  'por_colaborador', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'colaborador') FROM (
       SELECT jsonb_build_object(
         'id_colaborador', id_colaborador, 'colaborador', COALESCE(colaborador,'—'),
         'horas', SUM(horas), 'valor_rateado', SUM(valor_rateado),
         'valor_comissao', SUM(ROUND(valor_rateado*perc/100,2))) AS x
       FROM linhas GROUP BY id_colaborador, colaborador) q), '[]'::jsonb)
);
$$;

GRANT EXECUTE ON FUNCTION public.erp_comissoes_os_dados(date,date,integer,boolean) TO anon, authenticated;
