import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

type PlaceCategory = 'tourist' | 'hospital' | 'police' | 'fire_station';
type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
};

type CachedArea = { expiresAt: number; places: Place[] };
const areaCache = new Map<string, CachedArea>();
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function categoryFor(tags: Record<string, string>): PlaceCategory | null {
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.amenity === 'police') return 'police';
  if (tags.amenity === 'fire_station') return 'fire_station';
  if (tags.tourism === 'attraction' || tags.tourism === 'museum' || tags.tourism === 'viewpoint' || tags.tourism === 'information') return 'tourist';
  return null;
}

function normaliseElements(elements: any[]): Place[] {
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const element of elements) {
    const tags = element?.tags && typeof element.tags === 'object' ? element.tags as Record<string, string> : {};
    const category = categoryFor(tags);
    const lat = Number(element?.lat ?? element?.center?.lat);
    const lng = Number(element?.lon ?? element?.center?.lon);
    const id = `${element?.type || 'place'}-${element?.id || ''}`;
    if (!category || !Number.isFinite(lat) || !Number.isFinite(lng) || !element?.id || seen.has(id)) continue;
    seen.add(id);
    const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ');
    places.push({
      id,
      name: String(tags.name || tags['name:en'] || `${category.replace('_', ' ')} location`).slice(0, 160),
      category,
      lat,
      lng,
      ...(address ? { address: address.slice(0, 250) } : {}),
      ...(tags.phone || tags['contact:phone'] ? { phone: String(tags.phone || tags['contact:phone']).slice(0, 80) } : {}),
    });
  }
  return places.slice(0, 100);
}

function cacheKey(lat: number, lng: number, radiusKm: number) {
  // Cache a small geographic cell for 15 minutes. This avoids repeatedly
  // hitting the public geodata service while never storing a tourist's route.
  return `${lat.toFixed(2)}:${lng.toFixed(2)}:${radiusKm}`;
}

async function getNearbyPlaces(lat: number, lng: number, radiusKm: number) {
  const key = cacheKey(lat, lng, radiusKm);
  const cached = areaCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { places: cached.places, sourceStatus: 'cached' as const };

  const radiusMetres = Math.round(radiusKm * 1_000);
  const query = `[out:json][timeout:25];
(
  nwr(around:${radiusMetres},${lat},${lng})["amenity"~"^(hospital|police|fire_station)$"];
  nwr(around:${radiusMetres},${lat},${lng})["tourism"~"^(attraction|museum|viewpoint|information)$"];
);
out center tags;`;
  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Prahari/1.0 offline safety map (+https://prahari.app)',
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`geodata service returned ${response.status}`);
    const body = await response.json();
    const places = normaliseElements(Array.isArray(body?.elements) ? body.elements : []);
    areaCache.set(key, { places, expiresAt: Date.now() + 15 * 60 * 1_000 });
    if (areaCache.size > 30) {
      const firstKey = areaCache.keys().next().value;
      if (firstKey) areaCache.delete(firstKey);
    }
    return { places, sourceStatus: 'live' as const };
  } catch {
    return { places: [] as Place[], sourceStatus: 'unavailable' as const };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist']);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const radiusKm = Number(searchParams.get('radiusKm'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ success: false, error: 'Choose a valid map location.' }, { status: 400 });
  }
  if (!Number.isFinite(radiusKm) || radiusKm < 2 || radiusKm > 25) {
    return NextResponse.json({ success: false, error: 'Choose a radius between 2 and 25 km.' }, { status: 400 });
  }

  const result = await getNearbyPlaces(lat, lng, radiusKm);
  return NextResponse.json({
    success: true,
    places: result.places,
    sourceStatus: result.sourceStatus,
    safetyInformation: [
      { title: 'Before you enter a hazard area', body: 'Check the official NDMA advisory, charge your phone, tell a trusted person your plan, and carry water, identification, and essential medicines.' },
      { title: 'If conditions worsen', body: 'Do not cross floodwater, unstable slopes, or fire lines. Move to a safe public place, call 112 for emergencies, and follow local authority instructions.' },
      { title: 'When offline', body: 'Use this saved area pack to find nearby help. GPS may still work without data, but calling and live alerts require network coverage.' },
    ],
    emergencyNumbers: [
      { label: 'National emergency', number: '112' },
      { label: 'Tourist helpline', number: '1363' },
      { label: 'Ambulance', number: '108' },
      { label: 'Fire service', number: '101' },
    ],
    attribution: ['Map data © OpenStreetMap contributors via Overpass API', 'Emergency guidance: Prahari — always follow local authorities'],
  });
}
