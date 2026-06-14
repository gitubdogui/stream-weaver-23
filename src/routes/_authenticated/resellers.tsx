import { createFileRoute } from "@tanstack/react-router";
import { Plus, Wallet, Users as UsersIcon, Pencil, Pause } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resellers } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/resellers")({
  head: () => ({ meta: [{ title: "Revendedores — StreamWeaver Pro" }] }),
  component: ResellersPage,
});

function ResellersPage() {
  const totalCredits = resellers.reduce((a, r) => a + r.credits, 0);
  const totalUsers = resellers.reduce((a, r) => a + r.users, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revendedores"
        description="Asigna créditos y supervisa la actividad de cada revendedor."
        actions={<Button size="sm"><Plus className="h-4 w-4" /> Nuevo revendedor</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Revendedores</p>
          <p className="mt-2 text-3xl font-semibold">{resellers.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Créditos totales</p>
          <p className="mt-2 text-3xl font-semibold text-primary">{totalCredits}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Líneas vendidas</p>
          <p className="mt-2 text-3xl font-semibold">{totalUsers}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Revendedor</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Créditos</TableHead>
              <TableHead>Usuarios</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resellers.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">@{r.username}</TableCell>
                <TableCell className="text-muted-foreground">{r.email}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <Wallet className="h-3.5 w-3.5" /> {r.credits}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    <UsersIcon className="h-3.5 w-3.5" /> {r.users}
                  </span>
                </TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-muted-foreground">{r.createdAt}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost"><Pause className="h-4 w-4 text-warning" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
