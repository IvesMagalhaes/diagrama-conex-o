import { fmtDateLines } from "@/lib/format";

export function DateTimeCell({ iso, className = "" }: { iso: string | null | undefined; className?: string }) {
  const { date, time } = fmtDateLines(iso);
  // inline-block makes the wrapper shrink to the width of the longest line (the date).
  // The second line uses text-center to center within that wrapper width — i.e. centered
  // relative to the first line, not relative to the surrounding cell.
  return (
    <div className={`leading-tight ${className}`}>
      <div className="inline-block">
        <div>{date}</div>
        {time && <div className="text-xs text-muted-foreground text-center">{time}</div>}
      </div>
    </div>
  );
}
