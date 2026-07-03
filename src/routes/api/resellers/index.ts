/**
 * /api/resellers — cuentas del panel (User) con jerarquía + créditos.
 *
 *   GET  /api/resellers                → lista visibles en el subtree del actor
 *        ?children=me                  → solo hijos directos del actor
 *        ?role=reseller                → filtra por rol
 *   POST /api/resellers                → crea usuario (rol permitido por jerarquía)
 *
 * Roles:
 *   - admin puede crear cualquier rol
 *   - superreseller → reseller | subreseller
 *   - reseller     → subreseller
 *   - subreseller  → nada
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CreateBody = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  username: z.string().trim().min(3).max(64),
  password: z.string().min(6).max(256),
  role: z.enum(["admin", "support", "superreseller", "reseller", "subreseller"]),
  status: z.enum(["active", "suspended"]).optional(),
  parentId: z.string().uuid().optional().nullable(),
  initialCredits: z.number().int().min(0).max(1_000_000).optional(),
});

const SAFE_SELECT = {
  id: true, name: true, email: true, username: true, role: true,
  status: true, credits: true, parentId: true,
  createdAt: true, updatedAt: true, lastLogin: true,
} as const;

export const Route = createFileRoute("/api/resellers/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const [{ prisma }, { requireSession }, { visibleUserWhere }] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
            import("@/lib/server/hierarchy.server"),
          ]);
          const auth = await requireSession(request);
          if (auth.error) return auth.error;

          const url = new URL(request.url);
          const roleFilter = url.searchParams.get("role");
          const childrenOf = url.searchParams.get("children");

          const where = await visibleUserWhere(auth.user);
          if (roleFilter && ["admin", "support", "superreseller", "reseller", "subreseller"].includes(roleFilter)) {
            where.role = roleFilter as "admin" | "support" | "superreseller" | "reseller" | "subreseller";
          }
          if (childrenOf === "me") {
            where.parentId = auth.user.id;
          }

          const users = await prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            select: SAFE_SELECT,
          });
          return Response.json({ users });
        } catch (err) {
          console.error("[GET /api/resellers]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },

      POST: async ({ request }) => {
        try {
          const [{ prisma }, { requireSession }, auth, hierarchy, credits] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
            import("@/lib/server/auth.server"),
            import("@/lib/server/hierarchy.server"),
            import("@/lib/server/credits.server"),
          ]);
          const session = await requireSession(request);
          if (session.error) return session.error;

          const json = await request.json().catch(() => null);
          const parsed = CreateBody.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
          }
          const data = parsed.data;

          if (!hierarchy.canCreateRole(session.user.role, data.role)) {
            return Response.json({ error: "No puedes crear un usuario de ese rol" }, { status: 403 });
          }

          // parentId: admin puede pasar cualquiera (o null si crea admin/support);
          // resto: siempre se autoasigna como padre.
          let parentId: string | null;
          if (session.user.role === "admin") {
            parentId = data.parentId ?? null;
            if (parentId) {
              const p = await prisma.user.findUnique({ where: { id: parentId } });
              if (!p) return Response.json({ error: "parentId no existe" }, { status: 400 });
            }
          } else {
            parentId = session.user.id;
          }

          const passwordHash = await auth.hashPassword(data.password);
          const initialCredits = data.initialCredits ?? 0;

          // Si un no-admin quiere entregar créditos iniciales, debe tenerlos.
          if (initialCredits > 0 && session.user.role !== "admin") {
            const me = await prisma.user.findUnique({
              where: { id: session.user.id }, select: { credits: true },
            });
            if (!me || me.credits < initialCredits) {
              return Response.json({ error: "Saldo insuficiente para dotar créditos iniciales" }, { status: 400 });
            }
          }

          const created = await prisma.$transaction(async (tx) => {
            const u = await tx.user.create({
              data: {
                name: data.name,
                email: data.email.toLowerCase(),
                username: data.username,
                passwordHash,
                role: data.role,
                status: data.status ?? "active",
                parentId,
                credits: session.user.role === "admin" ? initialCredits : 0,
              },
              select: SAFE_SELECT,
            });
            if (initialCredits > 0 && session.user.role === "admin") {
              await tx.creditTransaction.create({
                data: {
                  actorId: session.user.id,
                  toUserId: u.id,
                  delta: initialCredits,
                  kind: "admin_topup",
                  reason: "Crédito inicial",
                },
              });
            }
            return u;
          });

          // Transferencia post-creación desde padre no-admin.
          if (initialCredits > 0 && session.user.role !== "admin" && parentId === session.user.id) {
            try {
              await credits.transferCredits(
                session.user,
                { id: created.id, parentId },
                initialCredits,
                "Crédito inicial",
              );
              // refrescar créditos del hijo
              const fresh = await prisma.user.findUnique({ where: { id: created.id }, select: SAFE_SELECT });
              if (fresh) return Response.json({ user: fresh }, { status: 201 });
            } catch (err) {
              const r = credits.creditErrorResponse(err);
              if (r) return r;
              throw err;
            }
          }

          return Response.json({ user: created }, { status: 201 });
        } catch (err: unknown) {
          if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
            return Response.json({ error: "Email o username ya existe" }, { status: 409 });
          }
          console.error("[POST /api/resellers]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});
