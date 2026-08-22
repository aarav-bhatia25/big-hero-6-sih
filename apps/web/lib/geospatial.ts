import * as turf from '@turf/turf';

export interface GeofenceZone {
  id: string;
  name: string;
  type: 'HIGH_RISK' | 'RESTRICTED' | 'SAFE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  coordinates: Array<[number, number]>; // [lat, lng] array
}

export interface GeofenceCheckResult {
  isBreached: boolean;
  breachedZone: GeofenceZone | null;
  riskPenalty: number;
  alertMessage: string | null;
}

export function checkPointInGeofence(
  lat: number,
  lng: number,
  geofences: GeofenceZone[]
): GeofenceCheckResult {
  // Turf uses [lng, lat] format
  const point = turf.point([lng, lat]);

  for (const gf of geofences) {
    try {
      // Convert [lat, lng] array to [lng, lat] for Turf
      const turfCoords = gf.coordinates.map(([pLat, pLng]) => [pLng, pLat]);

      // Close polygon loop if first and last point don't match
      if (
        turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
        turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]
      ) {
        turfCoords.push(turfCoords[0]);
      }

      const polygon = turf.polygon([turfCoords]);
      const isInside = turf.booleanPointInPolygon(point, polygon);

      if (isInside && gf.type === 'HIGH_RISK') {
        const riskPenalty = gf.severity === 'CRITICAL' ? 40 : gf.severity === 'HIGH' ? 30 : 15;
        return {
          isBreached: true,
          breachedZone: gf,
          riskPenalty,
          alertMessage: `🚨 WARNING: You have entered high-risk zone '${gf.name}'. Exercise extreme caution or return to safe route.`,
        };
      }
    } catch (err) {
      console.error('Error evaluating Turf geofence polygon:', err);
    }
  }

  return {
    isBreached: false,
    breachedZone: null,
    riskPenalty: 0,
    alertMessage: null,
  };
}
