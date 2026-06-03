import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { connectionLogs, lines, streams } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/statistics")({
  head: () => ({ meta: [{ title: "Estadísticas — StreamPanel" }] }),
  component: StatsPage,
});

function StatsPage() {
  const topUsers = lines.slice(0, 5).map((l, i) => ({ user: l.username, hours: 120 - i * 14 }));
  const topChannels = streams.slice(0, 5).map((s, i) => ({ name: s.name, conn: 1200 - i * 180 }));

  return (
    <div className="space-y-6">
      <PageHeader title="Estadísticas" description="Conexiones, consumo y comportamiento de usuarios." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold">Usuarios con más consumo</h2>
          <ul className="mt-4 space-y-3">
            {topUsers.map((u) => (
              <li key={u.user} className="space-y-1">
                <div className="flex justify-between text-sm"><span>@{u.user}</span><span className="text-muted-foreground">{u.hours}h</span></div>
                <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(u.hours / 120) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold">Canales más vistos</h2>
          <ul className="mt-4 space-y-3">
            {topChannels.map((c) => (
              <li key={c.name} className="space-y-1">
                <div className="flex justify-between text-sm"><span>{c.name}</span><span className="text-muted-foreground">{c.conn} conex.</span></div>
                <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-success" style={{ width: `${(c.conn / 1200) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-4"><h2 className="text-base font-semibold">Historial de conexiones</h2></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>País</TableHead>
              <TableHead>User-Agent</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Inicio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connectionLogs.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">@{c.user}</TableCell>
                <TableCell>{c.channel}</TableCell>
                <TableCell><code className="text-xs">{c.ip}</code></TableCell>
                <TableCell>{c.country}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.userAgent}</TableCell>
                <TableCell>{c.duration}</TableCell>
                <TableCell className="text-muted-foreground">{c.startedAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
