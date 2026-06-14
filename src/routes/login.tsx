import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Radio, Lock, User, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/auth-service";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — StreamPanel" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demo = authService.getDemoCredentials();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await authService.login(user, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo iniciar sesión");
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at top, oklch(0.68 0.20 255 / 0.25), transparent 60%), radial-gradient(ellipse at bottom right, oklch(0.58 0.22 270 / 0.18), transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
            <Radio className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold">StreamPanel</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Admin Console</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-2xl" style={{ boxShadow: "var(--shadow-glow)" }}>
          <h1 className="text-xl font-semibold">Inicia sesión</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acceso restringido a administradores y revendedores.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user">Usuario</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="tu-usuario"
                  className="pl-9"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Contraseña</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? "Verificando..." : "Entrar al panel"}
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-2 rounded-lg border bg-accent/30 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            Sesión protegida — datos cifrados en tránsito.
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-dashed bg-muted/30 p-3 text-center text-[11px] text-muted-foreground">
          <p className="mb-1 font-medium uppercase tracking-wider">Credenciales de demo (mock)</p>
          <ul className="space-y-0.5">
            {demo.map((d) => (
              <li key={d.user}>
                <code className="text-foreground">{d.user}</code> / <code className="text-foreground">{d.password}</code>
                <span className="ml-1 opacity-70">— {d.role}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
