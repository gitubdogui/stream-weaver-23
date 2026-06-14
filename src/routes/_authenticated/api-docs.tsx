import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Copy, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/api-docs")({
  head: () => ({ meta: [{ title: "API & Docs — StreamWeaver Pro" }] }),
  component: ApiDocs,
});

const endpoints = [
  { method: "POST", path: "/api/v1/auth/login", desc: "Login por usuario y contraseña. Devuelve token JWT." },
  { method: "GET",  path: "/api/v1/user/info", desc: "Información de la línea autenticada." },
  { method: "GET",  path: "/api/v1/channels", desc: "Lista de canales en vivo permitidos para el usuario." },
  { method: "GET",  path: "/api/v1/vod", desc: "Catálogo de películas." },
  { method: "GET",  path: "/api/v1/series", desc: "Catálogo de series con temporadas y episodios." },
  { method: "GET",  path: "/api/v1/validate", desc: "Valida estado, vencimiento y límite de conexiones." },
];

const methodColors: Record<string, string> = {
  GET: "bg-success/15 text-success border-success/30",
  POST: "bg-primary/15 text-primary border-primary/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

const sampleResponse = `{
  "user": "cliente001",
  "status": "active",
  "exp_date": "2026-12-31",
  "max_connections": 2,
  "package": "Premium"
}`;

function ApiDocs() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="API & Documentación"
        description="Endpoints compatibles con apps externas tipo IPTV player."
      />

      <div className="flex items-center gap-2 rounded-lg border bg-success/5 px-4 py-3 text-sm">
        <ShieldCheck className="h-4 w-4 text-success" />
        Todos los endpoints requieren token JWT y respetan rate-limit por IP.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <div className="border-b p-4"><h2 className="text-base font-semibold">Endpoints</h2></div>
          <ul className="divide-y">
            {endpoints.map((e) => (
              <li key={e.path} className="flex items-start gap-3 p-4">
                <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${methodColors[e.method] ?? ""}`}>{e.method}</span>
                <div className="min-w-0">
                  <code className="block break-all text-sm">{e.path}</code>
                  <p className="mt-0.5 text-xs text-muted-foreground">{e.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-base font-semibold">Ejemplo de respuesta</h2>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(sampleResponse)}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
          <pre className="overflow-x-auto p-4 text-xs leading-6 text-foreground"><code>{sampleResponse}</code></pre>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold">Tokens de API</h2>
        <p className="mt-1 text-sm text-muted-foreground">Cada app externa debe usar un token único. Los tokens pueden revocarse en cualquier momento.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="rounded-md border bg-muted px-3 py-1.5 text-xs">sk_live_••••••••••••••••••••••••</code>
          <Button size="sm" variant="outline">Generar token</Button>
          <Button size="sm" variant="ghost" className="text-destructive">Revocar</Button>
        </div>
      </div>
    </div>
  );
}
