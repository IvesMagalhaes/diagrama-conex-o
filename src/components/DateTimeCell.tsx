import { fmtDateLines } from "@/lib/format";

export function DateTimeCell({ iso, className = "" }: { iso: string | null | undefined; className?: string }) {
  const { date, time } = fmtDateLines(iso);
  return (
    <div className={`leading-tight ${className}`}>
      <div>{date}</div>
      {time && <div className="text-xs text-muted-foreground">{time}</div>}
    </div>
  );
}
