import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { categories } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({ meta: [{ title: "Categorías — StreamWeaver Pro" }] }),
  component: CategoriesPage,
});

const typeLabel = { live: "Live TV", vod: "Películas", series: "Series" } as const;

function CategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Organiza canales, películas y series por categorías."
        actions={<Button size="sm"><Plus className="h-4 w-4" /> Nueva categoría</Button>}
      />
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell><span className="rounded-md bg-accent px-2 py-0.5 text-xs">{typeLabel[c.type]}</span></TableCell>
                <TableCell>{c.order}</TableCell>
                <TableCell>{c.items}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
