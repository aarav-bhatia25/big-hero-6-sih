import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";
const styles: Record<RiskLevel, string> = { low: "bg-emerald-50 text-emerald-700", medium: "bg-amber-50 text-amber-700", high: "bg-orange-50 text-orange-700", critical: "bg-red-50 text-red-700" };
export function RiskBadge({ level }: { level: RiskLevel }) { return <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold capitalize", styles[level])}>{level}</span>; }
