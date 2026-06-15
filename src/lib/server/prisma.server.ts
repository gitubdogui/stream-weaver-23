/**
 * Prisma singleton. Server-only.
 *
 * NOTE: Prisma + bcrypt + jsonwebtoken require a Node.js runtime (VPS / PM2 /
 * `npm run preview`). They are NOT compatible with Cloudflare Workers.
 * Para deploys edge usa un backend separado o un driver compatible.
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
