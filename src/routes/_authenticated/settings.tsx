import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configuración — StreamWeaver Pro" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Ajustes generales del panel y seguridad." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-base font-semibold">General</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5"><Label>Nombre del panel</Label><Input defaultValue="StreamWeaver Pro" /></div>
            <div className="space-y-1.5"><Label>URL pública</Label><Input defaultValue="https://panel.mi-dominio.tv" /></div>
            <div className="space-y-1.5"><Label>Zona horaria</Label><Input defaultValue="America/Mexico_City" /></div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-base font-semibold">Seguridad</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">2FA obligatorio para admins</p><p className="text-xs text-muted-foreground">Autenticación en dos pasos</p></div><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Rate-limit en login</p><p className="text-xs text-muted-foreground">5 intentos / 10 min</p></div><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Ocultar URLs reales</p><p className="text-xs text-muted-foreground">Proxy interno para clientes</p></div><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Logs de actividad</p><p className="text-xs text-muted-foreground">Auditoría de acciones admin</p></div><Switch defaultChecked /></div>
          </div>
        </section>
      </div>

      <div className="flex justify-end"><Button>Guardar cambios</Button></div>
    </div>
  );
}
