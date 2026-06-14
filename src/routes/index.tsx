import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Radio } from "lucide-react";
import { authService } from "@/lib/auth-service";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Solo redirige en el navegador (auth basada en localStorage).
    if (typeof window === "undefined") return;
    throw redirect({ to: authService.isAuthenticated() ? "/dashboard" : "/login" });
  },
  component: RootRedirect,
});

function RootRedirect() {
  const navigate = useNavigate();

  // Fallback para el render inicial en SSR/hidratación: redirige en cliente
  // sin dejar pantalla negra.
  useEffect(() => {
    navigate({ to: authService.isAuthenticated() ? "/dashboard" : "/login", replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl animate-pulse"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Radio className="h-6 w-6 text-primary-foreground" />
        </div>
        <p className="text-sm">Cargando StreamPanel…</p>
      </div>
    </div>
  );
}
