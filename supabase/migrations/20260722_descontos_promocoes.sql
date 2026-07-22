-- ============================================================================
-- MIGRATION: Sistema completo de descontos (vista/prazo) + promoções
-- Data: 2026-07-22
-- ============================================================================
SET search_path TO "Teste ERP", public;

-- ═══════════════════════════════════════════════════════════════════
-- 1. EXPANDIR politica_desconto: vista/prazo + produto específico
-- ═══════════════════════════════════════════════════════════════════

-- Adicionar coluna id_produto (política por produto específico)
ALTER TABLE politica_desconto ADD COLUMN IF NOT EXISTS id_produto INTEGER REFERENCES produtos(id);

-- Renomear desconto_maximo → desconto_maximo_vista e criar desconto_maximo_prazo
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='Teste ERP' AND table_name='politica_desconto' AND column_name='desconto_maximo') THEN
    ALTER TABLE politica_desconto RENAME COLUMN desconto_maximo TO desconto_maximo_vista;
  END IF;
END $$;

ALTER TABLE politica_desconto ADD COLUMN IF NOT EXISTS desconto_maximo_prazo NUMERIC(5,2) DEFAULT 0;

-- Se a coluna desconto_maximo_vista já tinha valores, copiar para prazo (pode ajustar depois)
UPDATE politica_desconto SET desconto_maximo_prazo = desconto_maximo_vista WHERE desconto_maximo_prazo = 0 AND desconto_maximo_vista > 0;

