import assert from 'node:assert';
import { describe, test } from 'node:test';
import { checkPointInGeofence } from '../geospatial';
import { assessSafetyRisk } from '../safetyRisk';
import { findNearestResponder, MAX_AUTOMATIC_DISPATCH_DISTANCE_KM } from '../services/dispatchEngine';
import { notifyEmergencyContacts } from '../services/emergencyNotifications';
import { hazardEnvironmentalRisk, hazardSeverityRank } from '../services/indiaHazards';
import { operationalResponders } from '../operationalData';

describe('Operational safety invariants', () => {
  test('keeps a normal consented location at a low explainable score', () => {
    const result = assessSafetyRisk({
      current: { lat: 19.076, lng: 72.8777 },
      previousLocations: [],
      accuracy: 8,
      localHour: 14,
    });
    assert.equal(result.model, 'explainable-safety-signals-v1');
    assert.equal(result.score, 0);
    assert.equal(result.requiresHumanReview, false);
    assert.deepEqual(result.signals, []);
  });

  test('raises review for transparent, multi-signal risk without claiming distress', () => {
    const now = new Date('2026-08-27T20:00:00.000Z');
    const result = assessSafetyRisk({
      current: { lat: 19.076, lng: 72.8777 },
      previousLocations: [{ lat: 19.075, lng: 72.876, timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1_000).toISOString() }],
      accuracy: 120,
      localHour: 23,
      zoneRisk: 40,
      localIncidentCount: 6,
      environmentalRisk: 30,
      now,
    });
    assert.equal(result.requiresHumanReview, true);
    assert.ok(result.score >= 70);
    assert.ok(result.signals.some((signal) => signal.code === 'telemetry_gap'));
    assert.ok(result.signals.some((signal) => signal.code === 'official_hazard'));
    assert.ok(result.signals.every((signal) => typeof signal.contribution === 'number'));
  });

  test('uses only active matching geofences and their declared type', () => {
    const result = checkPointInGeofence(19.01, 72.01, [{
      id: 'zone-a',
      name: 'Audit restricted zone',
      type: 'RESTRICTED',
      severity: 'CRITICAL',
      coordinates: [[19, 72], [19.02, 72], [19.02, 72.02], [19, 72.02], [19, 72]],
    }]);
    assert.equal(result.isBreached, true);
    assert.equal(result.breachedZone?.type, 'RESTRICTED');
    assert.ok(result.riskPenalty > 0);
  });

  test('never automatically assigns a responder beyond the 15 km policy radius', () => {
    const within = findNearestResponder(19.0, 72.0, [{ id: 'near', unitId: 'NEAR', name: 'Near unit', type: 'POLICE', phone: '', lat: 19.04, lng: 72.04 }]);
    const outside = findNearestResponder(19.0, 72.0, [{ id: 'far', unitId: 'FAR', name: 'Far unit', type: 'POLICE', phone: '', lat: 19.3, lng: 72.3 }]);
    assert.ok(within && within.distanceKm < MAX_AUTOMATIC_DISPATCH_DISTANCE_KM);
    assert.equal(outside, null);
  });

  test('excludes off-duty responders before automatic-dispatch matching', () => {
    const candidates = operationalResponders([
      { responderId: 'OFF-DUTY-NEAR', status: 'OFF_DUTY', location: { lat: 19.001, lng: 72.001 } },
      { responderId: 'AVAILABLE-FAR', status: 'AVAILABLE', location: { lat: 19.04, lng: 72.04 } },
    ])
      .filter((responder) => String(responder.status ?? '').trim().toLowerCase() === 'available')
      .map((responder) => ({
        id: responder.responderId,
        unitId: responder.responderId,
        name: responder.responderId,
        type: 'POLICE',
        phone: '',
        lat: responder.location.lat,
        lng: responder.location.lng,
      }));

    const match = findNearestResponder(19, 72, candidates);
    assert.equal(match?.responder.id, 'AVAILABLE-FAR');
  });

  test('scores NDMA colour-coded severities on the same scale as worded ones', () => {
    // SACHET mixes CAP wording with the IMD colour code across state agencies.
    // A colour-coded alert previously ranked 0 and contributed no risk at all.
    assert.equal(hazardSeverityRank('RED'), hazardSeverityRank('WARNING'));
    assert.equal(hazardSeverityRank('ORANGE'), hazardSeverityRank('ALERT'));
    assert.equal(hazardSeverityRank('YELLOW'), hazardSeverityRank('WATCH'));
    assert.ok(hazardEnvironmentalRisk([{ severity: 'WATCH' }]) > 0);
    assert.ok(hazardEnvironmentalRisk([{ severity: 'WARNING' }]) > hazardEnvironmentalRisk([{ severity: 'WATCH' }]));
    // The most severe nearby alert sets the contribution, whatever the order.
    assert.equal(
      hazardEnvironmentalRisk([{ severity: 'ADVISORY' }, { severity: 'WARNING' }]),
      hazardEnvironmentalRisk([{ severity: 'WARNING' }]),
    );
    assert.equal(hazardEnvironmentalRisk([]), 0);
  });

  test('does not pretend a contact was notified when no email route exists', async () => {
    const noContacts = await notifyEmergencyContacts([], 'INC-AUDIT');
    const phoneOnly = await notifyEmergencyContacts([{ name: 'Contact', phone: '+919876543210' }], 'INC-AUDIT', { kind: 'safety_review' });
    assert.equal(noContacts.status, 'NO_CONTACTS');
    assert.equal(phoneOnly.status, 'NO_EMAIL_CONTACTS');
  });
});
