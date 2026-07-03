/**
 * /api/resellers/:id/credits — mueve créditos.
 *
 *   POST { delta: number, reason?: string }
 *     - admin: adminAdjust (+/-) sin descontarse
 *     - padre directo: transferCredits (+/-) contra su propio saldo
 *
 *   GET → últimos 50 movimientos donde `:id` es from/to
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  delta: z.number().int().refine((n) => n !== 0, "delta debe ser distinto de 0"),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const Route = createFileRoute("/api/resellers/$id/credits")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const [{ prisma }, { requireSession }, hierarchy] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
            import("@/lib/server/hierarchy.server"),
          ]);
          const session = await requireSession(request);
          if (session.error) return session.error;

          const target = await prisma.user.findUnique({ where: { id: params.id } });
          if (!target) return Response.json({ error: "No encontrado" }, { status: 404 });
          if (session.user.role !== "admin" && !(await hierarchy.isInSubtree(session.user.id, target.id))) {
            return Response.json({ error: "Permiso denegado" }, { status: 403 });
          }

          const txs = await prisma.creditTransaction.findMany({
            where: { OR: [{ fromUserId: params.id }, { toUserId: params.id }] },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true, delta: true, kind: true, reason: true, createdAt: true,
              actorId: true, fromUserId: true, toUserId: true, customerId: true,
            },
          });
          return Response.json({ transactions: txs, credits: target.credits });
        } catch (err) {
          console.error("[GET /api/resellers/:id/credits]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },

      POST: async ({ request, params }) => {
        try {
          const [{ prisma }, { requireSession }, credits] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
            import("@/lib/server/credits.server"),
          ]);
          const session = await requireSession(request);
          if (session.error) return session.error;

          const target = await prisma.user.findUnique({ where: { id: params.id } });
          if (!target) return Response.json({ error: "No encontrado" }, { status: 404 });
          if (target.id === session.user.id) {
            return Response.json({ error: "No puedes moverte créditos a ti mismo" }, { status: 400 });
          }

          const parsed = Body.safeParse(await request.json().catch(() => null));
          if (!parsed.success) {
            return Response.json({ error: "Datos inválidos" }, { status: 400 });
          }

          try {
            if (session.user.role === "admin") {
              const r = await credits.adminAdjust(session.user, target.id, parsed.data.delta, parsed.data.reason ?? null);
              return Response.json({ user: { id: r.id, credits: r.credits } });
            }
            // No-admin: solo puede mover hacia/desde hijo directo.
            const r = await credits.transferCredits(
              session.user,
              { id: target.id, parentId: target.parentId },
              parsed.data.delta,
              parsed.data.reason ?? null,
            );
            return Response.json({ user: { id: r.id, credits: r.credits } });
          } catch (err) {
            const mapped = credits.creditErrorResponse(err);
            if (mapped) return mapped;
            throw err;
          }
        } catch (err) {
          console.error("[POST /api/resellers/:id/credits]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});
