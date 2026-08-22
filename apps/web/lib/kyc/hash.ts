import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Salt for subject hashing. Set KYC_HASH_SALT in the environment; the
 * fallback keeps local dev working but is not a secret.
 */
const SALT =
  process.env.KYC_HASH_SALT ??
  'prahari-dev-salt-not-for-production-do-not-rely-on-this';

if (!process.env.KYC_HASH_SALT && process.env.NODE_ENV === 'production') {
  console.warn('[prahari] KYC_HASH_SALT is unset in production — subject hashes are not secret.');
}

/**
 * One-way salted hash of a document number (Aadhaar / passport).
 * This is the ONLY durable trace of the number: it lets us detect a repeat
 * enrolment without ever storing the number itself.
 */
export function hashSubject(documentNumber: string, namespace: string): string {
  return createHmac('sha256', SALT)
    .update(`${namespace}:${documentNumber.trim().toUpperCase()}`)
    .digest('hex');
}

/** Hash an OTP for storage, so a database leak does not expose live codes. */
export function hashChallenge(otp: string, sessionId: string): string {
  return createHmac('sha256', SALT).update(`otp:${sessionId}:${otp}`).digest('hex');
}

/** Constant-time comparison, so OTP checking cannot be timed. */
export function safeEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function newSessionId(): string {
  return `kyc_${randomBytes(16).toString('hex')}`;
}

/** Six-digit numeric OTP, uniformly distributed. */
export function newOtp(): string {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
}
