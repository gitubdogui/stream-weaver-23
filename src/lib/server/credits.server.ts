/**
 * Servicio de créditos (server-only).
 *
 * Reglas:
 *   - admin inyecta créditos sin descontar de nadie (adminTopup).
 *   - Un padre transfiere sus créditos a hijos directos (transferCredits).
 *   - Un padre puede quitar créditos a un hijo directo solo si el hijo tiene
 *     saldo suficiente (transferCredits con delta negativo).
 *   - Crear customer consume `CUSTOMER_CREATION_COST` créditos al owner
 *     (excepto admin, que no descuenta).
 *   - Todos los movimientos se auditan en `credit_transactions`.
 *
 * Concurrencia: todas las operaciones corren dentro de `$transaction`
 * usando `SELECT ... FOR UPDATE` sobre las filas afectadas para evitar
 * dobles gastos.
 */
import type { Prisma, User } from "@prisma/client";
import { prisma } from "./prisma.server";

export const CUSTOMER_CREATION_COST = Number(process.env.CUSTOMER_CREATION_COST ?? 1);

type Tx = Prisma.TransactionClient;

async function lockUserCredits(tx: Tx, userId: string): Promise<number> {
  const rows = await tx.$queryRaw<{ credits: number }[]>`
    SELECT credits FROM users WHERE id = ${userId} FOR UPDATE
  `;
  if (!rows.length) throw new Error("USER_NOT_FOUND");
  return rows[0].credits;
}

/** Admin agrega créditos a cualquier revendedor sin descontarse. */
export async function adminTopup(
  actor: User,
  toUserId: string,
  amount: number,
  reason?: string | null,
) {
  if (actor.role !== "admin") throw new Error("FORBIDDEN");
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");

  return prisma.$transaction(async (tx) => {
    await lockUserCredits(tx, toUserId);
    const updated = await tx.user.update({
      where: { id: toUserId },
      data: { credits: { increment: amount } },
      select: { id: true, credits: true },
    });
    await tx.creditTransaction.create({
      data: {
        actorId: actor.id,
        toUserId,
        delta: amount,
        kind: "admin_topup",
        reason: reason ?? null,
      },
    });
    return updated;
  });
}

/**
 * Transferencia padre ↔ hijo directo.
 * delta > 0: padre → hijo (debita padre, acredita hijo).
 * delta < 0: hijo → padre (debita hijo, acredita padre) — sólo si hijo tiene saldo.
 * `child.parentId` DEBE ser `actor.id`.
 */
export async function transferCredits(
  actor: User,
  child: { id: string; parentId: string | null },
  delta: number,
  reason?: string | null,
) {
  if (!Number.isInteger(delta) || delta === 0) throw new Error("INVALID_AMOUNT");
  if (child.parentId !== actor.id) throw new Error("NOT_DIRECT_CHILD");

  return prisma.$transaction(async (tx) => {
    const parentCredits = await lockUserCredits(tx, actor.id);
    const childCredits = await lockUserCredits(tx, child.id);
    const abs = Math.abs(delta);

    if (delta > 0 && parentCredits < abs) throw new Error("INSUFFICIENT_PARENT");
    if (delta < 0 && childCredits < abs)  throw new Error("INSUFFICIENT_CHILD");

    if (delta > 0) {
      await tx.user.update({ where: { id: actor.id }, data: { credits: { decrement: abs } } });
      await tx.user.update({ where: { id: child.id }, data: { credits: { increment: abs } } });
      await tx.creditTransaction.create({
        data: {
          actorId: actor.id,
          fromUserId: actor.id,
          toUserId: child.id,
          delta: abs,
          kind: "transfer_in",
          reason: reason ?? null,
        },
      });
    } else {
      await tx.user.update({ where: { id: child.id }, data: { credits: { decrement: abs } } });
      await tx.user.update({ where: { id: actor.id }, data: { credits: { increment: abs } } });
      await tx.creditTransaction.create({
        data: {
          actorId: actor.id,
          fromUserId: child.id,
          toUserId: actor.id,
          delta: abs,
          kind: "transfer_out",
          reason: reason ?? null,
        },
      });
    }

    const updated = await tx.user.findUnique({
      where: { id: child.id },
      select: { id: true, credits: true },
    });
    return updated!;
  });
}

