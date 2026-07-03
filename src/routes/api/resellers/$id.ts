/**
 * /api/resellers/:id — actualización / suspensión con reglas de jerarquía.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const PatchBody = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(255).optional(),
  password: z.string().min(6).max(256).optional(),
  role: z.enum(["admin", "support", "superreseller", "reseller", "subreseller"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  parentId: z.string().uuid().optional().nullable(),
});

const SAFE_SELECT = {
  id: true, name: true, email: true, username: true, role: true,
  status: true, credits: true, parentId: true,
  createdAt: true, updatedAt: true, lastLogin: true,
} as const;

export const Route = createFileRoute("/api/resellers/$id")({
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

          const target = await prisma.user.findUnique({ where: { id: params.id } });
          if (!target) return Response.json({ error: "No encontrado" }, { status: 404 });
          if (!(await hierarchy.canManageUser(session.user, target))) {
            return Response.json({ error: "Permiso denegado" }, { status: 403 });
          }

          const json = await request.json().catch(() => null);
          const parsed = PatchBody.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
          }
          const data = parsed.data;

          // Solo admin puede cambiar role o parentId.
          if ((data.role !== undefined || data.parentId !== undefined) && session.user.role !== "admin") {
            return Response.json({ error: "Solo admin puede cambiar rol o padre" }, { status: 403 });
          }

          const patch: Record<string, unknown> = {};
          if (data.name !== undefined) patch.name = data.name;
          if (data.email !== undefined) patch.email = data.email.toLowerCase();
          if (data.role !== undefined) patch.role = data.role;
          if (data.status !== undefined) patch.status = data.status;
          if (data.parentId !== undefined) patch.parentId = data.parentId;
          if (data.password) patch.passwordHash = await auth.hashPassword(data.password);

          if (params.id === session.user.id && data.status === "suspended") {
            return Response.json({ error: "No puedes suspender tu propia cuenta" }, { status: 400 });
          }

          const updated = await prisma.user.update({
            where: { id: params.id }, data: patch, select: SAFE_SELECT,
          });
          return Response.json({ user: updated });
        } catch (err: unknown) {
          if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
            return Response.json({ error: "Email ya en uso" }, { status: 409 });
          }
          if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
            return Response.json({ error: "No encontrado" }, { status: 404 });
          }
          console.error("[PATCH /api/resellers/:id]", err);
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

          const target = await prisma.user.findUnique({ where: { id: params.id } });
          if (!target) return Response.json({ error: "No encontrado" }, { status: 404 });
          if (!(await hierarchy.canManageUser(session.user, target))) {
            return Response.json({ error: "Permiso denegado" }, { status: 403 });
          }
          if (params.id === session.user.id) {
            return Response.json({ error: "No puedes suspender tu propia cuenta" }, { status: 400 });
          }

          await prisma.user.update({
            where: { id: params.id }, data: { status: "suspended" },
          });
          return new Response(null, { status: 204 });
        } catch (err) {
          console.error("[DELETE /api/resellers/:id]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});
