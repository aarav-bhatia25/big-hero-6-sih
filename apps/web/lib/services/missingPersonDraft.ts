type Coordinates = { lat: number; lng: number; accuracy?: number | null; timestamp?: string | null };

function text(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function coordinatesFrom(value: any): Coordinates | null {
  const lat = value?.coordinates?.lat ?? value?.lat;
  const lng = value?.coordinates?.lng ?? value?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat: Number(lat),
    lng: Number(lng),
    ...(Number.isFinite(value?.accuracy) ? { accuracy: Number(value.accuracy) } : {}),
    ...(text(value?.timestamp ?? value?.createdAt, 80) ? { timestamp: text(value?.timestamp ?? value?.createdAt, 80) } : {}),
  };
}

function locationSentence(location: Coordinates | null) {
  if (!location) return 'No consented location record is available.';
  const at = location.timestamp ? ` recorded at ${new Date(location.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST` : '';
  const accuracy = typeof location.accuracy === 'number' ? ` (reported accuracy approximately ${Math.round(location.accuracy)} m)` : '';
  return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}${at}${accuracy}.`;
}

/**
 * Builds a factual missing-person information draft from records already
 * available to an authorised case worker. It intentionally does not diagnose,
 * infer a crime, select penal sections, or claim to have lodged a police FIR.
 */
export function buildMissingPersonDraft(input: {
  tourist: Record<string, any>;
  incident: Record<string, any>;
  lastLocation?: Record<string, any> | null;
  generatedBy: string;
}) {
  const generatedAt = new Date().toISOString();
  const profile = input.tourist.clothingProfile ?? input.incident.emergencyIdentificationProfile ?? null;
  const lastKnownLocation = coordinatesFrom(input.lastLocation) ?? coordinatesFrom(input.tourist.currentLocation) ?? coordinatesFrom(input.incident.location);
  const document = input.tourist.credential?.credentialSubject?.identityDocument?.masked ?? null;
  const contacts = Array.isArray(input.tourist.emergencyContacts)
    ? input.tourist.emergencyContacts.slice(0, 5).map((contact: any) => ({
      name: text(contact?.name, 120) || 'Not recorded',
      relationship: text(contact?.relationship, 80) || 'Not recorded',
      phone: text(contact?.phone, 40) || null,
      email: text(contact?.email, 254) || null,
    }))
    : [];

  const facts = [
    `This is a Prahari-generated missing-person information draft created at ${new Date(generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST for authorised review. It is not an FIR, police complaint acknowledgement, or proof that a police station has accepted the information.`,
    `Person named in the verified tourist record: ${text(input.tourist.name, 160) || 'Not recorded'} (Tourist ID: ${text(input.tourist.touristId, 80) || 'Not recorded'}; nationality: ${text(input.tourist.nationality, 100) || 'Not recorded'}).`,
    `Verifiable Tourist ID: ${text(input.tourist.did, 200) || 'Not recorded'}; credential status: ${text(input.tourist.credentialStatus, 40) || 'Not recorded'}; document reference is masked: ${document || 'Not recorded'}.`,
    `Last known consented location: ${locationSentence(lastKnownLocation)}`,
    profile?.summary ? `Emergency identification description: ${text(profile.summary, 700)}.` : 'No emergency identification description has been recorded.',
    input.incident.voiceStatement ? `Traveller-reviewed voice statement (${text(input.incident.voiceStatementLanguage, 30) || 'language not recorded'}): ${text(input.incident.voiceStatement, 2_000)}` : '',
    `Emergency contacts recorded in Prahari: ${contacts.length ? contacts.map((contact) => `${contact.name} (${contact.relationship})`).join('; ') : 'none'}. Contact details are provided separately in the protected case record.`,
    'Requested action: assess this factual information, obtain the informant’s statement and signature where required, and decide any registration, investigation, or welfare action under the applicable law and State/UT police procedure.',
  ].filter(Boolean);

  return {
    version: 1,
    draftId: `MPD-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    generatedAt,
    generatedBy: text(input.generatedBy, 160) || 'Authorised user',
    reportType: 'MISSING_PERSON_INFORMATION_DRAFT',
    legalFramework: {
      primaryReference: 'BNSS 2023, section 173 (information in cognizable cases)',
      filingStatus: 'NOT_FILED_WITH_POLICE',
      signatureRequirement: 'Electronic information relating to a cognizable offence must be signed by the informant within three days before it is taken on record.',
      stateFormat: 'The receiving State/UT police authority determines the applicable CCTNS/IIF-I or other prescribed format and whether FIR registration is appropriate.',
    },
    person: {
      touristId: text(input.tourist.touristId, 80),
      name: text(input.tourist.name, 160),
      nationality: text(input.tourist.nationality, 100),
      did: text(input.tourist.did, 200) || null,
      identityStatus: text(input.tourist.identityStatus, 40) || null,
      credentialStatus: text(input.tourist.credentialStatus, 40) || null,
      kycMethod: text(input.tourist.kycMethod, 40) || null,
      maskedDocument: text(document, 120) || null,
    },
    lastKnownLocation,
    emergencyIdentificationProfile: profile ? {
      summary: text(profile.summary, 700),
      analysedAt: text(profile.analysedAt, 80) || null,
      source: text(profile.source, 30) || null,
      photoAnalysed: Boolean(profile.photoAnalysed),
    } : null,
    emergencyContacts: contacts,
    sourceIncident: {
      incidentId: text(input.incident.incidentId, 100),
      type: text(input.incident.type, 80),
      createdAt: text(input.incident.createdAt, 80) || null,
    },
    narrative: facts.join('\n\n'),
    reviewChecklist: [
      'Confirm the person’s last-seen date, time, place, and circumstances with the informant.',
      'Check the last-known location timestamp and accuracy; do not treat it as live tracking.',
      'Confirm emergency-contact details and whether consent or another legal basis applies before contacting them.',
      'Obtain the informant’s factual statement and signature before electronic information is treated as recorded.',
      'Use the receiving State/UT police portal or station process; do not infer offences or select legal sections automatically.',
    ],
  };
}
