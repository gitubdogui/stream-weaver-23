/**
 * /api/users/:id — actualización y soft-delete de un cliente final.
 *
 *   PATCH  /api/users/:id   → actualiza (incluye reasignar resellerId dentro del árbol)
 *   DELETE /api/users/:id   → soft delete (deletedAt = now)
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const PatchBody = z.object({
  client: z.string().trim().max(120).optional().nullable(),
  password: z.string().min(1).max(256).optional().nullable(),
  package: z.string().trim().max(64).optional(),
  status: z.enum(["active", "expired", "suspended"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxConnections: z.number().int().min(1).max(99).optional(),
  resellerId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const CUSTOMER_SELECT = {
  id: true, client: true, username: true, package: true, status: true,
  expiresAt: true, maxConnections: true, resellerId: true, notes: true,
  createdAt: true, updatedAt: true,
} as const;

export const Route = createFileRoute("/api/users/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const [{ prisma }, { requireSession }, auth, hierarchy] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
            import("@/lib/server/auth.server"),
            import("@/lib/server/hierarchy.server"),
          ]);
          const session = await requireSession(request);
          if (session.error) return session.error;
          if (session.user.role === "support") {
            return Response.json({ error: "Permiso denegado" }, { status: 403 });
          }

          const existing = await prisma.customer.findFirst({
            where: { id: params.id, deletedAt: null },
          });
          if (!existing) return Response.json({ error: "No encontrado" }, { status: 404 });
          if (!(await hierarchy.canManageCustomer(session.user, existing))) {
            return Response.json({ error: "Permiso denegado" }, { status: 403 });
          }

          const parsed = PatchBody.safeParse(await request.json().catch(() => null));
          if (!parsed.success) {
            return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
          }
          const data = parsed.data;

          const patch: Record<string, unknown> = {};
          if (data.client !== undefined) patch.client = data.client;
          if (data.package !== undefined) patch.package = data.package;
          if (data.status !== undefined) patch.status = data.status;
          if (data.expiresAt !== undefined) patch.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
          if (data.maxConnections !== undefined) patch.maxConnections = data.maxConnections;
          if (data.notes !== undefined) patch.notes = data.notes;
          if (data.password !== undefined && data.password !== null && data.password !== "") {
            patch.passwordHash = await auth.hashPassword(data.password);
          }
          // Reasignación de owner: admin o dentro del subtree del actor.
          if (data.resellerId !== undefined) {
            if (data.resellerId === null) {
              if (session.user.role !== "admin") {
                return Response.json({ error: "Solo admin puede desasignar owner" }, { status: 403 });
              }
              patch.resellerId = null;
            } else if (session.user.role === "admin" || (await hierarchy.isInSubtree(session.user.id, data.resellerId))) {
              patch.resellerId = data.resellerId;
            } else {
              return Response.json({ error: "resellerId fuera de tu árbol" }, { status: 403 });
            }
          }

          const updated = await prisma.customer.update({
            where: { id: params.id }, data: patch,
            select: {
              ...CUSTOMER_SELECT,
              reseller: { select: { id: true, name: true, username: true, role: true } },
            },
          });
          return Response.json({ customer: updated });
        } catch (err) {
          console.error("[PATCH /api/users/:id]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const [{ prisma }, { requireSession }, hierarchy] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
            import("@/lib/server/hierarchy.server"),
          ]);
          const session = await requireSession(request);
          if (session.error) return session.error;
          if (session.user.role === "support") {
            return Response.json({ error: "Permiso denegado" }, { status: 403 });
          }

          const existing = await prisma.customer.findFirst({
            where: { id: params.id, deletedAt: null },
          });
          if (!existing) return Response.json({ error: "No encontrado" }, { status: 404 });
          if (!(await hierarchy.canManageCustomer(session.user, existing))) {
            return Response.json({ error: "Permiso denegado" }, { status: 403 });
          }

          await prisma.customer.update({
            where: { id: params.id }, data: { deletedAt: new Date() },
          });
          return new Response(null, { status: 204 });
        } catch (err) {
          console.error("[DELETE /api/users/:id]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});
