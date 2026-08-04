-- 20260804_47_patio_servico_fundacao
--
-- Fundação do módulo Pátio/Serviço. Aditivo e idempotente (IF NOT EXISTS).
-- Acesso será via RPCs SECURITY DEFINER (sem GRANT direto a anon/authenticated).
--
-- Decisões (com o Leo):
--  - Unidade de trabalho do pátio = DEFEITO (ganha status).
--  - Prisma = pool de números, SEPARADO POR VENDEDOR (só o vendedor usa os dele);
--    liberado (id_prisma = NULL na OS) quando a OS é finalizada.
--  - Apontamento passa a referenciar o defeito.

-- 1) PRISMA: pool por vendedor
CREATE TABLE IF NOT EXISTS "Teste ERP".prismas (
  id          serial PRIMARY KEY,
  numero      varchar NOT NULL,
  id_vendedor integer NOT NULL REFERENCES "Teste ERP".usuarios(id),
  id_empresa  integer,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamp without time zone DEFAULT now(),
  UNIQUE (id_vendedor, numero)
);
CREATE INDEX IF NOT EXISTS ix_prismas_vendedor ON "Teste ERP".prismas (id_vendedor) WHERE ativo;

ALTER TABLE "Teste ERP".ordens_servico
  ADD COLUMN IF NOT EXISTS id_prisma integer REFERENCES "Teste ERP".prismas(id);
CREATE INDEX IF NOT EXISTS ix_os_prisma ON "Teste ERP".ordens_servico (id_prisma) WHERE id_prisma IS NOT NULL;

-- 2) STATUS no defeito
ALTER TABLE "Teste ERP".os_defeitos
  ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'ABERTO';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'os_defeitos_status_check') THEN
    ALTER TABLE "Teste ERP".os_defeitos
      ADD CONSTRAINT os_defeitos_status_check
      CHECK (status IN ('ABERTO','EM_EXECUCAO','PAUSADO','CONCLUIDO'));
  END IF;
END $$;

-- 3) APONTAMENTO por defeito
ALTER TABLE "Teste ERP".os_apontamentos
  ADD COLUMN IF NOT EXISTS id_defeito integer REFERENCES "Teste ERP".os_defeitos(id);
CREATE INDEX IF NOT EXISTS ix_apont_defeito ON "Teste ERP".os_apontamentos (id_defeito) WHERE id_defeito IS NOT NULL;
