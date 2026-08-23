export type EmergencyContact = { name?: string; phone?: string; email?: string; relationship?: string };
type DeliveryState = 'ACCEPTED' | 'FAILED' | 'NOT_CONFIGURED' | 'SKIPPED';

export type EmergencyNotificationPlan = {
  status: 'ACCEPTED' | 'PARTIAL' | 'FAILED' | 'NOT_CONFIGURED' | 'NO_CONTACTS' | 'NO_EMAIL_CONTACTS';
  createdAt: string;
  contacts: Array<{ name: string; relationship: string; email: string; emailDelivery: DeliveryState }>;
  message: string;
};

const resendConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMERGENCY_FROM_EMAIL);

export function notificationProviderStatus() {
  return { resendEmail: resendConfigured() };
}

async function sendEmail(to: string, text: string): Promise<DeliveryState> {
  if (!resendConfigured()) return 'NOT_CONFIGURED';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMERGENCY_FROM_EMAIL, to: [to], subject: 'Prahari emergency alert', text }), signal: AbortSignal.timeout(8_000),
    });
    // Resend's response confirms acceptance for delivery, not the recipient's
    // inbox delivery, so do not overstate this as a delivered email.
    return response.ok ? 'ACCEPTED' : 'FAILED';
  } catch { return 'FAILED'; }
}

/** Sends only through explicitly configured providers; otherwise records the exact non-delivery state. */
export async function notifyEmergencyContacts(contacts: EmergencyContact[] = [], incidentId: string): Promise<EmergencyNotificationPlan> {
  const selected = contacts.slice(0, 5);
  if (!selected.length) return { status: 'NO_CONTACTS', createdAt: new Date().toISOString(), contacts: [], message: 'No emergency contacts are on file.' };
  const emailContacts = selected.filter((contact): contact is EmergencyContact & { email: string } => Boolean(contact.email));
  if (!emailContacts.length) return { status: 'NO_EMAIL_CONTACTS', createdAt: new Date().toISOString(), contacts: [], message: 'No emergency-contact email addresses are on file.' };
  if (!resendConfigured()) return { status: 'NOT_CONFIGURED', createdAt: new Date().toISOString(), contacts: [], message: 'No emergency email provider is configured, so contacts were not notified.' };

  const message = `Prahari emergency alert ${incidentId}: the traveller has requested assistance. Please contact local emergency services if you cannot reach them.`;
  const results = await Promise.all(emailContacts.map(async (contact) => ({
    name: contact.name || 'Unnamed contact', relationship: contact.relationship || 'Emergency contact', email: contact.email,
    emailDelivery: await sendEmail(contact.email, message),
  })));
  const deliveries = results.map((result) => result.emailDelivery);
  const accepted = deliveries.filter((state) => state === 'ACCEPTED').length;
  const attempted = deliveries.filter((state) => state !== 'SKIPPED' && state !== 'NOT_CONFIGURED').length;
  const status = accepted === attempted ? 'ACCEPTED' : accepted > 0 ? 'PARTIAL' : 'FAILED';
  return {
    status,
    createdAt: new Date().toISOString(),
    contacts: results,
    message: status === 'ACCEPTED'
      ? `Emergency notification accepted for delivery to ${accepted} contact${accepted === 1 ? '' : 's'}.`
      : status === 'PARTIAL'
        ? `Emergency notification was accepted for ${accepted} of ${attempted} contacts.`
        : 'Emergency notifications could not be delivered. The incident was still recorded for authority review.',
  };
}
