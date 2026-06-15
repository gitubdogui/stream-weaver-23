import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        // JWT stateless: el cliente descarta el token. Aquí limpiamos la cookie.
        // Si más adelante añadimos una tabla de tokens revocados, este es el
        // sitio para invalidar.
        const { clearedSessionCookie } = await import("@/lib/server/auth.server");
        return new Response(null, {
          status: 204,
          headers: { "Set-Cookie": clearedSessionCookie },
        });
      },
    },
  },
});
