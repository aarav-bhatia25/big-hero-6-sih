export interface RiskFactorParams {
  inGeofence: boolean;
  geofenceSeverity?: string; // CRITICAL, HIGH, MEDIUM
  isNightTime?: boolean;
  crimeDensityIndex?: number; // 0 - 30
  routeAnomalyScore?: number; // 0 - 20
  hasDisasterAlert?: boolean;
}

export interface RiskEvaluationResult {
  totalScore: number; // 0 - 100
  tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  color: string;
  badgeText: string;
  breakdown: {
    geofenceRisk: number;
    timeRisk: number;
    crimeDensityRisk: number;
    routeAnomalyRisk: number;
    disasterRisk: number;
  };
}

export function calculateDeterministicRisk(params: RiskFactorParams): RiskEvaluationResult {
  let geofenceRisk = 0;
  if (params.inGeofence) {
    geofenceRisk = params.geofenceSeverity === 'CRITICAL' ? 40 : params.geofenceSeverity === 'HIGH' ? 30 : 15;
  }

  // Check if current time is night (between 10 PM and 5 AM)
  const currentHour = new Date().getHours();
  const isNight = params.isNightTime !== undefined ? params.isNightTime : (currentHour >= 22 || currentHour < 5);
  const timeRisk = isNight ? 10 : 0;

  const crimeDensityRisk = Math.min(30, Math.max(0, params.crimeDensityIndex || 10));
  const routeAnomalyRisk = Math.min(20, Math.max(0, params.routeAnomalyScore || 0));
  const disasterRisk = params.hasDisasterAlert ? 20 : 0;

  const rawScore = geofenceRisk + timeRisk + crimeDensityRisk + routeAnomalyRisk + disasterRisk;
  const totalScore = Math.min(100, Math.max(0, rawScore));

  let tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  let color = '#10b981'; // green
  let badgeText = '🟢 LOW';

  if (totalScore >= 81) {
    tier = 'CRITICAL';
    color = '#ef4444';
    badgeText = '🔴 CRITICAL';
  } else if (totalScore >= 61) {
    tier = 'HIGH';
    color = '#f97316';
    badgeText = '🟠 HIGH';
  } else if (totalScore >= 31) {
    tier = 'MODERATE';
    color = '#eab308';
    badgeText = '🟡 MODERATE';
  }

  return {
    totalScore,
    tier,
    color,
    badgeText,
    breakdown: {
      geofenceRisk,
      timeRisk,
      crimeDensityRisk,
      routeAnomalyRisk,
      disasterRisk,
    },
  };
}
