export type EmergencyContact = { name?: string; phone?: string; email?: string; relationship?: string };
type DeliveryState = 'ACCEPTED' | 'FAILED' | 'NOT_CONFIGURED' | 'SKIPPED';

export type EmergencyNotificationPlan = {
  status: 'ACCEPTED' | 'PARTIAL' | 'FAILED' | 'NOT_CONFIGURED' | 'NO_CONTACTS' | 'NO_EMAIL_CONTACTS';
  createdAt: string;
  contacts: Array<{
    name: string;
    relationship: string;
    /** The contact's own address as recorded on the traveller's profile. */
    email: string;
    /** The address the provider was actually asked to deliver to. */
    deliveredTo: string;
    emailDelivery: DeliveryState;
    /** Short provider-side reason, present only when a delivery failed. */
    failureReason?: string;
  }>;
  message: string;
};

export type EmergencyAlertContext = {
  /** Human-readable classification only; never include raw GPS or PII. */
  kind?: 'sos' | 'geofence_breach' | 'safety_review';
  zoneName?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resend only accepts mail for the address that owns the account while the
 * shared sandbox sender (onboarding@resend.dev) or an unverified domain is in
 * use, so every alert is routed to this single verified inbox instead of the
 * contact's own address. Override with EMERGENCY_ALERT_RECIPIENT, or set that
 * variable to an empty string once a sending domain is verified to deliver to
 * each contact directly.
 */
const DEFAULT_ALERT_RECIPIENT = 'aravarun8@gmail.com';

const resendConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMERGENCY_FROM_EMAIL);

/** The verified inbox every alert is redirected to, or null to deliver per contact. */
function alertRecipientOverride(): string | null {
  const configured = process.env.EMERGENCY_ALERT_RECIPIENT;
  const recipient = (configured === undefined ? DEFAULT_ALERT_RECIPIENT : configured).trim().toLowerCase();
  return EMAIL_PATTERN.test(recipient) ? recipient : null;
}

export function notificationProviderStatus() {
  return { resendEmail: resendConfigured(), redirectedToVerifiedInbox: Boolean(alertRecipientOverride()) };
}

async function sendEmail(to: string, text: string): Promise<{ state: DeliveryState; failureReason?: string }> {
  if (!resendConfigured()) return { state: 'NOT_CONFIGURED' };
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMERGENCY_FROM_EMAIL, to: [to], subject: 'Prahari emergency alert', text }),
      signal: AbortSignal.timeout(8_000),
    });
    // Resend's response confirms acceptance for delivery, not the recipient's
    // inbox delivery, so do not overstate this as a delivered email.
    if (response.ok) return { state: 'ACCEPTED' };
    // Keep the provider's own wording: a rejected sandbox recipient or an
    // unverified domain is otherwise indistinguishable from a network failure.
    const detail = await response.text().catch(() => '');
    const reason = (() => {
      try {
        const parsed = JSON.parse(detail);
        return typeof parsed?.message === 'string' ? parsed.message : detail;
      } catch {
        return detail;
      }
    })();
    return { state: 'FAILED', failureReason: `Resend responded ${response.status}${reason ? `: ${reason.slice(0, 300)}` : ''}` };
  } catch (error: any) {
    return { state: 'FAILED', failureReason: error?.name === 'TimeoutError' ? 'The email provider did not respond within 8 seconds.' : 'The email provider could not be reached.' };
  }
}

/** Sends emergency alerts through the configured Resend email provider only. */
export async function notifyEmergencyContacts(
  contacts: EmergencyContact[] = [],
  incidentId: string,
  context: EmergencyAlertContext = {},
): Promise<EmergencyNotificationPlan> {
  const selected = (Array.isArray(contacts) ? contacts : []).slice(0, 5);
  if (!selected.length) return { status: 'NO_CONTACTS', createdAt: new Date().toISOString(), contacts: [], message: 'No emergency contacts are on file.' };

  // A profile can repeat an address across contacts; one alert per distinct
  // address is enough and avoids sending the same person duplicate mail.
  const seen = new Set<string>();
  const emailContacts = selected
    .map((contact) => ({ ...contact, email: String(contact?.email ?? '').trim().toLowerCase() }))
    .filter((contact) => EMAIL_PATTERN.test(contact.email))
    .filter((contact) => !seen.has(contact.email) && seen.add(contact.email));
  if (!emailContacts.length) return { status: 'NO_EMAIL_CONTACTS', createdAt: new Date().toISOString(), contacts: [], message: 'No emergency-contact email addresses are on file.' };
  if (!resendConfigured()) return { status: 'NOT_CONFIGURED', createdAt: new Date().toISOString(), contacts: [], message: 'No emergency email provider is configured, so contacts were not notified.' };

  const override = alertRecipientOverride();
  const message = context.kind === 'geofence_breach'
    ? `Prahari safety alert ${incidentId}: the traveller entered ${context.zoneName || 'a configured safety zone'} and an authority review record was created. This is not confirmation of distress. Please try to contact the traveller; call local emergency services if you have an immediate concern.`
    : context.kind === 'safety_review'
      ? `Prahari safety alert ${incidentId}: safety signals require authorised review. This is not confirmation of distress. Please try to contact the traveller; call local emergency services if you have an immediate concern.`
      : `Prahari emergency alert ${incidentId}: the traveller has requested assistance. Please contact local emergency services if you cannot reach them.`;

  const results = await Promise.all(emailContacts.map(async (contact) => {
    const deliveredTo = override ?? contact.email;
    const name = contact.name || 'Unnamed contact';
    const relationship = contact.relationship || 'Emergency contact';
    // When alerts are redirected to one verified inbox, the body must still say
    // who the alert was meant for, or the recipient cannot act on it.
    const body = override && override !== contact.email
      ? `${message}\n\nIntended emergency contact: ${name} (${relationship}) <${contact.email}>. This alert was routed to the verified Prahari notification inbox because the configured sending domain cannot yet deliver to that address.`
      : message;
    const { state, failureReason } = await sendEmail(deliveredTo, body);
    return { name, relationship, email: contact.email, deliveredTo, emailDelivery: state, ...(failureReason ? { failureReason } : {}) };
  }));

  const deliveries = results.map((result) => result.emailDelivery);
  const accepted = deliveries.filter((state) => state === 'ACCEPTED').length;
  const attempted = deliveries.filter((state) => state !== 'SKIPPED' && state !== 'NOT_CONFIGURED').length;
  const status = attempted > 0 && accepted === attempted ? 'ACCEPTED' : accepted > 0 ? 'PARTIAL' : 'FAILED';

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
