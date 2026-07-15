import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pause, Play, Trash2, Download, Sparkles, RefreshCw, Pencil, KeyRound, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
type CustomerStatus = "active" | "expired" | "suspended";

interface ResellerInfo { id: string; name: string; username: string; role: string }

interface Customer {
  id: string;
  client: string | null;
  username: string;
  package: string;
  status: CustomerStatus;
  expiresAt: string | null;
  maxConnections: number;
  resellerId: string | null;
  reseller?: ResellerInfo | null;
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
  autoCredentials: boolean;
}

interface RevealCreds {
  client: string | null;
  username: string;
  password: string;
  package: string;
  status: CustomerStatus;
  expiresAt: string | null;
  maxConnections: number;
  title: string;
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
  autoCredentials: true,
};

const PACKAGES = ["Básico", "Premium", "Full HD", "Sports", "Family"] as const;

// Generador criptográficamente seguro (window.crypto).
function secureRandom(bytes: number): string {
  const arr = new Uint8Array(bytes);
  (globalThis.crypto ?? window.crypto).getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function genUsername(): string {
  const suffix = secureRandom(3); // 6 hex chars
  return `cli_${suffix}`;
}
function genPassword(): string {
  // 12 chars, alfanumérico mixto — evita ambigüedades (0/O, 1/l).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(12);
  (globalThis.crypto ?? window.crypto).getRandomValues(arr);
  return Array.from(arr).map((b) => alphabet[b % alphabet.length]).join("");
}

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

function toIsoDate(s: string): string | null {
  if (!s) return null;
  return new Date(`${s}T00:00:00.000Z`).toISOString();
}

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
function UsersPage() {
  const isMock = authService.mode === "mock";
  const session = authService.getSession();
  const role = session?.user.role ?? "support";
  const canWrite = role !== "support";
  const myCredits = session?.user.credits ?? 0;
  const isAdmin = role === "admin";
  const noBalance = !isAdmin && !isMock && myCredits < 1;

  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | CustomerStatus>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftCustomer>(EMPTY_DRAFT);

  const [editing, setEditing] = useState<Customer | null>(null);
  const [editDraft, setEditDraft] = useState<DraftCustomer>(EMPTY_DRAFT);
  const [editSaving, setEditSaving] = useState(false);

  // Modal para revelar credenciales UNA sola vez.
  const [reveal, setReveal] = useState<RevealCreds | null>(null);

  // Diálogo de reset de contraseña.
  const [resetTarget, setResetTarget] = useState<Customer | null>(null);
  const [resetAuto, setResetAuto] = useState(true);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

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
      const msg = err instanceof Error ? err.message : "Error cargando usuarios";
      setError(msg);
      toast.error(msg);
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

  const patch = async (id: string, body: Partial<{ status: CustomerStatus }>, successMsg?: string) => {
    if (isMock) {
      setData((d) => d.map((c) => (c.id === id ? { ...c, ...body } : c)));
      if (successMsg) toast.success(successMsg);
      return;
    }
    try {
      const { customer } = await api<{ customer: Customer }>(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setData((d) => d.map((c) => (c.id === id ? customer : c)));
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo actualizar";
      setError(msg);
      toast.error(msg);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este cliente? Quedará archivado (soft delete).")) return;
    if (isMock) {
      setData((d) => d.filter((c) => c.id !== id));
      toast.success("Cliente eliminado");
      return;
    }
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      setData((d) => d.filter((c) => c.id !== id));
      toast.success("Cliente eliminado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo eliminar";
      setError(msg);
      toast.error(msg);
    }
  };

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      // Si se pidió generar acceso automático y algún campo está vacío, lo rellenamos.
      const useUsername = draft.username.trim() || (draft.autoCredentials ? genUsername() : "");
      const usePassword = draft.password || (draft.autoCredentials ? genPassword() : "");
      if (!useUsername) {
        toast.error("Falta el usuario");
        setSaving(false);
        return;
      }
      const body = {
        client: draft.client || null,
        username: useUsername,
        password: usePassword || null,
        package: draft.package,
        status: draft.status,
        expiresAt: toIsoDate(draft.expiresAt),
        maxConnections: draft.maxConnections,
        notes: draft.notes || null,
      };
      let created: Customer;
      if (isMock) {
        const id = `ln_${String(data.length + 1).padStart(3, "0")}`;
        created = { id, ...body, expiresAt: body.expiresAt, resellerId: null } as Customer;
        setData((d) => [created, ...d]);
      } else {
        const res = await api<{ customer: Customer }>("/api/users", {
          method: "POST",
          body: JSON.stringify(body),
        });
        created = res.customer;
        setData((d) => [created, ...d]);
      }
      setCreateOpen(false);
      setDraft(EMPTY_DRAFT);
      toast.success("Cliente creado");
      if (usePassword) {
        setReveal({
          title: "Cliente creado",
          client: created.client,
          username: created.username,
          password: usePassword,
          package: created.package,
          status: created.status,
          expiresAt: created.expiresAt,
          maxConnections: created.maxConnections,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo crear";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setEditDraft({
      client: c.client ?? "",
      username: c.username,
      password: "",
      package: c.package,
      status: c.status,
      maxConnections: c.maxConnections,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
      notes: c.notes ?? "",
      autoCredentials: false,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        client: editDraft.client || null,
        package: editDraft.package,
        status: editDraft.status,
        expiresAt: toIsoDate(editDraft.expiresAt),
        maxConnections: editDraft.maxConnections,
        notes: editDraft.notes || null,
      };
      if (editDraft.password) body.password = editDraft.password;
      let updated: Customer;
      if (isMock) {
        updated = { ...editing, ...body, expiresAt: body.expiresAt as string | null } as Customer;
        setData((d) => d.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const res = await api<{ customer: Customer }>(`/api/users/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        updated = res.customer;
        setData((d) => d.map((c) => (c.id === editing.id ? updated : c)));
      }
      toast.success("Cliente actualizado");
      setEditing(null);
      if (editDraft.password) {
        setReveal({
          title: "Contraseña actualizada",
          client: updated.client,
          username: updated.username,
          password: editDraft.password,
          package: updated.package,
          status: updated.status,
          expiresAt: updated.expiresAt,
          maxConnections: updated.maxConnections,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo actualizar";
      setError(msg);
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const openReset = (c: Customer) => {
    setResetTarget(c);
    setResetAuto(true);
    setResetPassword("");
  };

  const doReset = async () => {
    if (!resetTarget) return;
    const newPass = resetAuto ? genPassword() : resetPassword.trim();
    if (!newPass || newPass.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    setResetting(true);
    try {
      let updated: Customer = resetTarget;
      if (!isMock) {
        const res = await api<{ customer: Customer }>(`/api/users/${resetTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify({ password: newPass }),
        });
        updated = res.customer;
        setData((d) => d.map((c) => (c.id === updated.id ? updated : c)));
      }
      toast.success("Contraseña reseteada");
      setResetTarget(null);
      setReveal({
        title: "Nueva contraseña generada",
        client: updated.client,
        username: updated.username,
        password: newPass,
        package: updated.package,
        status: updated.status,
        expiresAt: updated.expiresAt,
        maxConnections: updated.maxConnections,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo resetear";
      toast.error(msg);
    } finally {
      setResetting(false);
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
            ? "Modo demo: datos simulados."
            : `${isAdmin ? "Todos los clientes finales." : "Clientes de tu árbol."} ${isAdmin ? "" : `Coste por alta: 1 crédito · Saldo: ${myCredits}`}`
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Recargar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4" /> Exportar</Button>
            {canWrite && (
              <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setDraft(EMPTY_DRAFT); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4" /> Nuevo usuario</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear línea</DialogTitle>
                    <DialogDescription>Configura los datos del nuevo cliente. La contraseña se mostrará una sola vez.</DialogDescription>
                  </DialogHeader>
                  <CustomerForm draft={draft} setDraft={setDraft} mode="create" />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
                    <Button
                      onClick={create}
                      disabled={saving || noBalance || (!draft.autoCredentials && !draft.username.trim())}
                    >
                      {noBalance ? "Sin créditos" : saving ? "Creando..." : "Crear"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
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
              <TableHead>Dueño</TableHead>
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
                <TableCell className="text-xs text-muted-foreground">{c.reseller?.name ?? "—"}</TableCell>
                <TableCell>{c.package}</TableCell>
                <TableCell>{c.maxConnections}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "—"}
                </TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canWrite && (
                      <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canWrite && (
                      <Button size="icon" variant="ghost" title="Resetear contraseña" onClick={() => openReset(c)}>
                        <KeyRound className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {canWrite && (c.status === "active" ? (
                      <Button size="icon" variant="ghost" title="Suspender" onClick={() => patch(c.id, { status: "suspended" }, "Cliente suspendido")}>
                        <Pause className="h-4 w-4 text-warning" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" title="Reactivar" onClick={() => patch(c.id, { status: "active" }, "Cliente reactivado")}>
                        <Play className="h-4 w-4 text-success" />
                      </Button>
                    ))}
                    {canWrite && (
                      <Button size="icon" variant="ghost" title="Eliminar" onClick={() => remove(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Sin resultados</TableCell></TableRow>
            )}
            {loading && (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Cargando...</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} de {data.length} líneas{isMock ? " · modo demo" : ""}</p>

      {/* Diálogo edición */}
      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>Modifica los datos de {editing?.client ?? editing?.username}.</DialogDescription>
          </DialogHeader>
          <CustomerForm draft={editDraft} setDraft={setEditDraft} mode="edit" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={editSaving}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo reset contraseña */}
      <Dialog open={!!resetTarget} onOpenChange={(v) => { if (!v) setResetTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetear contraseña</DialogTitle>
            <DialogDescription>
              Cliente: <b>{resetTarget?.client ?? resetTarget?.username}</b> ·
              usuario <code>{resetTarget?.username}</code>. La contraseña anterior se pierde definitivamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={resetAuto} onCheckedChange={(v) => setResetAuto(!!v)} />
              Generar contraseña aleatoria segura
            </label>
            {!resetAuto && (
              <div className="space-y-1.5">
                <Label>Nueva contraseña</Label>
                <Input
                  type="text"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetting}>Cancelar</Button>
            <Button onClick={doReset} disabled={resetting}>
              {resetting ? "Guardando..." : "Resetear y mostrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal revelar credenciales (una sola vez) */}
      <RevealDialog reveal={reveal} onClose={() => setReveal(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
function CustomerForm({
  draft, setDraft, mode,
}: {
  draft: DraftCustomer;
  setDraft: (d: DraftCustomer) => void;
  mode: "create" | "edit";
}) {
  const toggleAuto = (v: boolean) => {
    if (v) {
      setDraft({ ...draft, autoCredentials: true, username: draft.username || genUsername(), password: genPassword() });
    } else {
      setDraft({ ...draft, autoCredentials: false });
    }
  };

  return (
    <div className="grid gap-4 py-2 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Nombre del cliente</Label>
        <Input value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} placeholder="Carlos Mendoza" />
      </div>

      {mode === "create" && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <Checkbox checked={draft.autoCredentials} onCheckedChange={(v) => toggleAuto(!!v)} />
          Generar acceso automático (usuario + contraseña seguros)
        </label>
      )}

      <div className="space-y-1.5">
        <Label>Usuario</Label>
        <div className="flex gap-2">
          <Input value={draft.username} disabled={mode === "edit"} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
          {mode === "create" && (
            <Button type="button" variant="outline" size="icon" title="Generar usuario" onClick={() => setDraft({ ...draft, username: genUsername() })}>
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{mode === "edit" ? "Nueva contraseña (opcional)" : "Contraseña"}</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={draft.password}
            onChange={(e) => setDraft({ ...draft, password: e.target.value })}
            placeholder={mode === "edit" ? "Dejar vacío para no cambiar" : "Se generará si queda vacío"}
          />
          <Button type="button" variant="outline" size="icon" title="Generar contraseña" onClick={() => setDraft({ ...draft, password: genPassword() })}>
            <KeyRound className="h-4 w-4" />
          </Button>
        </div>
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
        <Input type="number" min={1} max={99} value={draft.maxConnections} onChange={(e) => setDraft({ ...draft, maxConnections: Number(e.target.value) })} />
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
  );
}

// ---------------------------------------------------------------------------
function RevealDialog({ reveal, onClose }: { reveal: RevealCreds | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => {
    if (!reveal) return "";
    const exp = reveal.expiresAt ? new Date(reveal.expiresAt).toISOString().slice(0, 10) : "—";
    return [
      `Cliente: ${reveal.client ?? "—"}`,
      `Usuario: ${reveal.username}`,
      `Contraseña: ${reveal.password}`,
      `Paquete: ${reveal.package}`,
      `Estado: ${reveal.status}`,
      `Máx. conexiones: ${reveal.maxConnections}`,
      `Vence: ${exp}`,
    ].join("\n");
  }, [reveal]);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success("Datos copiados al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <Dialog open={!!reveal} onOpenChange={(v) => { if (!v) { setCopied(false); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reveal?.title ?? "Credenciales"}</DialogTitle>
          <DialogDescription>
            Copia estos datos ahora. La contraseña <b>no se volverá a mostrar</b>.
          </DialogDescription>
        </DialogHeader>
        {reveal && (
          <div className="space-y-3 py-2">
            <Row label="Cliente" value={reveal.client ?? "—"} />
            <Row label="Usuario" value={reveal.username} mono />
            <Row label="Contraseña" value={reveal.password} mono highlight />
            <Row label="Paquete" value={reveal.package} />
            <Row label="Estado" value={reveal.status} />
            <Row label="Máx. conexiones" value={String(reveal.maxConnections)} />
            <Row
              label="Vence"
              value={reveal.expiresAt ? new Date(reveal.expiresAt).toISOString().slice(0, 10) : "—"}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={doCopy}>
            {copied ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar datos</>}
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-sm ${mono ? "font-mono" : ""} ${highlight ? "font-semibold text-primary" : ""}`}>
        {value}
      </span>
    </div>
  );
}
