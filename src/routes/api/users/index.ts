/**
 * /api/users — clientes finales (líneas de streaming).
 *
 *   GET  /api/users   → lista (filtrada por subtree del actor)
 *   POST /api/users   → crea (descuenta 1 crédito al owner, salvo admin)
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

const CUSTOMER_SELECT = {
  id: true, client: true, username: true, package: true, status: true,
  expiresAt: true, maxConnections: true, resellerId: true, notes: true,
  createdAt: true, updatedAt: true,
} as const;

export const Route = createFileRoute("/api/users/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const [{ prisma }, { requireSession }, hierarchy] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
            import("@/lib/server/hierarchy.server"),
          ]);
          const auth = await requireSession(request);
          if (auth.error) return auth.error;

          const where = await hierarchy.visibleCustomerWhere(auth.user);
          const customers = await prisma.customer.findMany({
            where,
            orderBy: { createdAt: "desc" },
            select: {
              ...CUSTOMER_SELECT,
              reseller: { select: { id: true, name: true, username: true, role: true } },
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
          const [{ prisma }, { requireSession }, auth, hierarchy, creditsMod] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
            import("@/lib/server/auth.server"),
            import("@/lib/server/hierarchy.server"),
            import("@/lib/server/credits.server"),
          ]);
          const session = await requireSession(request);
          if (session.error) return session.error;
          if (session.user.role === "support") {
            return Response.json({ error: "Permiso denegado" }, { status: 403 });
          }

          const parsed = CreateBody.safeParse(await request.json().catch(() => null));
          if (!parsed.success) {
            return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
          }
          const data = parsed.data;

          // Determinar owner: por defecto el actor; puede asignarse a un
          // hijo directo dentro del árbol permitido.
          let ownerId: string = session.user.id;
          if (data.resellerId && data.resellerId !== session.user.id) {
            if (session.user.role === "admin") {
              ownerId = data.resellerId;
            } else if (await hierarchy.isInSubtree(session.user.id, data.resellerId)) {
              ownerId = data.resellerId;
            } else {
              return Response.json({ error: "resellerId fuera de tu árbol" }, { status: 403 });
            }
          }

          // Descuenta créditos antes de crear el customer para evitar sobrecrear.
          try {
            await creditsMod.consumeForCustomer(session.user, ownerId);
          } catch (err) {
            const r = creditsMod.creditErrorResponse(err);
            if (r) return r;
            throw err;
          }

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
              resellerId: ownerId,
              notes: data.notes ?? null,
            },
            select: {
              ...CUSTOMER_SELECT,
              reseller: { select: { id: true, name: true, username: true, role: true } },
            },
          });
          return Response.json({ customer: created }, { status: 201 });
        } catch (err: unknown) {
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
