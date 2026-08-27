/**
 * Offline SOS Mesh — end-to-end demonstration.
 *
 * Walks one emergency alert from a traveller with no signal, across two
 * relaying strangers' phones, to the authority gateway — and shows what happens
 * when a relay tries to tamper with it on the way.
 *
 * Run:  pnpm --filter @prahari/web exec tsx ../../scripts/mesh-demo.ts
 */

import {
  createSOSPacket,
  fromNostrSOSEvent,
  incrementPacketHop,
  meshEventId,
  serializeSOSPacket,
  verifyNostrSOSEvent,
  calculateNostrEventId,
  type SOSPacket,
} from '../apps/web/lib/sos-mesh/sosPacket';
import { __setDeviceKeyPairForTesting } from '../apps/web/lib/sos-mesh/nostrKeys';
import { packMeshFrame, unpackMeshFrame } from '../apps/web/lib/sos-mesh/nostrEncoder';
import { verifyRelayedPacket } from '../apps/web/lib/sos-mesh/meshTrust';

const TRAVELLER_SECRET = `${'0'.repeat(63)}1`;
const IMPOSTOR_SECRET = `${'0'.repeat(62)}42`;

const step = (n: string, title: string) => console.log(`\n\x1b[1m${n}  ${title}\x1b[0m`);
const ok = (msg: string) => console.log(`   \x1b[32m✓\x1b[0m ${msg}`);
const no = (msg: string) => console.log(`   \x1b[31m✗\x1b[0m ${msg}`);
const info = (k: string, v: string) => console.log(`     ${k.padEnd(18)} ${v}`);

console.log('\n\x1b[1m═══ Prahari offline SOS mesh — end-to-end demonstration ═══\x1b[0m');

// ---------------------------------------------------------------- 1. identity
step('1.', 'Traveller’s phone creates its mesh identity');
const traveller = __setDeviceKeyPairForTesting(TRAVELLER_SECRET)!;
info('device pubkey', traveller.pubkeyHex);
info('secret', 'never leaves the device — not sent, not logged');

const touristRecord = { touristId: 'TOUR-7890', name: 'Demo traveller', meshPubkeys: [traveller.pubkeyHex] };
ok(`Public half registered against ${touristRecord.touristId} (POST /api/identity/mesh-key)`);

// ------------------------------------------------------------------ 2. the SOS
step('2.', 'Phone loses all signal, traveller presses SOS');
const origin = createSOSPacket({
  touristId: 'TOUR-7890',
  incidentId: 'INC-4242',
  latitude: 26.1445,
  longitude: 91.7362,
  originDeviceId: 'NODE-TRAVELLER',
  ttl: 4,
});
info('incident', origin.incidentId);
info('signed event id', origin.nostrEvent!.id);
info('signature', `${origin.nostrEvent!.sig.slice(0, 32)}…`);
ok(`Signed offline with the device key. Verifies: ${verifyNostrSOSEvent(origin.nostrEvent!)}`);

// -------------------------------------------------------------- 3. on the wire
step('3.', 'Packet is framed for the radio');
const frame = packMeshFrame(origin);
const jsonBytes = new TextEncoder().encode(serializeSOSPacket(origin)).length;
info('binary frame', `${frame.length} bytes`);
info('equivalent JSON', `${jsonBytes} bytes`);
ok(`${Math.round((1 - frame.length / jsonBytes) * 100)}% smaller on the air`);

// ------------------------------------------------------------- 4. first relay
step('4.', 'A stranger’s phone nearby picks it up (hop 1)');
const decodedAtB = unpackMeshFrame(frame)!;
const atB = fromNostrSOSEvent(decodedAtB.event, { ttl: decodedAtB.ttl, hopCount: decodedAtB.hopCount, relayPath: decodedAtB.relayPath });
ok(`Signature verifies on a device that has never met the traveller: ${verifyNostrSOSEvent(atB.nostrEvent!)}`);
info('incident survived', atB.incidentId);
info('tourist survived', atB.touristId);
info('location survived', `${atB.latitude}, ${atB.longitude}`);
const hop1 = incrementPacketHop(atB, 'NODE-STRANGER-B', 'BLE_RELAY');
info('ttl / hop', `${hop1.ttl} / ${hop1.hopCount}`);

