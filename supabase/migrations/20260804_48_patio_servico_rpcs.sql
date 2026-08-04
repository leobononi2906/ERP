-- 20260804_48_patio_servico_rpcs
--
-- RPCs do módulo Pátio/Serviço. Todas SECURITY DEFINER no schema public.
-- Áreas = grupos_servico. Colaboradores = usuarios. OS ativa = status <> FATURADA/CANCELADA.
-- Fluxo: login -> contexto(prisma) -> ação no defeito (ENTRADA/PAUSA/RETOMAR/FINALIZAR)
--        -> solicitar peça / lançar consumo (exigem apontamento aberto na OS).
-- Prisma cadastro (por vendedor): os_prismas_dados / os_prisma_salvar / os_prisma_excluir.
--
-- Testado via transação com rollback (DO block + RAISE): ENTRADA cria apontamento e põe
-- o defeito em EM_EXECUCAO; contexto localiza a OS pelo prisma e lista os defeitos.

CREATE OR REPLACE FUNCTION public.os_patio_login(p_login text, p_senha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public','extensions' AS $$
DECLARE v record;
BEGIN
  SELECT id, nome INTO v FROM usuarios
   WHERE lower(login)=lower(p_login) AND ativo=true
     AND senha_hash = extensions.crypt(p_senha, senha_hash);
  IF v IS NULL THEN RETURN jsonb_build_object('ok',false,'erro','Colaborador ou senha inválidos'); END IF;
  RETURN jsonb_build_object('ok',true,'id_colaborador',v.id,'nome',v.nome);
END $$;

CREATE OR REPLACE FUNCTION public.os_patio_contexto(p_prisma text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_os record; v_def jsonb;
BEGIN
  SELECT o.id, o.numero, o.status, o.defeito_relatado, c.nome AS cliente, pr.numero AS prisma, u.nome AS vendedor
    INTO v_os
  FROM ordens_servico o
  JOIN prismas pr ON pr.id = o.id_prisma
  LEFT JOIN clientes c ON c.id = o.id_cliente
  LEFT JOIN usuarios u ON u.id = pr.id_vendedor
  WHERE pr.numero = p_prisma AND COALESCE(o.cancelada,false)=false
    AND o.status NOT IN ('FATURADA','CANCELADA')
  ORDER BY o.data_entrada DESC NULLS LAST LIMIT 1;
  IF v_os IS NULL THEN
    RETURN jsonb_build_object('ok',false,'erro','Nenhuma OS aberta com o prisma '||p_prisma);
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', d.id, 'codigo', d.codigo, 'descricao', d.descricao, 'status', d.status,
    'id_area', d.id_area, 'area', g.descricao,
    'aberto_por', ap.colaborador, 'id_apont_aberto', ap.id_apont,
    'meu_aberto', ap.id_apont IS NOT NULL
  ) ORDER BY d.id)
  INTO v_def
  FROM os_defeitos d
  LEFT JOIN grupos_servico g ON g.id = d.id_area
  LEFT JOIN LATERAL (
    SELECT ao.id AS id_apont, uu.nome AS colaborador
    FROM os_apontamentos ao JOIN usuarios uu ON uu.id=ao.id_colaborador
    WHERE ao.id_defeito=d.id AND ao.hora_termino IS NULL
    ORDER BY ao.id DESC LIMIT 1
  ) ap ON true
  WHERE d.id_os = v_os.id AND d.status <> 'CONCLUIDO';

  RETURN jsonb_build_object('ok',true,
    'os', jsonb_build_object('id',v_os.id,'numero',v_os.numero,'status',v_os.status,
      'cliente',v_os.cliente,'defeito',v_os.defeito_relatado,'prisma',v_os.prisma,'vendedor',v_os.vendedor),
    'defeitos', COALESCE(v_def,'[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.os_patio_defeito_acao(p_id_defeito integer, p_id_colaborador integer, p_acao text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_def record; v_ap record; v_horas numeric; v_id_ap integer; v_restantes integer;
BEGIN
  SELECT id, id_os, id_area, status INTO v_def FROM os_defeitos WHERE id = p_id_defeito;
  IF v_def IS NULL THEN RETURN jsonb_build_object('ok',false,'erro','Defeito não encontrado'); END IF;

  SELECT * INTO v_ap FROM os_apontamentos
   WHERE id_defeito=p_id_defeito AND id_colaborador=p_id_colaborador AND hora_termino IS NULL
   ORDER BY id DESC LIMIT 1;

  IF p_acao IN ('ENTRADA','RETOMAR') THEN
    IF v_ap.id IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'erro','Você já tem um apontamento aberto neste defeito'); END IF;
    INSERT INTO os_apontamentos (id_os, id_defeito, id_area, id_colaborador, data_apontamento, hora_inicio, horas_trabalhadas, fator, faturavel)
    VALUES (v_def.id_os, p_id_defeito, v_def.id_area, p_id_colaborador, CURRENT_DATE, CURRENT_TIME, 0, 0, true)
    RETURNING id INTO v_id_ap;
    UPDATE os_defeitos SET status='EM_EXECUCAO' WHERE id=p_id_defeito;
    RETURN jsonb_build_object('ok',true,'status','EM_EXECUCAO','id_apontamento',v_id_ap);

  ELSIF p_acao IN ('PAUSA','FINALIZAR') THEN
    IF v_ap.id IS NOT NULL THEN
      v_horas := GREATEST(0, round(EXTRACT(EPOCH FROM (CURRENT_TIME - v_ap.hora_inicio))/3600.0, 2));
      UPDATE os_apontamentos SET hora_termino=CURRENT_TIME, horas_trabalhadas=v_horas, fator=v_horas WHERE id=v_ap.id;
      v_id_ap := v_ap.id;
    END IF;
    IF p_acao='FINALIZAR' THEN
      UPDATE os_defeitos SET status='CONCLUIDO' WHERE id=p_id_defeito;
      RETURN jsonb_build_object('ok',true,'status','CONCLUIDO','id_apontamento',v_id_ap);
    ELSE
      SELECT count(*) INTO v_restantes FROM os_apontamentos WHERE id_defeito=p_id_defeito AND hora_termino IS NULL;
      UPDATE os_defeitos SET status = CASE WHEN v_restantes>0 THEN 'EM_EXECUCAO' ELSE 'PAUSADO' END WHERE id=p_id_defeito;
      RETURN jsonb_build_object('ok',true,'status', CASE WHEN v_restantes>0 THEN 'EM_EXECUCAO' ELSE 'PAUSADO' END,'id_apontamento',v_id_ap);
    END IF;
  END IF;
  RETURN jsonb_build_object('ok',false,'erro','Ação inválida');
END $$;

CREATE OR REPLACE FUNCTION public.os_patio_tem_apont_aberto(p_id_os integer, p_id_colaborador integer)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
  SELECT EXISTS (SELECT 1 FROM os_apontamentos WHERE id_os=p_id_os AND id_colaborador=p_id_colaborador AND hora_termino IS NULL);
$$;

CREATE OR REPLACE FUNCTION public.os_patio_solicitar_peca(
  p_id_colaborador integer, p_id_os integer, p_id_produto integer, p_qtd numeric,
  p_id_defeito integer DEFAULT NULL, p_observacao text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_id integer; v_emp integer; v_uni integer;
BEGIN
  IF NOT public.os_patio_tem_apont_aberto(p_id_os, p_id_colaborador) THEN
    RETURN jsonb_build_object('ok',false,'erro','Você precisa estar apontado (entrada) nesta OS para solicitar peça');
  END IF;
  IF COALESCE(p_qtd,0) <= 0 THEN RETURN jsonb_build_object('ok',false,'erro','Quantidade inválida'); END IF;
  SELECT id_empresa INTO v_emp FROM ordens_servico WHERE id=p_id_os;
  SELECT id_unidade INTO v_uni FROM produtos WHERE id=p_id_produto;
  INSERT INTO solicitacoes_produto (id_empresa, origem, id_origem, id_produto, id_unidade, qtd_solicitada, qtd_atendida,
       prioridade, status, observacao, id_usuario_solicitante, reservou, data_solicitacao, criado_em)
  VALUES (v_emp, 'OS', p_id_os, p_id_produto, v_uni, p_qtd, 0, 3, 'PENDENTE', p_observacao, p_id_colaborador, false, now(), now())
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id);
END $$;

CREATE OR REPLACE FUNCTION public.os_patio_consumo(
  p_id_colaborador integer, p_id_os integer, p_id_produto integer, p_qtd numeric,
  p_id_defeito integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_id integer; v_desc varchar; v_area integer;
BEGIN
  IF NOT public.os_patio_tem_apont_aberto(p_id_os, p_id_colaborador) THEN
    RETURN jsonb_build_object('ok',false,'erro','Você precisa estar apontado (entrada) nesta OS para lançar consumo');
  END IF;
  IF COALESCE(p_qtd,0) <= 0 THEN RETURN jsonb_build_object('ok',false,'erro','Quantidade inválida'); END IF;
  SELECT nome INTO v_desc FROM produtos WHERE id=p_id_produto;
  IF v_desc IS NULL THEN RETURN jsonb_build_object('ok',false,'erro','Produto não encontrado'); END IF;
  SELECT id_area INTO v_area FROM os_defeitos WHERE id=p_id_defeito;
  INSERT INTO os_pecas (id_os, id_produto, descricao, quantidade, valor_unitario, valor_total, consumo, status, id_area, movimentou_estoque)
  VALUES (p_id_os, p_id_produto, v_desc, p_qtd, 0, 0, true, 'PENDENTE', v_area, false)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id,'descricao',v_desc);
END $$;

CREATE OR REPLACE FUNCTION public.os_prismas_dados(p_id_vendedor integer DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
  SELECT jsonb_build_object(
    'vendedores', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'nome',nome) ORDER BY nome)
       FROM usuarios WHERE ativo=true), '[]'::jsonb),
    'prismas', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'numero', p.numero, 'id_vendedor', p.id_vendedor, 'vendedor', u.nome, 'ativo', p.ativo,
        'em_uso', EXISTS(SELECT 1 FROM ordens_servico o WHERE o.id_prisma=p.id AND COALESCE(o.cancelada,false)=false AND o.status NOT IN ('FATURADA','CANCELADA')),
        'os_numero', (SELECT o2.numero FROM ordens_servico o2 WHERE o2.id_prisma=p.id AND COALESCE(o2.cancelada,false)=false AND o2.status NOT IN ('FATURADA','CANCELADA') ORDER BY o2.data_entrada DESC LIMIT 1)
      ) ORDER BY u.nome, p.numero)
      FROM prismas p JOIN usuarios u ON u.id=p.id_vendedor
      WHERE (p_id_vendedor IS NULL OR p.id_vendedor=p_id_vendedor)), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.os_prisma_salvar(p_id integer, p_numero text, p_id_vendedor integer, p_ativo boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
DECLARE v_id integer;
BEGIN
  IF COALESCE(trim(p_numero),'')='' THEN RETURN jsonb_build_object('ok',false,'erro','Número do prisma obrigatório'); END IF;
  IF p_id_vendedor IS NULL THEN RETURN jsonb_build_object('ok',false,'erro','Vendedor obrigatório'); END IF;
  IF p_id IS NULL THEN
    INSERT INTO prismas (numero, id_vendedor, ativo) VALUES (trim(p_numero), p_id_vendedor, COALESCE(p_ativo,true)) RETURNING id INTO v_id;
  ELSE
    UPDATE prismas SET numero=trim(p_numero), id_vendedor=p_id_vendedor, ativo=COALESCE(p_ativo,true) WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  RETURN jsonb_build_object('ok',true,'id',v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok',false,'erro','Esse vendedor já tem um prisma com esse número');
END $$;

CREATE OR REPLACE FUNCTION public.os_prisma_excluir(p_id integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'Teste ERP','public' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM ordens_servico WHERE id_prisma=p_id AND COALESCE(cancelada,false)=false AND status NOT IN ('FATURADA','CANCELADA')) THEN
    RETURN jsonb_build_object('ok',false,'erro','Prisma em uso por uma OS aberta');
  END IF;
  DELETE FROM prismas WHERE id=p_id;
  RETURN jsonb_build_object('ok',true);
END $$;
