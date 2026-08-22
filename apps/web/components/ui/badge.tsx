import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";
// Neobrutalist status chips: bold fill + thick border, readable in both themes.
const styles: Record<RiskLevel, string> = {
  low: "bg-success text-white",
  medium: "bg-warning text-ink",
  high: "bg-[#f97316] text-ink",
  critical: "bg-danger text-white",
};
export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn("inline-block rounded-nb border-2 border-line px-2.5 py-0.5 text-xs font-black uppercase tracking-wide", styles[level])}>
      {level}
    </span>
  );
}
