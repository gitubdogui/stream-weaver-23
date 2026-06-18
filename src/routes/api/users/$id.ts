/**
 * /api/users/:id — actualización y soft-delete de un cliente final.
 *
 *   PATCH  /api/users/:id   → actualiza campos permitidos
 *   DELETE /api/users/:id   → soft delete (deletedAt = now)
 *
 * Reseller: sólo puede tocar sus propios clientes.
 * Admin:    puede tocar cualquiera.
 * Support:  sólo lectura (no llega aquí).
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

export const Route = createFileRoute("/api/users/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const [{ prisma }, { requireSession, requireRole }, auth] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
            import("@/lib/server/auth.server"),
          ]);
          const session = await requireSession(request);
          if (session.error) return session.error;
          const denied = requireRole(session.user, ["admin", "reseller"] as const);
          if (denied) return denied;

          const existing = await prisma.customer.findFirst({
            where: { id: params.id, deletedAt: null },
          });
          if (!existing) return Response.json({ error: "No encontrado" }, { status: 404 });
          if (session.user.role === "reseller" && existing.resellerId !== session.user.id) {
            return Response.json({ error: "Permiso denegado" }, { status: 403 });
          }

          const json = await request.json().catch(() => null);
          const parsed = PatchBody.safeParse(json);
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
          // Solo admin puede reasignar reseller.
          if (data.resellerId !== undefined && session.user.role === "admin") {
            patch.resellerId = data.resellerId;
          }

          const updated = await prisma.customer.update({
            where: { id: params.id },
            data: patch,
            select: {
              id: true, client: true, username: true, package: true, status: true,
              expiresAt: true, maxConnections: true, resellerId: true, notes: true,
              createdAt: true, updatedAt: true,
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
          const [{ prisma }, { requireSession, requireRole }] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
          ]);
          const session = await requireSession(request);
          if (session.error) return session.error;
          const denied = requireRole(session.user, ["admin", "reseller"] as const);
          if (denied) return denied;

          const existing = await prisma.customer.findFirst({
            where: { id: params.id, deletedAt: null },
          });
          if (!existing) return Response.json({ error: "No encontrado" }, { status: 404 });
          if (session.user.role === "reseller" && existing.resellerId !== session.user.id) {
            return Response.json({ error: "Permiso denegado" }, { status: 403 });
          }

          await prisma.customer.update({
            where: { id: params.id },
            data: { deletedAt: new Date() },
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
