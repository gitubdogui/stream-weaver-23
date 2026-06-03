import { createFileRoute } from "@tanstack/react-router";
import {
  Users, UserCheck, UserX, AlertTriangle, Radio, Film, Tv, Activity,
  Cpu, HardDrive, MemoryStick, TrendingUp,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { dashboardStats, hourlyConnections, lines, connectionLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — StreamPanel" }] }),
  component: DashboardPage,
});

function MetricBar({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Cpu }) {
  const tone = value > 80 ? "bg-destructive" : value > 60 ? "bg-warning" : "bg-success";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <span className="text-sm font-semibold">{value}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Resumen general del servicio de streaming en tiempo real." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total usuarios" value={dashboardStats.totalUsers} delta="+3 esta semana" icon={Users} tone="primary" />
        <StatCard label="Activos" value={dashboardStats.activeUsers} icon={UserCheck} tone="success" />
        <StatCard label="Vencidos" value={dashboardStats.expiredUsers} icon={AlertTriangle} tone="warning" />
        <StatCard label="Suspendidos" value={dashboardStats.suspendedUsers} icon={UserX} tone="destructive" />
        <StatCard label="Streams activos" value={dashboardStats.activeStreams} icon={Radio} tone="primary" />
        <StatCard label="VOD" value={dashboardStats.totalVod} icon={Film} />
        <StatCard label="Series" value={dashboardStats.totalSeries} icon={Tv} />
        <StatCard label="Conexiones ahora" value={dashboardStats.currentConnections.toLocaleString()} delta="↑ 12% vs ayer" icon={Activity} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricBar label="CPU" value={dashboardStats.cpu} icon={Cpu} />
        <MetricBar label="RAM" value={dashboardStats.ram} icon={MemoryStick} />
        <MetricBar label="Disco" value={dashboardStats.disk} icon={HardDrive} />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Conexiones por hora</h2>
            <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs text-success">
            <TrendingUp className="h-3 w-3" /> tendencia al alza
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyConnections}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.20 255)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.68 0.20 255)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 252)" />
              <XAxis dataKey="hour" stroke="oklch(0.68 0.02 252)" fontSize={11} />
              <YAxis stroke="oklch(0.68 0.02 252)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.21 0.018 252)", border: "1px solid oklch(0.28 0.02 252)",
                  borderRadius: 8, color: "oklch(0.97 0.01 250)",
                }}
              />
              <Area type="monotone" dataKey="conexiones" stroke="oklch(0.68 0.20 255)" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <div className="border-b p-4">
            <h2 className="text-base font-semibold">Últimos usuarios creados</h2>
          </div>
          <ul className="divide-y">
            {lines.slice(0, 6).map((l) => (
              <li key={l.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{l.client}</p>
                  <p className="text-xs text-muted-foreground">@{l.username} · {l.package}</p>
                </div>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="border-b p-4">
            <h2 className="text-base font-semibold">Últimas conexiones</h2>
          </div>
          <ul className="divide-y">
            {connectionLogs.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{c.user} <span className="text-muted-foreground">→ {c.channel}</span></p>
                  <p className="text-xs text-muted-foreground">{c.ip} · {c.country} · {c.userAgent}</p>
                </div>
                <span className="text-xs text-muted-foreground">{c.duration}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
