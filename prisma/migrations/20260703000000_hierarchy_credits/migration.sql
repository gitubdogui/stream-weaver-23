-- StreamWeaver Pro — jerarquía real de revendedores + créditos.
--
-- Aplica en VPS con:
--   npx prisma migrate deploy && npx prisma generate

-- 1) Ampliar enum UserRole con los nuevos niveles.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'superreseller';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'subreseller';

-- 2) Nuevo enum para tipos de movimiento de créditos.
DO $$ BEGIN
  CREATE TYPE "CreditTxKind" AS ENUM (
    'admin_topup',
    'transfer_in',
    'transfer_out',
    'customer_create',
    'customer_refund',
    'adjust'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Añadir columnas parent_id + credits a users.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "parent_id" TEXT,
  ADD COLUMN IF NOT EXISTS "credits"   INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "users_parent_id_idx" ON "users"("parent_id");

DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Tabla de movimientos de créditos.
CREATE TABLE IF NOT EXISTS "credit_transactions" (
  "id"            TEXT NOT NULL,
  "actor_id"      TEXT NOT NULL,
  "from_user_id"  TEXT,
  "to_user_id"    TEXT,
  "customer_id"   TEXT,
  "delta"         INTEGER NOT NULL,
  "kind"          "CreditTxKind" NOT NULL,
  "reason"        TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "credit_transactions_actor_id_idx"       ON "credit_transactions"("actor_id");
CREATE INDEX IF NOT EXISTS "credit_transactions_from_user_id_idx"   ON "credit_transactions"("from_user_id");
CREATE INDEX IF NOT EXISTS "credit_transactions_to_user_id_idx"     ON "credit_transactions"("to_user_id");
CREATE INDEX IF NOT EXISTS "credit_transactions_customer_id_idx"    ON "credit_transactions"("customer_id");
CREATE INDEX IF NOT EXISTS "credit_transactions_created_at_idx"     ON "credit_transactions"("created_at");

DO $$ BEGIN
  ALTER TABLE "credit_transactions"
    ADD CONSTRAINT "credit_transactions_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "credit_transactions"
    ADD CONSTRAINT "credit_transactions_from_user_id_fkey"
    FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "credit_transactions"
    ADD CONSTRAINT "credit_transactions_to_user_id_fkey"
    FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "credit_transactions"
    ADD CONSTRAINT "credit_transactions_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
