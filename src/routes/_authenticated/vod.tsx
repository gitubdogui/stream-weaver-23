import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { vods } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/vod")({
  head: () => ({ meta: [{ title: "VOD — StreamPanel" }] }),
  component: VodPage,
});

function VodPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => vods.filter((v) => v.title.toLowerCase().includes(q.toLowerCase())), [q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="VOD / Películas"
        description="Catálogo on-demand. Integración futura con TMDB."
        actions={<Button size="sm"><Plus className="h-4 w-4" /> Agregar película</Button>}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar película..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 max-w-md" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((v) => (
          <div key={v.id} className="group overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/50">
            <div className="relative aspect-[2/3] w-full" style={{ background: "var(--gradient-primary)" }}>
              <div className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-primary-foreground/80">{v.poster}</div>
              <div className="absolute right-2 top-2"><StatusBadge status={v.status} /></div>
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold">{v.title}</p>
              <p className="text-xs text-muted-foreground">{v.category} · {v.year} · {v.language}</p>
              <p className="text-xs text-muted-foreground">{v.duration} · {v.server}</p>
              <div className="mt-3 flex gap-1">
                <Button size="sm" variant="outline" className="flex-1"><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                <Button size="icon" variant="ghost"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
