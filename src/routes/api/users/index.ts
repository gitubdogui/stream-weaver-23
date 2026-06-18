/**
 * /api/users — clientes finales (líneas de streaming).
 *
 *   GET  /api/users   → lista (admin/support ven todo, reseller ve los suyos)
 *   POST /api/users   → crea (admin / reseller)
 *
 * Protegido por sesión (cookie httpOnly `sw_session` o Bearer).
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CreateBody = z.object({
  client: z.string().trim().max(120).optional().nullable(),
  username: z.string().trim().min(3).max(64),
  password: z.string().min(1).max(256).optional().nullable(),
  package: z.string().trim().max(64).optional(),
  status: z.enum(["active", "expired", "suspended"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxConnections: z.number().int().min(1).max(99).optional(),
  resellerId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const Route = createFileRoute("/api/users/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const [{ prisma }, { requireSession, requireRole }] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
          ]);
          const auth = await requireSession(request);
          if (auth.error) return auth.error;
          const denied = requireRole(auth.user, ["admin", "reseller", "support"] as const);
          if (denied) return denied;

          const where: Record<string, unknown> = { deletedAt: null };
          if (auth.user.role === "reseller") where.resellerId = auth.user.id;

          const customers = await prisma.customer.findMany({
            where,
            orderBy: { createdAt: "desc" },
            select: {
              id: true, client: true, username: true, package: true, status: true,
              expiresAt: true, maxConnections: true, resellerId: true, notes: true,
              createdAt: true, updatedAt: true,
            },
          });
          return Response.json({ customers });
        } catch (err) {
          console.error("[GET /api/users]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },

      POST: async ({ request }) => {
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

          const json = await request.json().catch(() => null);
          const parsed = CreateBody.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
          }
          const data = parsed.data;

          // Reseller siempre se asigna a sí mismo. Admin puede asignar libremente.
          const resellerId =
            session.user.role === "reseller" ? session.user.id : (data.resellerId ?? null);

          const passwordHash = data.password ? await auth.hashPassword(data.password) : null;

          const created = await prisma.customer.create({
            data: {
              client: data.client ?? null,
              username: data.username,
              passwordHash,
              package: data.package ?? "Básico",
              status: data.status ?? "active",
              expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
              maxConnections: data.maxConnections ?? 1,
              resellerId,
              notes: data.notes ?? null,
            },
            select: {
              id: true, client: true, username: true, package: true, status: true,
              expiresAt: true, maxConnections: true, resellerId: true, notes: true,
              createdAt: true, updatedAt: true,
            },
          });
          return Response.json({ customer: created }, { status: 201 });
        } catch (err: unknown) {
          // Prisma unique violation
          if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
            return Response.json({ error: "El username ya existe" }, { status: 409 });
          }
          console.error("[POST /api/users]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});
