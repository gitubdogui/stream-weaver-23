import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Pause, Play, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
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
import { resellers as mockResellers } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/resellers")({
  head: () => ({ meta: [{ title: "Revendedores — StreamWeaver Pro" }] }),
  component: ResellersPage,
});

type PanelRole = "admin" | "reseller" | "support";
type PanelStatus = "active" | "suspended";

interface PanelUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: PanelRole;
  status: PanelStatus;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

interface DraftUser {
  name: string;
  email: string;
  username: string;
  password: string;
  role: PanelRole;
  status: PanelStatus;
}

const EMPTY_DRAFT: DraftUser = {
  name: "", email: "", username: "", password: "",
  role: "reseller", status: "active",
};

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

function ResellersPage() {
  const isMock = authService.mode === "mock";
  const session = authService.getSession();
  const role = session?.user.role ?? "support";
  const isAdmin = role === "admin";

  const [data, setData] = useState<PanelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<DraftUser>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<PanelUser | null>(null);
  const [editDraft, setEditDraft] = useState<DraftUser>(EMPTY_DRAFT);
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      if (isMock) {
        setData(
          mockResellers.map((r) => ({
            id: r.id, name: r.username, email: r.email, username: r.username,
            role: "reseller", status: r.status === "active" ? "active" : "suspended",
            createdAt: r.createdAt, updatedAt: r.createdAt, lastLogin: null,
          }))
        );
      } else {
        const { users } = await api<{ users: PanelUser[] }>("/api/resellers");
        setData(users);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error cargando";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isMock, isAdmin]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setSaving(true);
    try {
      if (isMock) {
        setData((d) => [
          {
            id: `u_${Date.now()}`, ...draft,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLogin: null,
          },
          ...d,
        ]);
      } else {
        const { user } = await api<{ user: PanelUser }>("/api/resellers", {
          method: "POST",
          body: JSON.stringify(draft),
        });
        setData((d) => [user, ...d]);
      }
      toast.success("Cuenta creada. Ya puede iniciar sesión.");
      setCreateOpen(false);
      setDraft(EMPTY_DRAFT);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo crear";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: PanelUser) => {
    setEditing(u);
    setEditDraft({
      name: u.name, email: u.email, username: u.username,
      password: "", role: u.role, status: u.status,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: editDraft.name, email: editDraft.email,
        role: editDraft.role, status: editDraft.status,
      };
      if (editDraft.password) body.password = editDraft.password;
      if (isMock) {
        setData((d) => d.map((u) => (u.id === editing.id ? { ...u, ...body } as PanelUser : u)));
      } else {
        const { user } = await api<{ user: PanelUser }>(`/api/resellers/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setData((d) => d.map((u) => (u.id === editing.id ? user : u)));
      }
      toast.success("Cuenta actualizada");
      setEditing(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo actualizar";
      setError(msg);
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const toggleStatus = async (u: PanelUser) => {
    const next: PanelStatus = u.status === "active" ? "suspended" : "active";
    try {
      if (isMock) {
        setData((d) => d.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
      } else {
        const { user } = await api<{ user: PanelUser }>(`/api/resellers/${u.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: next }),
        });
        setData((d) => d.map((x) => (x.id === u.id ? user : x)));
      }
      toast.success(next === "active" ? "Cuenta reactivada" : "Cuenta suspendida");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo actualizar";
      toast.error(msg);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Revendedores" description="Solo administradores pueden gestionar cuentas del panel." />
        <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <ShieldAlert className="h-5 w-5 text-warning" />
          <span>Tu rol ({role}) no permite ver esta sección.</span>
        </div>
      </div>
    );
  }

  const totalActive = data.filter((u) => u.status === "active").length;
  const totalResellers = data.filter((u) => u.role === "reseller").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revendedores y cuentas del panel"
        description={isMock ? "Modo demo: datos simulados." : "Administra los usuarios que pueden iniciar sesión en el panel."}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Recargar
            </Button>
            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setDraft(EMPTY_DRAFT); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" /> Nuevo usuario</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear cuenta de panel</DialogTitle>
                  <DialogDescription>El usuario podrá iniciar sesión y, si es reseller, ver únicamente sus clientes.</DialogDescription>
                </DialogHeader>
                <UserForm draft={draft} setDraft={setDraft} mode="create" />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
                  <Button
                    onClick={create}
                    disabled={saving || draft.name.length < 2 || draft.username.length < 3 || draft.password.length < 6 || !draft.email.includes("@")}
                  >
                    {saving ? "Creando..." : "Crear"}
                  </Button>
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Cuentas</p>
          <p className="mt-2 text-3xl font-semibold">{data.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Activas</p>
          <p className="mt-2 text-3xl font-semibold text-success">{totalActive}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Resellers</p>
          <p className="mt-2 text-3xl font-semibold text-primary">{totalResellers}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último login</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell><code className="text-xs">@{u.username}</code></TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell className="capitalize">{u.role}</TableCell>
                <TableCell><StatusBadge status={u.status} /></TableCell>
                <TableCell className="text-muted-foreground">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={u.status === "active" ? "Suspender" : "Reactivar"}
                    onClick={() => toggleStatus(u)}
                    disabled={u.id === session?.user.id}
                  >
                    {u.status === "active"
                      ? <Pause className="h-4 w-4 text-warning" />
                      : <Play className="h-4 w-4 text-success" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Sin cuentas creadas</TableCell></TableRow>
            )}
            {loading && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Cargando...</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cuenta</DialogTitle>
            <DialogDescription>@{editing?.username}</DialogDescription>
          </DialogHeader>
          <UserForm draft={editDraft} setDraft={setEditDraft} mode="edit" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={editSaving}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({
  draft, setDraft, mode,
}: { draft: DraftUser; setDraft: (d: DraftUser) => void; mode: "create" | "edit" }) {
  return (
    <div className="grid gap-4 py-2 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Nombre completo</Label>
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Usuario</Label>
        <Input value={draft.username} disabled={mode === "edit"} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>{mode === "edit" ? "Nueva contraseña (opcional)" : "Contraseña"}</Label>
        <Input
          type="password"
          value={draft.password}
          onChange={(e) => setDraft({ ...draft, password: e.target.value })}
          placeholder={mode === "edit" ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Rol</Label>
        <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as PanelRole })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="reseller">Reseller</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Estado</Label>
        <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as PanelStatus })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="suspended">Suspendido</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
