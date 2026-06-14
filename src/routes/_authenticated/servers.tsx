import { createFileRoute } from "@tanstack/react-router";
import { Plus, Cpu, MemoryStick, HardDrive, Activity } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { servers } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/servers")({
  head: () => ({ meta: [{ title: "Servidores — StreamWeaver Pro" }] }),
  component: ServersPage,
});

type Tone = "primary" | "success" | "warning" | "destructive";
function Bar({ value, tone = "primary" }: { value: number; tone?: Tone }) {
  const toneCls = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", destructive: "bg-destructive" };
  const finalTone = value > 80 ? "destructive" : value > 60 ? "warning" : tone;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full ${toneCls[finalTone]}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function ServersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Servidores / Nodos"
        description="Monitorización de los nodos de streaming."
        actions={<Button size="sm"><Plus className="h-4 w-4" /> Añadir nodo</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {servers.map((s) => (
          <div key={s.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.host}:{s.port}</p>
              </div>
              <StatusBadge status={s.online ? "online" : "offline"} />
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Cpu className="h-3.5 w-3.5" /> CPU</span>
                  <span>{s.cpu}%</span>
                </div>
                <Bar value={s.cpu} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><MemoryStick className="h-3.5 w-3.5" /> RAM</span>
                  <span>{s.ram}%</span>
                </div>
                <Bar value={s.ram} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><HardDrive className="h-3.5 w-3.5" /> Disco</span>
                  <span>{s.disk}%</span>
                </div>
                <Bar value={s.disk} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Banda</p>
                <p className="text-sm font-semibold">{s.bandwidth}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Streams</p>
                <p className="text-sm font-semibold">{s.streams}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conex.</p>
                <p className="flex items-center justify-center gap-1 text-sm font-semibold"><Activity className="h-3 w-3 text-success" />{s.connections}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