/**
 * Consume créditos al `ownerId` por la creación de un customer.
 * Devuelve una función que registra la transacción con el customerId ya conocido.
 * Se llama dentro de un `$transaction` externo si es posible; aquí usamos
 * transacción propia y linkeamos el customerId con un UPDATE posterior.
 */
export async function consumeForCustomer(
  actor: User,
  ownerId: string,
  cost: number = CUSTOMER_CREATION_COST,
): Promise<{ chargedTo: string | null; cost: number }> {
  // Admin no descuenta (bolsa infinita).
  if (actor.role === "admin" && ownerId === actor.id) {
    return { chargedTo: null, cost: 0 };
  }
  if (!Number.isInteger(cost) || cost < 0) throw new Error("INVALID_COST");
  if (cost === 0) return { chargedTo: null, cost: 0 };

  await prisma.$transaction(async (tx) => {
    const credits = await lockUserCredits(tx, ownerId);
    if (credits < cost) throw new Error("INSUFFICIENT_CREDITS");
    await tx.user.update({
      where: { id: ownerId },
      data: { credits: { decrement: cost } },
    });
    await tx.creditTransaction.create({
      data: {
        actorId: actor.id,
        fromUserId: ownerId,
        delta: cost,
        kind: "customer_create",
        reason: `Alta cliente`,
      },
    });
  });
  return { chargedTo: ownerId, cost };
}

/** Ajuste manual de admin (positivo o negativo). */
export async function adminAdjust(
  actor: User,
  toUserId: string,
  delta: number,
  reason?: string | null,
) {
  if (actor.role !== "admin") throw new Error("FORBIDDEN");
  if (!Number.isInteger(delta) || delta === 0) throw new Error("INVALID_AMOUNT");

  return prisma.$transaction(async (tx) => {
    const credits = await lockUserCredits(tx, toUserId);
    if (delta < 0 && credits < Math.abs(delta)) throw new Error("INSUFFICIENT_CHILD");
    const updated = await tx.user.update({
      where: { id: toUserId },
      data: { credits: { increment: delta } },
      select: { id: true, credits: true },
    });
    await tx.creditTransaction.create({
      data: {
        actorId: actor.id,
        toUserId: delta > 0 ? toUserId : null,
        fromUserId: delta < 0 ? toUserId : null,
        delta: Math.abs(delta),
        kind: "adjust",
        reason: reason ?? null,
      },
    });
    return updated;
  });
}

/** Mapea errores conocidos del servicio a HTTP responses. */
export function creditErrorResponse(err: unknown): Response | null {
  const msg = err instanceof Error ? err.message : "";
  switch (msg) {
    case "FORBIDDEN":
      return Response.json({ error: "Permiso denegado" }, { status: 403 });
    case "INVALID_AMOUNT":
      return Response.json({ error: "Monto inválido" }, { status: 400 });
    case "INVALID_COST":
      return Response.json({ error: "Coste inválido" }, { status: 400 });
    case "NOT_DIRECT_CHILD":
      return Response.json({ error: "Solo puedes transferir a hijos directos" }, { status: 400 });
    case "INSUFFICIENT_PARENT":
      return Response.json({ error: "Saldo insuficiente" }, { status: 400 });
    case "INSUFFICIENT_CHILD":
      return Response.json({ error: "El destinatario no tiene saldo suficiente" }, { status: 400 });
    case "INSUFFICIENT_CREDITS":
      return Response.json({ error: "Créditos insuficientes para crear el cliente" }, { status: 402 });
    case "USER_NOT_FOUND":
      return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
    default:
      return null;
  }
}

// Utilidad para tipos exportables cuando se usan en handlers.
export type PrismaTx = Prisma.TransactionClient;
