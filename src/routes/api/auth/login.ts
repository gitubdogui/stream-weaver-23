import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json().catch(() => null);
          const parsed = Body.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Datos inválidos" }, { status: 400 });
          }
          const { username, password } = parsed.data;

          // Dynamic import: mantiene Prisma/bcrypt/jwt fuera del bundle cliente.
          const [{ prisma }, auth] = await Promise.all([
            import("@/lib/server/prisma.server"),
            import("@/lib/server/auth.server"),
          ]);

          const user = await prisma.user.findUnique({
            where: { username: username.trim() },
          });
          if (!user) {
            return Response.json({ error: "Credenciales inválidas" }, { status: 401 });
          }
          if (user.status !== "active") {
            return Response.json({ error: "Cuenta suspendida" }, { status: 403 });
          }
          const ok = await auth.verifyPassword(password, user.passwordHash);
          if (!ok) {
            return Response.json({ error: "Credenciales inválidas" }, { status: 401 });
          }

          const updated = await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          const token = auth.signToken(updated);
          const safe = auth.sanitizeUser(updated);

          return new Response(JSON.stringify({ token, user: safe }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": auth.sessionCookie(token, 60 * 60 * 8), // 8h
            },
          });
        } catch (err) {
          console.error("[/api/auth/login]", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});