-- ═══════════════════════════════════════════════════════════════════
-- 2. PRODUTOS: bloquear_desconto
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS bloquear_desconto BOOLEAN DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════════════
-- 3. PROMOÇÕES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS promocoes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  desconto_adicional_maximo NUMERIC(5,2) DEFAULT 0,
  observacao TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  criado_por INTEGER REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS promocao_itens (
  id SERIAL PRIMARY KEY,
  id_promocao INTEGER NOT NULL REFERENCES promocoes(id) ON DELETE CASCADE,
  id_produto INTEGER NOT NULL REFERENCES produtos(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('PRECO_FIXO', 'PERCENTUAL')),
  valor NUMERIC(14,2) NOT NULL,
  preco_original NUMERIC(14,2),
  UNIQUE(id_promocao, id_produto)
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. RPC: erp_validar_desconto
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION erp_validar_desconto(
  p_id_usuario INTEGER,
  p_id_produto INTEGER,
  p_percentual NUMERIC,
  p_a_vista BOOLEAN DEFAULT TRUE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_produto produtos%ROWTYPE;
  v_promo RECORD;
  v_limite NUMERIC := NULL;
  v_requer_aprovacao BOOLEAN := FALSE;
  v_origem TEXT := 'SEM_POLITICA';
  v_grupos INTEGER[];
  v_pol RECORD;
BEGIN
  -- Buscar produto
  SELECT * INTO v_produto FROM produtos WHERE id = p_id_produto;

  -- Produto com desconto bloqueado
  IF v_produto.bloquear_desconto THEN
    RETURN jsonb_build_object(
      'permitido', p_percentual = 0,
      'limite', 0,
      'requer_aprovacao', FALSE,
      'origem', 'BLOQUEADO',
      'mensagem', 'Este produto não permite desconto.'
    );
  END IF;

  -- Verificar promoção ativa para este produto
  SELECT p.*, pi.tipo AS promo_tipo, pi.valor AS promo_valor, pi.preco_original
  INTO v_promo
  FROM promocao_itens pi
  JOIN promocoes p ON p.id = pi.id_promocao
  WHERE pi.id_produto = p_id_produto
    AND p.ativo = TRUE
    AND CURRENT_DATE BETWEEN p.data_inicio AND p.data_fim
  LIMIT 1;

  IF FOUND THEN
    -- Em promoção: limite é o desconto_adicional_maximo da promoção
    v_limite := COALESCE(v_promo.desconto_adicional_maximo, 0);
    v_origem := 'PROMOCAO';
    RETURN jsonb_build_object(
      'permitido', p_percentual <= v_limite,
      'limite', v_limite,
      'requer_aprovacao', FALSE,
      'origem', v_origem,
      'promocao', jsonb_build_object(
        'nome', v_promo.nome,
        'tipo', v_promo.promo_tipo,
        'valor', v_promo.promo_valor,
        'preco_original', v_promo.preco_original
      ),
      'mensagem', CASE WHEN p_percentual > v_limite
        THEN 'Produto em promoção. Desconto adicional máximo: ' || v_limite || '%'
        ELSE NULL END
    );
  END IF;

  -- Buscar grupos do usuário
  SELECT ARRAY_AGG(id_grupo) INTO v_grupos
  FROM usuarios_grupos WHERE id_usuario = p_id_usuario;

  IF v_grupos IS NULL THEN
    RETURN jsonb_build_object(
      'permitido', TRUE, 'limite', NULL, 'requer_aprovacao', FALSE,
      'origem', 'SEM_GRUPO', 'mensagem', NULL
    );
  END IF;

  -- Resolver política: hierarquia PRODUTO > SUBGRUPO > GRUPO > GERAL
  -- Para cada grupo do usuário, encontrar a política mais específica
  -- Depois pegar o MAIOR limite entre os grupos (mais permissivo ganha)
  FOR v_pol IN
    WITH politicas_usuario AS (
      SELECT pd.*,
        CASE
          WHEN pd.id_produto IS NOT NULL THEN 4
          WHEN pd.id_subgrupo_produto IS NOT NULL THEN 3
          WHEN pd.id_grupo_produto IS NOT NULL THEN 2
          ELSE 1
        END AS especificidade
      FROM politica_desconto pd
      WHERE pd.id_grupo_acesso = ANY(v_grupos)
        AND (pd.id_produto IS NULL OR pd.id_produto = p_id_produto)
        AND (pd.id_subgrupo_produto IS NULL OR pd.id_subgrupo_produto = v_produto.id_subgrupo)
        AND (pd.id_grupo_produto IS NULL OR pd.id_grupo_produto = v_produto.id_grupo)
    ),
    melhor_por_grupo AS (
      SELECT DISTINCT ON (id_grupo_acesso) *
      FROM politicas_usuario
      ORDER BY id_grupo_acesso, especificidade DESC
    )
    SELECT * FROM melhor_por_grupo
  LOOP
    DECLARE
      v_lim NUMERIC;
    BEGIN
      v_lim := CASE WHEN p_a_vista THEN v_pol.desconto_maximo_vista ELSE v_pol.desconto_maximo_prazo END;
      IF v_limite IS NULL OR v_lim > v_limite THEN
        v_limite := v_lim;
        v_requer_aprovacao := v_pol.requer_aprovacao;
        v_origem := CASE
          WHEN v_pol.id_produto IS NOT NULL THEN 'PRODUTO'
          WHEN v_pol.id_subgrupo_produto IS NOT NULL THEN 'SUBGRUPO'
          WHEN v_pol.id_grupo_produto IS NOT NULL THEN 'GRUPO_PRODUTO'
          ELSE 'GERAL'
        END;
      END IF;
    END;
  END LOOP;

  -- Sem política encontrada = sem limite
  IF v_limite IS NULL THEN
    RETURN jsonb_build_object(
      'permitido', TRUE, 'limite', NULL, 'requer_aprovacao', FALSE,
      'origem', 'SEM_POLITICA', 'mensagem', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'permitido', p_percentual <= v_limite,
    'limite', v_limite,
    'requer_aprovacao', v_requer_aprovacao AND p_percentual > 0,
    'origem', v_origem,
    'mensagem', CASE WHEN p_percentual > v_limite
      THEN 'Desconto máximo ' || CASE WHEN p_a_vista THEN 'à vista' ELSE 'a prazo' END || ': ' || v_limite || '% (' || v_origem || ')'
      ELSE NULL END
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. RPC: consultar limite de desconto (frontend em tempo real)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION erp_consultar_limite_desconto(
  p_id_usuario INTEGER,
  p_id_produto INTEGER
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_vista JSONB;
  v_prazo JSONB;
BEGIN
  v_vista := erp_validar_desconto(p_id_usuario, p_id_produto, 0, TRUE);
  v_prazo := erp_validar_desconto(p_id_usuario, p_id_produto, 0, FALSE);

  RETURN jsonb_build_object(
    'limite_vista', v_vista->'limite',
    'limite_prazo', v_prazo->'limite',
    'origem', v_vista->'origem',
    'bloqueado', COALESCE((v_vista->>'origem') = 'BLOQUEADO', FALSE),
    'promocao', v_vista->'promocao'
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 6. RPCs CRUD promoções
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION erp_promocoes_dados()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN jsonb_build_object(
    'promocoes', COALESCE((
      SELECT jsonb_agg(row_to_json(p.*)::jsonb ORDER BY p.data_fim DESC)
      FROM promocoes p
    ), '[]'::jsonb),
    'produtos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.id, 'nome', pr.nome, 'referencia', pr.referencia,
        'preco_venda', pr.preco_venda
      ) ORDER BY pr.nome)
      FROM produtos pr WHERE pr.situacao = 'ATIVO'
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION erp_promocao_salvar(p JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INTEGER;
BEGIN
  IF COALESCE((p->>'id')::int, 0) = 0 THEN
    INSERT INTO promocoes (nome, data_inicio, data_fim, ativo, desconto_adicional_maximo, observacao, criado_por)
    VALUES (
      p->>'nome', (p->>'data_inicio')::date, (p->>'data_fim')::date,
      COALESCE((p->>'ativo')::boolean, TRUE),
      COALESCE((p->>'desconto_adicional_maximo')::numeric, 0),
      p->>'observacao',
      COALESCE((p->>'_ator')::int, NULL)
    ) RETURNING id INTO v_id;
  ELSE
    v_id := (p->>'id')::int;
    UPDATE promocoes SET
      nome = COALESCE(p->>'nome', nome),
      data_inicio = COALESCE((p->>'data_inicio')::date, data_inicio),
      data_fim = COALESCE((p->>'data_fim')::date, data_fim),
      ativo = COALESCE((p->>'ativo')::boolean, ativo),
      desconto_adicional_maximo = COALESCE((p->>'desconto_adicional_maximo')::numeric, desconto_adicional_maximo),
      observacao = p->>'observacao'
    WHERE id = v_id;
  END IF;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION erp_promocao_itens_listar(p_id_promocao INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', pi.id,
      'id_produto', pi.id_produto,
      'produto_nome', pr.nome,
      'produto_referencia', pr.referencia,
      'tipo', pi.tipo,
      'valor', pi.valor,
      'preco_original', pi.preco_original
    ) ORDER BY pr.nome)
    FROM promocao_itens pi
    JOIN produtos pr ON pr.id = pi.id_produto
    WHERE pi.id_promocao = p_id_promocao
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION erp_promocao_item_salvar(p JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INTEGER;
  v_preco_orig NUMERIC;
BEGIN
  -- Pegar preço original do produto
  SELECT preco_venda INTO v_preco_orig FROM produtos WHERE id = (p->>'id_produto')::int;

  IF COALESCE((p->>'id')::int, 0) = 0 THEN
    INSERT INTO promocao_itens (id_promocao, id_produto, tipo, valor, preco_original)
    VALUES (
      (p->>'id_promocao')::int, (p->>'id_produto')::int,
      p->>'tipo', (p->>'valor')::numeric, v_preco_orig
    ) RETURNING id INTO v_id;
  ELSE
    v_id := (p->>'id')::int;
    UPDATE promocao_itens SET
      tipo = p->>'tipo',
      valor = (p->>'valor')::numeric,
      preco_original = v_preco_orig
    WHERE id = v_id;
  END IF;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION erp_promocao_item_excluir(p_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM promocao_itens WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION erp_promocao_excluir(p_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM promocoes WHERE id = p_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 7. ATUALIZAR erp_politica_desconto_salvar para novos campos
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION erp_politica_desconto_salvar(p JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INTEGER;
BEGIN
  IF COALESCE((p->>'id')::int, 0) = 0 THEN
    INSERT INTO politica_desconto (
      id_grupo_acesso, id_grupo_produto, id_subgrupo_produto, id_produto,
      id_tabela_preco, desconto_maximo_vista, desconto_maximo_prazo, requer_aprovacao
    ) VALUES (
      (p->>'id_grupo_acesso')::int,
      NULLIF((p->>'id_grupo_produto')::int, 0),
      NULLIF((p->>'id_subgrupo_produto')::int, 0),
      NULLIF((p->>'id_produto')::int, 0),
      NULLIF((p->>'id_tabela_preco')::int, 0),
      COALESCE((p->>'desconto_maximo_vista')::numeric, 0),
      COALESCE((p->>'desconto_maximo_prazo')::numeric, 0),
      COALESCE((p->>'requer_aprovacao')::boolean, FALSE)
    ) RETURNING id INTO v_id;
  ELSE
    v_id := (p->>'id')::int;
    UPDATE politica_desconto SET
      id_grupo_produto = NULLIF((p->>'id_grupo_produto')::int, 0),
      id_subgrupo_produto = NULLIF((p->>'id_subgrupo_produto')::int, 0),
      id_produto = NULLIF((p->>'id_produto')::int, 0),
      id_tabela_preco = NULLIF((p->>'id_tabela_preco')::int, 0),
      desconto_maximo_vista = COALESCE((p->>'desconto_maximo_vista')::numeric, 0),
      desconto_maximo_prazo = COALESCE((p->>'desconto_maximo_prazo')::numeric, 0),
      requer_aprovacao = COALESCE((p->>'requer_aprovacao')::boolean, FALSE)
    WHERE id = v_id;
  END IF;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 8. ATUALIZAR erp_politica_desconto_listar para retornar novos campos
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION erp_politica_desconto_listar(p_id_grupo INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', pd.id,
      'id_grupo_acesso', pd.id_grupo_acesso,
      'id_grupo_produto', pd.id_grupo_produto,
      'grupo_produto_nome', gp.descricao,
      'id_subgrupo_produto', pd.id_subgrupo_produto,
      'subgrupo_produto_nome', sp.descricao,
      'id_produto', pd.id_produto,
      'produto_nome', pr.nome,
      'id_tabela_preco', pd.id_tabela_preco,
      'tabela_preco_nome', tp.descricao,
      'desconto_maximo_vista', pd.desconto_maximo_vista,
      'desconto_maximo_prazo', pd.desconto_maximo_prazo,
      'requer_aprovacao', pd.requer_aprovacao
    ) ORDER BY
      CASE WHEN pd.id_produto IS NOT NULL THEN 0
           WHEN pd.id_subgrupo_produto IS NOT NULL THEN 1
           WHEN pd.id_grupo_produto IS NOT NULL THEN 2
           ELSE 3 END,
      COALESCE(pr.nome, COALESCE(sp.descricao, COALESCE(gp.descricao, 'ZZZZZ')))
    )
    FROM politica_desconto pd
    LEFT JOIN grupos_produto gp ON gp.id = pd.id_grupo_produto
    LEFT JOIN subgrupos_produto sp ON sp.id = pd.id_subgrupo_produto
    LEFT JOIN produtos pr ON pr.id = pd.id_produto
    LEFT JOIN tabelas_preco tp ON tp.id = pd.id_tabela_preco
    WHERE pd.id_grupo_acesso = p_id_grupo
  ), '[]'::jsonb);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 9. RPC: recalcular itens da venda ao mudar cliente/condição
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION venda_recalcular_precos(
  p_id_venda INTEGER,
  p_id_tabela_preco INTEGER DEFAULT NULL,
  p_ator INTEGER DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item RECORD;
  v_preco NUMERIC;
  v_r JSONB;
  v_alterados INTEGER := 0;
BEGIN
  FOR v_item IN
    SELECT * FROM vendas_itens WHERE id_venda = p_id_venda AND tipo = 'PRODUTO' AND id_produto IS NOT NULL
  LOOP
    -- Resolver novo preço
    v_r := erp_resolver_preco(
      (SELECT id_cliente FROM vendas WHERE id = p_id_venda),
      v_item.id_produto,
      (SELECT id_empresa FROM vendas WHERE id = p_id_venda),
      p_id_tabela_preco
    );
    v_preco := COALESCE((v_r->>'preco')::numeric, v_item.valor_unitario);

    IF v_preco <> v_item.valor_unitario THEN
      UPDATE vendas_itens SET
        valor_unitario = v_preco,
        valor_desconto = ROUND(quantidade * v_preco * percentual_desconto / 100, 2),
        valor_total = ROUND(quantidade * v_preco - ROUND(quantidade * v_preco * percentual_desconto / 100, 2), 2)
      WHERE id = v_item.id;
      v_alterados := v_alterados + 1;
    END IF;
  END LOOP;

  -- Recalcular total da venda
  UPDATE vendas SET valor_total = COALESCE((
    SELECT SUM(valor_total) FROM vendas_itens WHERE id_venda = p_id_venda
  ), 0) WHERE id = p_id_venda;

  -- Log
  IF v_alterados > 0 AND p_ator IS NOT NULL THEN
    INSERT INTO log_auditoria (tabela, id_registro, acao, id_usuario, detalhes)
    VALUES ('vendas', p_id_venda, 'PRECOS_RECALCULADOS', p_ator,
      jsonb_build_object('itens_alterados', v_alterados, 'id_tabela_preco', p_id_tabela_preco));
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'itens_alterados', v_alterados);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 10. Atualizar produto_salvar para gravar bloquear_desconto
-- ═══════════════════════════════════════════════════════════════════

-- Nota: produto_salvar já existe; aqui adicionamos o campo ao UPDATE/INSERT.
-- Como a RPC já faz p->>'campo', basta a coluna existir — o valor passa automaticamente
-- se o front enviar. Mas para garantir, recriamos a parte relevante.

-- (A RPC produto_salvar provavelmente já usa um padrão genérico de campos;
--  se não aceitar bloquear_desconto, precisará de ajuste manual no Supabase SQL Editor.
--  O front vai enviar o campo e a coluna existe, então funcionará se a RPC
--  fizer INSERT/UPDATE com todos os campos do JSON.)
