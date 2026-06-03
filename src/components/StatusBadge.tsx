import { cn } from "@/lib/utils";

type Status = "active" | "expired" | "suspended" | "online" | "offline" | "ready" | "processing" | "error";

const map: Record<Status, { label: string; cls: string }> = {
  active:     { label: "Activo",     cls: "bg-success/15 text-success border-success/30" },
  online:     { label: "Online",     cls: "bg-success/15 text-success border-success/30" },
  ready:      { label: "Listo",      cls: "bg-success/15 text-success border-success/30" },
  expired:    { label: "Vencido",    cls: "bg-warning/15 text-warning border-warning/30" },
  suspended:  { label: "Suspendido", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  offline:    { label: "Offline",    cls: "bg-muted text-muted-foreground border-border" },
  processing: { label: "Procesando", cls: "bg-primary/15 text-primary border-primary/30" },
  error:      { label: "Error",      cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cls.split(" ")[1].replace("text-", "bg-"))} />
      {label}
    </span>
  );
}
