import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, RotateCw, Pause, Play, Trash2, Download, Upload, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { lines as initial, type Line, type UserStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Usuarios — StreamPanel" }] }),
  component: UsersPage,
});

const genCredentials = () => ({
  username: `cliente${Math.floor(1000 + Math.random() * 9000)}`,
  password: Math.random().toString(36).slice(2, 10),
});

function UsersPage() {
  const [data, setData] = useState<Line[]>(initial);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ client: "", username: "", password: "", package: "Básico", maxConnections: 1, expiresAt: "2026-12-31" });

  const filtered = useMemo(
    () =>
      data.filter((l) =>
        (status === "all" || l.status === status) &&
        (l.client.toLowerCase().includes(q.toLowerCase()) || l.username.toLowerCase().includes(q.toLowerCase()))
      ),
    [data, q, status]
  );

  const setLineStatus = (id: string, s: UserStatus) => setData((d) => d.map((l) => l.id === id ? { ...l, status: s } : l));
  const remove = (id: string) => setData((d) => d.filter((l) => l.id !== id));

  const exportCsv = () => {
    const headers = ["client", "username", "password", "status", "package", "expiresAt"];
    const rows = data.map((l) => headers.map((h) => (l as any)[h]).join(","));
    const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "usuarios.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const create = () => {
    const id = `ln_${String(data.length + 1).padStart(3, "0")}`;
    setData((d) => [{ ...draft, id, createdAt: new Date().toISOString().slice(0, 10), status: "active" } as Line, ...d]);
    setOpen(false);
    setDraft({ client: "", username: "", password: "", package: "Básico", maxConnections: 1, expiresAt: "2026-12-31" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios / Líneas"
        description="Gestiona clientes, paquetes y vencimientos."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4" /> Exportar</Button>
            <Button variant="outline" size="sm"><Upload className="h-4 w-4" /> Importar</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" /> Nuevo usuario</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear línea</DialogTitle>
                  <DialogDescription>Configura los datos del nuevo cliente.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Nombre del cliente</Label>
                    <Input value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} placeholder="Carlos Mendoza" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Usuario</Label>
                    <div className="flex gap-2">
                      <Input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
                      <Button type="button" variant="outline" size="icon" onClick={() => setDraft({ ...draft, ...genCredentials() })}>
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contraseña</Label>
                    <Input value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Paquete</Label>
                    <Select value={draft.package} onValueChange={(v) => setDraft({ ...draft, package: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Básico", "Premium", "Full HD", "Sports", "Family"].map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Máx. conexiones</Label>
                    <Input type="number" min={1} value={draft.maxConnections} onChange={(e) => setDraft({ ...draft, maxConnections: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Fecha de vencimiento</Label>
                    <Input type="date" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={create}>Crear</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente o usuario..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="expired">Vencidos</SelectItem>
            <SelectItem value="suspended">Suspendidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Paquete</TableHead>
              <TableHead>Conex.</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <div className="font-medium">{l.client}</div>
                  {l.notes && <div className="text-xs text-muted-foreground">{l.notes}</div>}
                </TableCell>
                <TableCell><code className="text-xs">{l.username}</code></TableCell>
                <TableCell>{l.package}</TableCell>
                <TableCell>{l.maxConnections}</TableCell>
                <TableCell className="text-muted-foreground">{l.expiresAt}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Renovar" onClick={() => setLineStatus(l.id, "active")}>
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    {l.status === "active" ? (
                      <Button size="icon" variant="ghost" title="Suspender" onClick={() => setLineStatus(l.id, "suspended")}>
                        <Pause className="h-4 w-4 text-warning" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" title="Reactivar" onClick={() => setLineStatus(l.id, "active")}>
                        <Play className="h-4 w-4 text-success" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" title="Eliminar" onClick={() => remove(l.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Sin resultados</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} de {data.length} líneas</p>
    </div>
  );
}
