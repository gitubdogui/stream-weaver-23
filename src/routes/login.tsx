import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Radio, Lock, User, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { mockAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — StreamPanel" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const s = mockAuth.login(user.trim(), password);
      if (!s) { setError("Credenciales inválidas"); setLoading(false); return; }
      navigate({ to: "/dashboard" });
    }, 400);
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
                <Input id="user" value={user} onChange={(e) => setUser(e.target.value)} className="pl-9" autoComplete="username" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Contraseña</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" autoComplete="current-password" />
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

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo: usuario <code className="text-foreground">admin</code> / contraseña <code className="text-foreground">admin</code>
        </p>
      </div>
    </div>
  );
}
