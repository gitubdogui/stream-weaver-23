-- StreamWeaver Pro — añade tabla `customers` (clientes finales de streaming).
-- Generada manualmente para que `prisma migrate deploy` la aplique en producción.

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'expired', 'suspended');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "client" TEXT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT,
    "package" TEXT NOT NULL DEFAULT 'Básico',
    "status" "CustomerStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(3),
    "max_connections" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "reseller_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_username_key" ON "customers"("username");
CREATE INDEX "customers_status_idx" ON "customers"("status");
CREATE INDEX "customers_reseller_id_idx" ON "customers"("reseller_id");
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_reseller_id_fkey"
    FOREIGN KEY ("reseller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
