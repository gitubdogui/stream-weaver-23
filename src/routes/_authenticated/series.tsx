import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { series } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/series")({
  head: () => ({ meta: [{ title: "Series — StreamPanel" }] }),
  component: SeriesPage,
});

function SeriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Series"
        description="Series, temporadas y episodios."
        actions={<Button size="sm"><Plus className="h-4 w-4" /> Nueva serie</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => (
          <div key={s.id} className="overflow-hidden rounded-xl border bg-card">
            <div className="flex gap-4 p-4">
              <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-md text-3xl font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                {s.poster}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">{s.title}</p>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-xs text-muted-foreground">{s.category}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" /> {s.seasons} temporadas · {s.episodes} episodios
                </p>
                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="outline"><Pencil className="h-3.5 w-3.5" /> Gestionar</Button>
                  <Button size="icon" variant="ghost"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
