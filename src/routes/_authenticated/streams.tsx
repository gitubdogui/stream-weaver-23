import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Play, Square, RotateCw, Pencil, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { streams as initial, type Stream } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/streams")({
  head: () => ({ meta: [{ title: "Streams en vivo — StreamPanel" }] }),
  component: StreamsPage,
});

function StreamsPage() {
  const [data, setData] = useState<Stream[]>(initial);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => data.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const toggle = (id: string, online: boolean) => setData((d) => d.map((s) => s.id === id ? { ...s, online } : s));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Streams en vivo"
        description="Canales, fuentes, codecs y estado en tiempo real."
        actions={<Button size="sm"><Plus className="h-4 w-4" /> Nuevo canal</Button>}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar canal..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 max-w-md" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Servidor</TableHead>
              <TableHead>Bitrate / Codec</TableHead>
              <TableHead>Uptime</TableHead>
              <TableHead>Conex.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">{s.logo}</div>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.source}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{s.category}</TableCell>
                <TableCell><code className="text-xs">{s.server}</code></TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.bitrate} · {s.codec} · {s.fps}fps</TableCell>
                <TableCell className="text-muted-foreground">{s.uptime}</TableCell>
                <TableCell>{s.connections}</TableCell>
                <TableCell><StatusBadge status={s.online ? "online" : "offline"} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {s.online ? (
                      <Button size="icon" variant="ghost" title="Detener" onClick={() => toggle(s.id, false)}><Square className="h-4 w-4 text-destructive" /></Button>
                    ) : (
                      <Button size="icon" variant="ghost" title="Iniciar" onClick={() => toggle(s.id, true)}><Play className="h-4 w-4 text-success" /></Button>
                    )}
                    <Button size="icon" variant="ghost" title="Reiniciar"><RotateCw className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Editar"><Pencil className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
