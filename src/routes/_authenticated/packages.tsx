import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/packages")({
  head: () => ({ meta: [{ title: "Paquetes — StreamPanel" }] }),
  component: PackagesPage,
});

const pkgs = [
  { id: "p1", name: "Básico",   live: 80,  vod: 50,  series: 20, days: 30, price: 5,  conn: 1 },
  { id: "p2", name: "Premium",  live: 200, vod: 300, series: 80, days: 30, price: 10, conn: 2 },
  { id: "p3", name: "Full HD",  live: 350, vod: 600, series: 150, days: 30, price: 15, conn: 2 },
  { id: "p4", name: "Sports",   live: 60,  vod: 0,   series: 0,  days: 30, price: 8,  conn: 1 },
  { id: "p5", name: "Family",   live: 250, vod: 400, series: 120, days: 90, price: 35, conn: 4 },
];

function PackagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Paquetes"
        description="Define qué contenido incluye cada paquete."
        actions={<Button size="sm"><Plus className="h-4 w-4" /> Nuevo paquete</Button>}
      />
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Live</TableHead>
              <TableHead>VOD</TableHead>
              <TableHead>Series</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Conex.</TableHead>
              <TableHead>Precio interno</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pkgs.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.live}</TableCell>
                <TableCell>{p.vod}</TableCell>
                <TableCell>{p.series}</TableCell>
                <TableCell>{p.days}</TableCell>
                <TableCell>{p.conn}</TableCell>
                <TableCell className="text-primary">${p.price}</TableCell>
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
