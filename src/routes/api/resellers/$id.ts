/**
 * /api/resellers/:id — actualización / suspensión / borrado de usuarios panel.
 * Solo admin.
 *
 *   PATCH  /api/resellers/:id
 *   DELETE /api/resellers/:id   → suspend (status=suspended). No borra cuentas.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const PatchBody = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(255).optional(),
  password: z.string().min(6).max(256).optional(),
  role: z.enum(["admin", "reseller", "support"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

const SAFE_SELECT = {
  id: true, name: true, email: true, username: true, role: true,
  status: true, createdAt: true, updatedAt: true, lastLogin: true,
} as const;

export const Route = createFileRoute("/api/resellers/$id")({
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
          const denied = requireRole(session.user, ["admin"] as const);
          if (denied) return denied;

          const json = await request.json().catch(() => null);
          const parsed = PatchBody.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
          }
          const data = parsed.data;
          const patch: Record<string, unknown> = {};
          if (data.name !== undefined) patch.name = data.name;
          if (data.email !== undefined) patch.email = data.email.toLowerCase();
          if (data.role !== undefined) patch.role = data.role;
          if (data.status !== undefined) patch.status = data.status;
          if (data.password) patch.passwordHash = await auth.hashPassword(data.password);

          // Evita que el admin se auto-desactive y se quede fuera.
          if (params.id === session.user.id && data.status === "suspended") {
            return Response.json({ error: "No puedes suspender tu propia cuenta" }, { status: 400 });
          }

          const updated = await prisma.user.update({
            where: { id: params.id },
            data: patch,
            select: SAFE_SELECT,
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
          const [{ prisma }, { requireSession, requireRole }] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/require-auth.server"),
          ]);
          const session = await requireSession(request);
          if (session.error) return session.error;
          const denied = requireRole(session.user, ["admin"] as const);
          if (denied) return denied;

          if (params.id === session.user.id) {
            return Response.json({ error: "No puedes suspender tu propia cuenta" }, { status: 400 });
          }

          await prisma.user.update({
            where: { id: params.id },
            data: { status: "suspended" },
          });
          return new Response(null, { status: 204 });
        } catch (err: unknown) {
          if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
            return Response.json({ error: "No encontrado" }, { status: 404 });
          }
          console.error("[DELETE /api/resellers/:id]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});
