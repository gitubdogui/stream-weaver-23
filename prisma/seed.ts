/**
 * Seed: crea (o actualiza) el admin inicial leyendo de .env.
 *
 * Variables requeridas:
 *   ADMIN_NAME
 *   ADMIN_EMAIL
 *   ADMIN_USERNAME
 *   ADMIN_PASSWORD
 *
 * Uso:
 *   npm run seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !username || !password) {
    throw new Error(
      "Faltan variables: ADMIN_NAME, ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD",
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD debe tener al menos 8 caracteres.");
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(password, rounds);

  const user = await prisma.user.upsert({
    where: { username },
    update: { name, email, passwordHash, role: "admin", status: "active" },
    create: { name, email, username, passwordHash, role: "admin", status: "active" },
  });

  console.log(`✔ Admin listo: ${user.username} <${user.email}> (id=${user.id})`);
}

main()
  .catch((e) => {
    console.error("✖ Seed falló:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
