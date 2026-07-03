/**
 * Helpers de jerarquía + permisos (server-only).
 *
 * Modelo:
 *   admin → superreseller → reseller → subreseller → customer
 *
 * Reglas:
 *   - Nadie ve o toca usuarios/clientes fuera de su subtree.
 *   - Cada rol solo puede crear roles estrictamente por debajo.
 *   - `admin` bypass total.
 */
import type { Prisma, User, UserRole } from "@prisma/client";
import { prisma } from "./prisma.server";

export type Role = UserRole;

/** Orden jerárquico (mayor a menor). */
export const ROLE_LEVEL: Record<Role, number> = {
  admin: 100,
  superreseller: 80,
  reseller: 60,
  subreseller: 40,
  support: 20,
};

/** ¿Este rol puede tener hijos revendedores? */
export function isResellerRole(role: Role): boolean {
  return role === "superreseller" || role === "reseller" || role === "subreseller";
}

/** Roles que un actor puede crear (por debajo suyo en la cadena). */
export function creatableRoles(actor: Role): Role[] {
  switch (actor) {
    case "admin":
      return ["admin", "support", "superreseller", "reseller", "subreseller"];
    case "superreseller":
      return ["reseller", "subreseller"];
    case "reseller":
      return ["subreseller"];
    default:
      return [];
  }
}

export function canCreateRole(actor: Role, target: Role): boolean {
  return creatableRoles(actor).includes(target);
}

/**
 * IDs de todos los descendientes del user (incluido él mismo).
 * Usa CTE recursivo en Postgres.
 */
export async function getSubtreeIds(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE tree AS (
      SELECT id FROM users WHERE id = ${userId}
      UNION ALL
      SELECT u.id FROM users u
      JOIN tree t ON u.parent_id = t.id
    )
    SELECT id FROM tree
  `;
  return rows.map((r) => r.id);
}

/** ¿`target` está dentro del subtree de `ancestor` (incluye igualdad)? */
export async function isInSubtree(ancestorId: string, targetId: string): Promise<boolean> {
  if (ancestorId === targetId) return true;
  const ids = await getSubtreeIds(ancestorId);
  return ids.includes(targetId);
}

/**
 * `where` de Prisma para filtrar Users visibles por el actor.
 * - admin/support: todos
 * - resto: solo su subtree (excluyéndose a sí mismo suele ser lo deseado;
 *   aquí lo INCLUIMOS para que /resellers muestre "yo" en el header).
 */
export async function visibleUserWhere(actor: User): Promise<Prisma.UserWhereInput> {
  if (actor.role === "admin" || actor.role === "support") return {};
  const ids = await getSubtreeIds(actor.id);
  return { id: { in: ids } };
}

/** `where` de Prisma para filtrar Customers visibles por el actor. */
export async function visibleCustomerWhere(actor: User): Promise<Prisma.CustomerWhereInput> {
  if (actor.role === "admin" || actor.role === "support") return { deletedAt: null };
  const ids = await getSubtreeIds(actor.id);
  return { deletedAt: null, resellerId: { in: ids } };
}

/** ¿Puede el actor gestionar (editar/suspender/borrar) a este usuario? */
export async function canManageUser(actor: User, target: User): Promise<boolean> {
  if (actor.id === target.id) return false; // nadie se auto-gestiona por aquí
  if (actor.role === "admin") return true;
  // No puede tocar usuarios de nivel ≥ al suyo.
  if (ROLE_LEVEL[target.role] >= ROLE_LEVEL[actor.role]) return false;
  return isInSubtree(actor.id, target.id);
}

/** ¿Puede el actor gestionar este customer? */
export async function canManageCustomer(
  actor: User,
  customer: { resellerId: string | null },
): Promise<boolean> {
  if (actor.role === "admin") return true;
  if (actor.role === "support") return false;
  if (!customer.resellerId) return false;
  return isInSubtree(actor.id, customer.resellerId);
}
