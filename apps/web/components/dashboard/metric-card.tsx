import { Activity, AlertTriangle, Clock3, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { SafetyMetric } from "@/lib/types";
const iconMap = { blue: Users, green: Activity, amber: AlertTriangle, red: Clock3 };
const bgMap = { blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600" };
export function MetricCard({ metric }: { metric: SafetyMetric }) { const Icon = iconMap[metric.tone]; return <Card className="p-4"><div className="mb-5 flex items-start justify-between"><p className="text-sm text-slate-500">{metric.label}</p><span className={`rounded-lg p-2 ${bgMap[metric.tone]}`}><Icon size={17}/></span></div><p className="text-2xl font-bold">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.delta}</p></Card>; }
