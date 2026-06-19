/**
 * /api/resellers — gestión de cuentas de panel con role=reseller (también
 * admin/support si se filtra). Solo accesible para admins.
 *
 *   GET  /api/resellers        → lista usuarios del panel (admin)
 *   POST /api/resellers        → crea reseller (admin)
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CreateBody = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  username: z.string().trim().min(3).max(64),
  password: z.string().min(6).max(256),
  role: z.enum(["admin", "reseller", "support"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

const SAFE_SELECT = {
  id: true, name: true, email: true, username: true, role: true,
  status: true, createdAt: true, updatedAt: true, lastLogin: true,
} as const;

export const Route = createFileRoute("/api/resellers/")({
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
          const denied = requireRole(auth.user, ["admin"] as const);
          if (denied) return denied;

          const url = new URL(request.url);
          const role = url.searchParams.get("role");
          const where = role && ["admin", "reseller", "support"].includes(role)
            ? { role: role as "admin" | "reseller" | "support" }
            : {};

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
          const [{ prisma }, { requireSession, requireRole }, auth] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
            import("@/lib/server/auth.server"),
          ]);
          const session = await requireSession(request);
          if (session.error) return session.error;
          const denied = requireRole(session.user, ["admin"] as const);
          if (denied) return denied;

          const json = await request.json().catch(() => null);
          const parsed = CreateBody.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
          }
          const data = parsed.data;
          const passwordHash = await auth.hashPassword(data.password);

          const created = await prisma.user.create({
            data: {
              name: data.name,
              email: data.email.toLowerCase(),
              username: data.username,
              passwordHash,
              role: data.role ?? "reseller",
              status: data.status ?? "active",
            },
            select: SAFE_SELECT,
          });
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
