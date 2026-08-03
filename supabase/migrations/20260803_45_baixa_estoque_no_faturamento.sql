-- 45 — Baixa de estoque no faturamento da Venda/OS (regra única via trigger)
-- Regra do negócio: o estoque SAI quando a Venda ou a OS é FATURADA.
-- Implementado por trigger AFTER UPDATE (status -> FATURADA), baixando os itens
-- de PRODUTO/peça ainda não movimentados, sempre pelo helper único
-- public.erp_baixar_estoque (que grava o kardex e valida saldo).
-- Idempotente: itens já baixados (ex.: entregues pela separação, movimentou_estoque=true)
-- são pulados — nunca baixa duas vezes. Se faltar saldo, aborta o faturamento.

-- ── Venda ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "Teste ERP".trg_venda_baixa_estoque()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_item record; v_r jsonb;
BEGIN
  IF NEW.status = 'FATURADA' AND COALESCE(OLD.status,'') <> 'FATURADA' THEN
    FOR v_item IN
      SELECT vi.id, vi.id_produto, vi.quantidade, vi.descricao
      FROM "Teste ERP".vendas_itens vi
      WHERE vi.id_venda = NEW.id AND vi.tipo = 'PRODUTO'
        AND vi.id_produto IS NOT NULL AND COALESCE(vi.movimentou_estoque, false) = false
        AND COALESCE(vi.quantidade,0) > 0
    LOOP
      v_r := public.erp_baixar_estoque(v_item.id_produto, v_item.quantidade, NEW.id_empresa,
              'VENDA', NEW.id, NEW.numero, NEW.id_vendedor, NULL);
      IF NOT COALESCE((v_r->>'ok')::boolean, false) THEN
        RAISE EXCEPTION 'Estoque insuficiente para "%": %', v_item.descricao, COALESCE(v_r->>'msg','falha na baixa');
      END IF;
      UPDATE "Teste ERP".vendas_itens SET movimentou_estoque = true WHERE id = v_item.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_venda_baixa_estoque ON "Teste ERP".vendas;
CREATE TRIGGER trg_venda_baixa_estoque
  AFTER UPDATE OF status ON "Teste ERP".vendas
  FOR EACH ROW EXECUTE FUNCTION "Teste ERP".trg_venda_baixa_estoque();

-- ── Ordem de Serviço ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "Teste ERP".trg_os_baixa_estoque()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_item record; v_r jsonb;
BEGIN
  IF NEW.status = 'FATURADA' AND COALESCE(OLD.status,'') <> 'FATURADA' THEN
    FOR v_item IN
      SELECT pc.id, pc.id_produto, pc.quantidade, pc.descricao
      FROM "Teste ERP".os_pecas pc
      WHERE pc.id_os = NEW.id
        AND pc.id_produto IS NOT NULL AND COALESCE(pc.movimentou_estoque, false) = false
        AND COALESCE(pc.quantidade,0) > 0
    LOOP
      v_r := public.erp_baixar_estoque(v_item.id_produto, v_item.quantidade, NEW.id_empresa,
              'OS', NEW.id, NEW.numero, NEW.id_usuario_responsavel, NULL);
      IF NOT COALESCE((v_r->>'ok')::boolean, false) THEN
        RAISE EXCEPTION 'Estoque insuficiente para "%": %', v_item.descricao, COALESCE(v_r->>'msg','falha na baixa');
      END IF;
      UPDATE "Teste ERP".os_pecas SET movimentou_estoque = true WHERE id = v_item.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_os_baixa_estoque ON "Teste ERP".ordens_servico;
CREATE TRIGGER trg_os_baixa_estoque
  AFTER UPDATE OF status ON "Teste ERP".ordens_servico
  FOR EACH ROW EXECUTE FUNCTION "Teste ERP".trg_os_baixa_estoque();
