const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL ?? "http://localhost:8000";

export interface MLRiskFeatures {
  route_deviation_m?: number;
  inactivity_minutes?: number;
  zone_risk?: number;
  hour_of_day?: number;
}

export interface MLRiskResult {
  score: number;
  level: "critical" | "high" | "medium" | "low";
  requires_human_review: boolean;
}

/**
 * Calls the Prahari ML risk-scoring service (FastAPI at :8000).
 * Returns null when the service is unreachable so callers can fall back
 * to the deterministic local scoring in lib/risk.ts.
 */
export async function fetchMLRiskScore(
  features: MLRiskFeatures
): Promise<MLRiskResult | null> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/risk-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route_deviation_m: features.route_deviation_m ?? 0,
        inactivity_minutes: features.inactivity_minutes ?? 0,
        zone_risk: features.zone_risk ?? 0,
        hour_of_day: features.hour_of_day ?? new Date().getHours(),
      }),
      signal: AbortSignal.timeout(2000), // don't block the UI if ML is slow
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      score: data.score ?? 0,
      level: data.level ?? "low",
      requires_human_review: data.requires_human_review ?? false,
    };
  } catch {
    // Service unreachable — expected when ML isn't running
    return null;
  }
}
