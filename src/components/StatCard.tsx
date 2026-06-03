import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive" | "primary";
}

const tones: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-foreground bg-accent/40",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
  primary: "text-primary bg-primary/10",
};

export function StatCard({ label, value, delta, icon: Icon, tone = "default" }: Props) {
  return (
    <div className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {delta && <p className="mt-1 text-xs text-muted-foreground">{delta}</p>}
        </div>
        <div className={cn("rounded-lg p-2.5", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
