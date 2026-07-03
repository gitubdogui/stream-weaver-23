import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Pause, Play, RefreshCw, ShieldAlert, Coins } from "lucide-react";
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
import { authService, type Role } from "@/lib/auth-service";
import { resellers as mockResellers } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/resellers")({
  head: () => ({ meta: [{ title: "Revendedores — StreamWeaver Pro" }] }),
  component: ResellersPage,
});

type PanelStatus = "active" | "suspended";

interface PanelUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  status: PanelStatus;
  credits: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

interface DraftUser {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  status: PanelStatus;
  initialCredits: number;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  support: "Support",
  superreseller: "Super Reseller",
  reseller: "Reseller",
  subreseller: "Sub Reseller",
};

function creatableRoles(actor: Role): Role[] {
  switch (actor) {
    case "admin": return ["admin", "support", "superreseller", "reseller", "subreseller"];
    case "superreseller": return ["reseller", "subreseller"];
    case "reseller": return ["subreseller"];
    default: return [];
  }
}

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
  const role: Role = session?.user.role ?? "support";
  const myId = session?.user.id ?? "";
  const myCredits = session?.user.credits ?? 0;
  const canManage = role !== "support" && role !== "subreseller";
  const rolesICanCreate = creatableRoles(role);

  const [data, setData] = useState<PanelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<DraftUser>({
    name: "", email: "", username: "", password: "",
    role: rolesICanCreate[0] ?? "subreseller", status: "active", initialCredits: 0,
  });
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<PanelUser | null>(null);
  const [editDraft, setEditDraft] = useState<DraftUser | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [creditFor, setCreditFor] = useState<PanelUser | null>(null);
  const [creditDelta, setCreditDelta] = useState<number>(0);
  const [creditReason, setCreditReason] = useState<string>("");
  const [creditSaving, setCreditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isMock) {
        setData(
          mockResellers.map((r) => ({
            id: r.id, name: r.username, email: r.email, username: r.username,
            role: "reseller", status: r.status === "active" ? "active" : "suspended",
            credits: 0, parentId: null,
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
  }, [isMock]);

  useEffect(() => { void load(); }, [load]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    data.forEach((u) => m.set(u.id, u.name));
    return m;
  }, [data]);

  const create = async () => {
    setSaving(true);
    try {
      const body = {
        name: draft.name, email: draft.email, username: draft.username,
        password: draft.password, role: draft.role, status: draft.status,
        initialCredits: draft.initialCredits || undefined,
      };
      if (isMock) {
        setData((d) => [
          {
            id: `u_${Date.now()}`, ...body,
            credits: draft.initialCredits, parentId: myId,
            initialCredits: undefined,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLogin: null,
          } as unknown as PanelUser,
          ...d,
        ]);
      } else {
        const { user } = await api<{ user: PanelUser }>("/api/resellers", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setData((d) => [user, ...d]);
      }
      toast.success("Cuenta creada.");
      setCreateOpen(false);
      setDraft({
        name: "", email: "", username: "", password: "",
        role: rolesICanCreate[0] ?? "subreseller", status: "active", initialCredits: 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo crear";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: PanelUser) => {
    setEditing(u);
    setEditDraft({
      name: u.name, email: u.email, username: u.username,
      password: "", role: u.role, status: u.status, initialCredits: 0,
    });
  };

  const saveEdit = async () => {
    if (!editing || !editDraft) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: editDraft.name, email: editDraft.email, status: editDraft.status,
      };
      if (role === "admin") body.role = editDraft.role;
      if (editDraft.password) body.password = editDraft.password;
      const { user } = await api<{ user: PanelUser }>(`/api/resellers/${editing.id}`, {
        method: "PATCH", body: JSON.stringify(body),
      });
      setData((d) => d.map((u) => (u.id === editing.id ? user : u)));
      toast.success("Cuenta actualizada");
      setEditing(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo actualizar";
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const toggleStatus = async (u: PanelUser) => {
    const next: PanelStatus = u.status === "active" ? "suspended" : "active";
    try {
      const { user } = await api<{ user: PanelUser }>(`/api/resellers/${u.id}`, {
        method: "PATCH", body: JSON.stringify({ status: next }),
      });
      setData((d) => d.map((x) => (x.id === u.id ? user : x)));
      toast.success(next === "active" ? "Cuenta reactivada" : "Cuenta suspendida");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const openCredits = (u: PanelUser) => {
    setCreditFor(u);
    setCreditDelta(0);
    setCreditReason("");
  };

  const submitCredits = async () => {
    if (!creditFor || !creditDelta) return;
    setCreditSaving(true);
    try {
      const { user } = await api<{ user: { id: string; credits: number } }>(
        `/api/resellers/${creditFor.id}/credits`,
        { method: "POST", body: JSON.stringify({ delta: creditDelta, reason: creditReason || null }) },
      );
      setData((d) => d.map((x) => (x.id === user.id ? { ...x, credits: user.credits } : x)));
      toast.success("Créditos actualizados");
      setCreditFor(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setCreditSaving(false);
    }
  };

  if (role === "support") {
    return (
      <div className="space-y-6">
        <PageHeader title="Revendedores" description="Solo revendedores y admin pueden gestionar cuentas." />
        <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <ShieldAlert className="h-5 w-5 text-warning" />
          <span>Tu rol ({role}) no permite ver esta sección.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revendedores y cuentas del panel"
        description={isMock
          ? "Modo demo: datos simulados."
          : `Árbol jerárquico. Tu rol: ${ROLE_LABELS[role]}${role !== "admin" ? ` · Saldo: ${myCredits} créditos` : ""}.`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Recargar
            </Button>
            {rolesICanCreate.length > 0 && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4" /> Nuevo usuario</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear cuenta de panel</DialogTitle>
                    <DialogDescription>
                      Se creará como hijo directo de tu cuenta{role === "admin" ? " (o del padre indicado)" : ""}.
                    </DialogDescription>
                  </DialogHeader>
                  <UserForm draft={draft} setDraft={setDraft} mode="create" allowedRoles={rolesICanCreate} isAdmin={role === "admin"} />
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
            )}
          </>
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Cuentas</p>
          <p className="mt-2 text-3xl font-semibold">{data.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Activas</p>
          <p className="mt-2 text-3xl font-semibold text-success">{data.filter((u) => u.status === "active").length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Hijos directos</p>
          <p className="mt-2 text-3xl font-semibold text-primary">{data.filter((u) => u.parentId === myId).length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{role === "admin" ? "Créditos en sistema" : "Mis créditos"}</p>
          <p className="mt-2 text-3xl font-semibold text-primary">
            {role === "admin" ? data.reduce((s, u) => s + (u.credits ?? 0), 0) : myCredits}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Padre</TableHead>
              <TableHead>Créditos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((u) => {
              const isDirectChild = u.parentId === myId;
              const canTouch = canManage && u.id !== myId && (role === "admin" || isDirectChild);
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell><code className="text-xs">@{u.username}</code></TableCell>
                  <TableCell><span className="rounded-md bg-muted px-2 py-0.5 text-xs">{ROLE_LABELS[u.role]}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.parentId ? (nameById.get(u.parentId) ?? "—") : "—"}
                  </TableCell>
                  <TableCell className="font-mono">{u.credits ?? 0}</TableCell>
                  <TableCell><StatusBadge status={u.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canTouch && (role === "admin" || isDirectChild) && (
                        <Button size="icon" variant="ghost" title="Créditos" onClick={() => openCredits(u)}>
                          <Coins className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {canTouch && (
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canTouch && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title={u.status === "active" ? "Suspender" : "Reactivar"}
                          onClick={() => toggleStatus(u)}
                        >
                          {u.status === "active"
                            ? <Pause className="h-4 w-4 text-warning" />
                            : <Play className="h-4 w-4 text-success" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Sin cuentas visibles</TableCell></TableRow>
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
          {editDraft && (
            <UserForm draft={editDraft} setDraft={setEditDraft as (d: DraftUser) => void} mode="edit" allowedRoles={rolesICanCreate} isAdmin={role === "admin"} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={editSaving}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!creditFor} onOpenChange={(v) => { if (!v) setCreditFor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover créditos · {creditFor?.name}</DialogTitle>
            <DialogDescription>
              Saldo actual: <span className="font-mono">{creditFor?.credits ?? 0}</span>.
              {role !== "admin" && <> Tu saldo: <span className="font-mono">{myCredits}</span>.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Delta (positivo agrega, negativo quita)</Label>
              <Input type="number" value={creditDelta} onChange={(e) => setCreditDelta(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">
                {role === "admin"
                  ? "Admin: no descuenta de tu bolsa."
                  : "Transfiere desde tu saldo o recupera del hijo."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo (opcional)</Label>
              <Input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} placeholder="Recarga mensual" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditFor(null)} disabled={creditSaving}>Cancelar</Button>
            <Button onClick={submitCredits} disabled={creditSaving || !creditDelta}>{creditSaving ? "Guardando..." : "Aplicar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({
  draft, setDraft, mode, allowedRoles, isAdmin,
}: {
  draft: DraftUser;
  setDraft: (d: DraftUser) => void;
  mode: "create" | "edit";
  allowedRoles: Role[];
  isAdmin: boolean;
}) {
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
        <Select
          value={draft.role}
          onValueChange={(v) => setDraft({ ...draft, role: v as Role })}
          disabled={mode === "edit" && !isAdmin}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(mode === "edit" ? (isAdmin ? ["admin", "support", "superreseller", "reseller", "subreseller"] as Role[] : [draft.role]) : allowedRoles).map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Estado</Label>
        <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as PanelStatus })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="suspended">Suspendido</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {mode === "create" && (
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Créditos iniciales</Label>
          <Input
            type="number" min={0}
            value={draft.initialCredits}
            onChange={(e) => setDraft({ ...draft, initialCredits: Number(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            {isAdmin ? "Admin: se acreditan sin descuento." : "Se transfieren desde tu saldo."}
          </p>
        </div>
      )}
    </div>
  );
}