// ------------------------------------------------------------ 5. second relay
step('5.', 'Handed on again (hop 2) — the signed event never changes');
const decodedAtC = unpackMeshFrame(packMeshFrame(hop1))!;
const atC = fromNostrSOSEvent(decodedAtC.event, { ttl: decodedAtC.ttl, hopCount: decodedAtC.hopCount, relayPath: decodedAtC.relayPath });
const hop2 = incrementPacketHop(atC, 'NODE-STRANGER-C', 'BLE_RELAY');
info('ttl / hop', `${hop2.ttl} / ${hop2.hopCount}`);
info('event id at hop 0', meshEventId(origin));
info('event id at hop 2', meshEventId(hop2));
ok(meshEventId(hop2) === meshEventId(origin)
  ? 'Identical — so the same alert arriving by two routes deduplicates correctly'
  : 'MISMATCH — dedup would be broken');

// ---------------------------------------------------------- 6. tamper attempt
step('6.', 'A malicious relay tries to redirect the alert');
const tampered: SOSPacket = { ...hop2, touristId: 'TOUR-ATTACKER', incidentId: 'INC-9999', latitude: 0, longitude: 0 };
console.log('     Relay rewrites the plain JSON envelope around the signed event…');
const verdict = verifyRelayedPacket(tampered, touristRecord);
if (verdict.trusted) {
  ok('Gateway accepted the packet — but rebuilt every field from the signature:');
  info('touristId', `${tampered.touristId} → \x1b[32m${verdict.packet.touristId}\x1b[0m`);
  info('incidentId', `${tampered.incidentId} → \x1b[32m${verdict.packet.incidentId}\x1b[0m`);
  info('latitude', `${tampered.latitude} → \x1b[32m${verdict.packet.latitude}\x1b[0m`);
  console.log('     The rewrite had no effect. A relay can delay or drop, never redirect.');
} else {
  no(`Rejected: ${verdict.reason}`);
}

// ------------------------------------------------- 7. forging the signed event
step('7.', 'The attacker instead edits inside the signed event');
const ev = origin.nostrEvent!;
const movedTags = ev.tags.map((t) => (t[0] === 'lat' ? ['lat', '0'] : t));
const forged = { ...ev, tags: movedTags, id: calculateNostrEventId(ev.pubkey, ev.created_at, ev.kind, movedTags, ev.content) };
console.log('     They move the coordinates and recompute a consistent event id…');
verifyNostrSOSEvent(forged)
  ? no('Forgery accepted — signature check is broken')
  : ok('Rejected. The id hashes correctly, but they cannot produce the signature.');

// --------------------------------------------------- 8. unregistered signer
step('8.', 'An impostor signs a fake SOS for the same traveller');
__setDeviceKeyPairForTesting(IMPOSTOR_SECRET);
const fake = createSOSPacket({ touristId: 'TOUR-7890', latitude: 0, longitude: 0, originDeviceId: 'NODE-IMPOSTOR' });
const fakeVerdict = verifyRelayedPacket(fake, touristRecord);
ok(`Event is internally valid (${verifyNostrSOSEvent(fake.nostrEvent!)}) — but signed by an unregistered key.`);
fakeVerdict.trusted
  ? no('Gateway accepted an impostor')
  : ok(`Gateway refused: ${fakeVerdict.reason}`);

// ------------------------------------------------------------- 9. genuine exit
step('9.', 'The genuine relay reaches a network and hands it in');
__setDeviceKeyPairForTesting(TRAVELLER_SECRET);
const exitVerdict = verifyRelayedPacket(hop2, touristRecord);
if (exitVerdict.trusted) {
  ok('Accepted into the authority queue.');
  info('incident', exitVerdict.packet.incidentId);
  info('tourist', exitVerdict.packet.touristId);
  info('location', `${exitVerdict.packet.latitude}, ${exitVerdict.packet.longitude}`);
  info('hops taken', String(exitVerdict.packet.hopCount));
  info('relay path', (hop2.relayPath ?? []).join(' → '));
  info('vouched by', exitVerdict.packet.nostrEvent!.pubkey.slice(0, 24) + '…');
} else {
  no(`Refused: ${exitVerdict.reason}`);
}

console.log('\n\x1b[1m═══ The alert crossed two untrusted phones and arrived unaltered. ═══\x1b[0m\n');
