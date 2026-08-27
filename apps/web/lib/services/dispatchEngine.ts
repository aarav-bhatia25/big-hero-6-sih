import * as turf from '@turf/turf';

export interface ResponderUnit {
  id: string;
  unitId: string;
  name: string;
  type: string;
  phone: string;
  lat: number;
  lng: number;
}

export const MAX_AUTOMATIC_DISPATCH_DISTANCE_KM = 15;

export function findNearestResponder(
  incidentLat: number,
  incidentLng: number,
  responders: ResponderUnit[]
) {
  if (responders.length === 0) return null;

  const targetPoint = turf.point([incidentLng, incidentLat]);
  let nearest: ResponderUnit | null = null;
  let minDistanceKm = Infinity;

  for (const resp of responders) {
    const respPoint = turf.point([resp.lng, resp.lat]);
    const distanceKm = turf.distance(targetPoint, respPoint, { units: 'kilometers' });

    if (distanceKm < minDistanceKm) {
      minDistanceKm = distanceKm;
      nearest = resp;
    }
  }

  if (!nearest || minDistanceKm > MAX_AUTOMATIC_DISPATCH_DISTANCE_KM) return null;
  const estimatedMinutes = Math.max(1, Math.round((minDistanceKm / 40) * 60)); // Planning estimate only; dispatch must confirm.

  return {
    responder: nearest,
    distanceKm: Math.round(minDistanceKm * 100) / 100,
    etaMinutes: estimatedMinutes,
  };
}
