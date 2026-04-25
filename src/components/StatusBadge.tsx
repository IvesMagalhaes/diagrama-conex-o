import { STATUS_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

const COLOR_CLASS: Record<number, string> = {
  1: "bg-status-analise text-status-analise-foreground",
  2: "bg-status-acordo text-status-acordo-foreground",
  3: "bg-status-pendencia text-status-pendencia-foreground",
  4: "bg-status-excluido text-status-excluido-foreground",
  5: "bg-status-solicitado text-status-solicitado-foreground",
  8: "bg-status-distribuido text-status-distribuido-foreground",
  9: "bg-status-arquivado text-status-arquivado-foreground",
};

export function StatusBadge({ id, className }: { id: number; className?: string }) {
  const meta = STATUS_MAP[id];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        COLOR_CLASS[id] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {meta?.label || `#${id}`}
    </span>
  );
}
