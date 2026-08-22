export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Incident { id: string; tourist: string; type: string; location: string; risk: RiskLevel; score: number; status: "new" | "assigned" | "resolved"; reportedAt: string; }
export interface RiskZone { id: string; name: string; risk: RiskLevel; score: number; activeVisitors: number; reason: string; }
export interface SafetyMetric { label: string; value: string; delta: string; tone: "blue" | "green" | "amber" | "red"; }
