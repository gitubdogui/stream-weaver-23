import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const [{ prisma }, auth] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/auth.server"),
          ]);

          const token = auth.readSessionToken(request);
          if (!token) {
            return Response.json({ error: "No autenticado" }, { status: 401 });
          }
          const payload = auth.verifyToken(token);
          if (!payload?.sub) {
            return Response.json({ error: "Token inválido" }, { status: 401 });
          }
          const user = await prisma.user.findUnique({ where: { id: payload.sub } });
          if (!user || user.status !== "active") {
            return Response.json({ error: "Sesión no válida" }, { status: 401 });
          }
          return Response.json(auth.sanitizeUser(user));
        } catch (err) {
          console.error("[/api/auth/me]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});
