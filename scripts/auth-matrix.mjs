#!/usr/bin/env node
/**
 * Access-control matrix: probes every endpoint and page with a given identity
 * and prints what it returns. Run before and after auth lands to prove that
 * each surface is actually protected.
 *
 *   node scripts/auth-matrix.mjs                 # anonymous (no cookie)
 *   node scripts/auth-matrix.mjs "<cookie>"      # with a session cookie
 */
const BASE = process.env.BASE ?? 'http://localhost:3000';
const COOKIE = process.argv[2] ?? '';

// Non-destructive probes only. /api/seed is probed with GET, which this app
// treats as POST — so it is listed but SKIPPED unless PROBE_SEED=1.
const ENDPOINTS = [
  ['GET',   '/api/health'],
  ['GET',   '/api/stats'],
  ['GET',   '/api/tourists'],
  ['PATCH', '/api/tourists', { touristId: 'TOUR-7890', trackingConsent: true }],
  ['GET',   '/api/tourists/TOUR-7890'],
  ['GET',   '/api/incidents'],
  ['POST',  '/api/incidents', { touristId: 'PROBE', lat: 26.9, lng: 75.8, address: 'probe' }],
  ['PATCH', '/api/incidents', { incidentId: 'INC-SEED-01', status: 'new' }],
  ['GET',   '/api/geofences'],
  ['POST',  '/api/geofences', { name: '__probe__', coordinates: [[26.9,75.8],[26.91,75.8],[26.91,75.81]] }],
  ['GET',   '/api/locations?touristId=TOUR-7890'],
  ['POST',  '/api/locations', { touristId: 'TOUR-7890', lat: 26.9, lng: 75.8 }],
  ['GET',   '/api/responders'],
  ['GET',   '/api/efir'],
  ['POST',  '/api/efir', { incidentId: 'INC-SEED-01', touristId: 'TOUR-7890' }],
  ['POST',  '/api/attire', { touristId: 'TOUR-7890', top: '__probe__' }],
  ['POST',  '/api/kyc/initiate', { method: 'aadhaar', fullName: 'Probe', aadhaarNumber: '234567890124' }],
  ['POST',  '/api/kyc/verify', { sessionId: 'nope' }],
  ['POST',  '/api/identity/issue', { sessionId: 'nope' }],
  ['GET',   '/api/identity/verify/did:prahari:probe'],
  ['GET',   '/api/seed', null, 'DESTRUCTIVE'],
];

const PAGES = ['/', '/onboarding', '/citizen', '/tourist', '/admin', '/authority', '/sos', '/dashboard', '/dir'];

const headers = { 'Content-Type': 'application/json', ...(COOKIE ? { Cookie: COOKIE } : {}) };

function verdict(code, destructive) {
  if (destructive) return 'SKIPPED';
  if (code === 401) return 'AUTH REQUIRED';
  if (code === 403) return 'FORBIDDEN';
  if (code >= 200 && code < 300) return 'ALLOWED';
  if (code === 404) return 'not found';
  if (code >= 300 && code < 400) return `redirect ${code}`;
  return `other ${code}`;
}

console.log(`\nIdentity: ${COOKIE ? 'authenticated' : 'ANONYMOUS (no cookie)'}\n`);
console.log('── API ──────────────────────────────────────────────────────────────');

for (const [method, path, body, flag] of ENDPOINTS) {
  const destructive = flag === 'DESTRUCTIVE' && process.env.PROBE_SEED !== '1';
  let code = 0, note = '';
  if (!destructive) {
    try {
      const res = await fetch(BASE + path, {
        method, headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
        redirect: 'manual',
      });
      code = res.status;
      if (res.status >= 200 && res.status < 300) {
        const txt = (await res.text()).slice(0, 90).replace(/\s+/g, ' ');
        note = txt;
      }
    } catch (e) { note = e.message.slice(0, 40); }
  }
  console.log(`${method.padEnd(6)} ${path.padEnd(42)} ${String(code || '-').padEnd(4)} ${verdict(code, destructive).padEnd(14)} ${note.slice(0, 60)}`);
}

console.log('\n── PAGES ────────────────────────────────────────────────────────────');
for (const path of PAGES) {
  let code = 0, loc = '';
  try {
    const res = await fetch(BASE + path, { headers, redirect: 'manual' });
    code = res.status;
    loc = res.headers.get('location') ?? '';
  } catch (e) { loc = e.message.slice(0, 40); }
  console.log(`GET    ${path.padEnd(42)} ${String(code).padEnd(4)} ${verdict(code, false).padEnd(14)} ${loc}`);
}
console.log('');
