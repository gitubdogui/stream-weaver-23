import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pause, Play, Trash2, Download, Sparkles, RefreshCw } from "lucide-react";
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
import { authService } from "@/lib/auth-service";
import { lines as mockLines } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Usuarios — StreamWeaver Pro" }] }),
  component: UsersPage,
});

// ---------------------------------------------------------------------------
// Tipos compartidos con la API.
// ---------------------------------------------------------------------------
type CustomerStatus = "active" | "expired" | "suspended";

interface Customer {
  id: string;
  client: string | null;
  username: string;
  package: string;
  status: CustomerStatus;
  expiresAt: string | null;
  maxConnections: number;
  resellerId: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface DraftCustomer {
  client: string;
  username: string;
  password: string;
  package: string;
  status: CustomerStatus;
  maxConnections: number;
  expiresAt: string;
  notes: string;
}

const EMPTY_DRAFT: DraftCustomer = {
  client: "",
  username: "",
  password: "",
  package: "Básico",
  status: "active",
  maxConnections: 1,
  expiresAt: "2026-12-31",
  notes: "",
};

const PACKAGES = ["Básico", "Premium", "Full HD", "Sports", "Family"] as const;

const genCredentials = () => ({
  username: `cliente${Math.floor(1000 + Math.random() * 9000)}`,
  password: Math.random().toString(36).slice(2, 10),
});

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
function authHeader(): HeadersInit {
  const session = authService.getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeader(), ...(init.headers ?? {}) },
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Convierte líneas mock locales a la forma `Customer` para el modo demo.
function mockToCustomers(): Customer[] {
  return mockLines.map((l) => ({
    id: l.id,
    client: l.client,
    username: l.username,
    package: l.package,
    status: l.status,
    expiresAt: l.expiresAt ? new Date(l.expiresAt).toISOString() : null,
    maxConnections: l.maxConnections,
    resellerId: null,
    notes: l.notes ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
function UsersPage() {
  const isMock = authService.mode === "mock";
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | CustomerStatus>("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftCustomer>(EMPTY_DRAFT);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isMock) {
        setData(mockToCustomers());
      } else {
        const { customers } = await api<{ customers: Customer[] }>("/api/users");
        setData(customers);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }, [isMock]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () =>
      data.filter((c) => {
        if (status !== "all" && c.status !== status) return false;
        if (!q) return true;
        const needle = q.toLowerCase();
        return (
          (c.client ?? "").toLowerCase().includes(needle) ||
          c.username.toLowerCase().includes(needle)
        );
      }),
    [data, q, status]
  );

  const patch = async (id: string, body: Partial<{ status: CustomerStatus }>) => {
    if (isMock) {
      setData((d) => d.map((c) => (c.id === id ? { ...c, ...body } : c)));
      return;
    }
    try {
      const { customer } = await api<{ customer: Customer }>(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setData((d) => d.map((c) => (c.id === id ? customer : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  };

  const remove = async (id: string) => {
    if (isMock) {
      setData((d) => d.filter((c) => c.id !== id));
      return;
    }
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      setData((d) => d.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isMock) {
        const id = `ln_${String(data.length + 1).padStart(3, "0")}`;
        setData((d) => [
          {
            id,
            client: draft.client || null,
            username: draft.username,
            package: draft.package,
            status: draft.status,
            expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
            maxConnections: draft.maxConnections,
            resellerId: null,
            notes: draft.notes || null,
          },
          ...d,
        ]);
      } else {
        const { customer } = await api<{ customer: Customer }>("/api/users", {
          method: "POST",
          body: JSON.stringify({
            client: draft.client || null,
            username: draft.username,
            password: draft.password || null,
            package: draft.package,
            status: draft.status,
            expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
            maxConnections: draft.maxConnections,
            notes: draft.notes || null,
          }),
        });
        setData((d) => [customer, ...d]);
      }
      setOpen(false);
      setDraft(EMPTY_DRAFT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const headers = ["client", "username", "status", "package", "maxConnections", "expiresAt"];
    const rows = data.map((c) => headers.map((h) => (c as unknown as Record<string, unknown>)[h] ?? "").join(","));
    const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "usuarios.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios / Líneas"
        description={
          isMock
            ? "Modo demo: datos simulados. Cambia VITE_AUTH_MODE=api para conectar al backend real."
            : "Clientes finales del servicio de streaming."
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Recargar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4" /> Exportar</Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDraft(EMPTY_DRAFT); }}>
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
                    <Label>Contraseña (opcional)</Label>
                    <Input value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Paquete</Label>
                    <Select value={draft.package} onValueChange={(v) => setDraft({ ...draft, package: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PACKAGES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as CustomerStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="expired">Vencido</SelectItem>
                        <SelectItem value="suspended">Suspendido</SelectItem>
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
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Notas</Label>
                    <Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Cliente VIP, observaciones..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                  <Button onClick={create} disabled={saving || !draft.username.trim()}>{saving ? "Creando..." : "Crear"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente o usuario..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as "all" | CustomerStatus)}>
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
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.client ?? "—"}</div>
                  {c.notes && <div className="text-xs text-muted-foreground">{c.notes}</div>}
                </TableCell>
                <TableCell><code className="text-xs">{c.username}</code></TableCell>
                <TableCell>{c.package}</TableCell>
                <TableCell>{c.maxConnections}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "—"}
                </TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {c.status === "active" ? (
                      <Button size="icon" variant="ghost" title="Suspender" onClick={() => patch(c.id, { status: "suspended" })}>
                        <Pause className="h-4 w-4 text-warning" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" title="Reactivar" onClick={() => patch(c.id, { status: "active" })}>
                        <Play className="h-4 w-4 text-success" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" title="Eliminar" onClick={() => remove(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Sin resultados</TableCell></TableRow>
            )}
            {loading && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Cargando...</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} de {data.length} líneas{isMock ? " · modo demo" : ""}</p>
    </div>
  );
}
