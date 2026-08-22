import type { Incident, RiskZone, SafetyMetric } from "./types";

export const metrics: SafetyMetric[] = [
  { label: "Active tourists", value: "1,284", delta: "+8.2% today", tone: "blue" },
  { label: "Open incidents", value: "14", delta: "3 need review", tone: "amber" },
  { label: "Average risk score", value: "26", delta: "-4 vs. yesterday", tone: "green" },
  { label: "Responder ETA", value: "8 min", delta: "Across 12 active units", tone: "red" },
];

export const incidents: Incident[] = [
  { id: "INC-2408", tourist: "Maya Thompson", type: "Route deviation", location: "Amer Fort approach", risk: "high", score: 78, status: "new", reportedAt: "2 min ago" },
  { id: "INC-2407", tourist: "Arjun Mehta", type: "Manual SOS", location: "Hawa Mahal market", risk: "critical", score: 94, status: "assigned", reportedAt: "6 min ago" },
  { id: "INC-2406", tourist: "Sofia Rossi", type: "Extended inactivity", location: "Nahargarh trail", risk: "medium", score: 58, status: "new", reportedAt: "12 min ago" },
];

export const riskZones: RiskZone[] = [
  { id: "zone-1", name: "Amer Fort approach", risk: "high", score: 78, activeVisitors: 42, reason: "Late-hour route deviations" },
  { id: "zone-2", name: "Nahargarh trail", risk: "medium", score: 58, activeVisitors: 19, reason: "Weather and low footfall" },
  { id: "zone-3", name: "Hawa Mahal market", risk: "high", score: 72, activeVisitors: 89, reason: "Crowd density anomaly" },
];
