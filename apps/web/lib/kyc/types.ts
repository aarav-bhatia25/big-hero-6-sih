/**
 * KYC provider contract.
 *
 * Everything above this interface is provider-agnostic. Swapping the simulated
 * UIDAI provider for a licensed AUA/KUA gateway (Setu, Signzy, IDfy, DigiLocker)
 * means writing one new module that satisfies `KycProvider` and changing the
 * export in `lib/kyc/index.ts` — no route, schema, or UI change.
 */

export type KycMethod = 'aadhaar' | 'passport';

/** Identity attributes a provider returns once verification succeeds. */
export interface KycSubject {
  fullName: string;
  nationality: string;
  nationalityCode: string;
  dateOfBirth?: string;
  sex?: 'M' | 'F' | 'X';
  documentType: string;
  /** Display-safe fragment, e.g. "XXXX-XXXX-1234". Never the full number. */
  maskedDocument: string;
  /** Salted hash of the document number. The only durable trace we keep. */
  subjectHash: string;
  /** Provider-specific, non-identifying metadata for the audit trail. */
  meta?: Record<string, unknown>;
}

export interface KycInitiateInput {
  method: KycMethod;
  fullName?: string;
  aadhaarNumber?: string;
  mrzLine1?: string;
  mrzLine2?: string;
}

export type KycInitiateResult =
  | {
      ok: true;
      sessionId: string;
      /** True when a second step (OTP) is required before the subject is returned. */
      requiresOtp: boolean;
      maskedTarget?: string;
      expiresAt: string;
      /** Sandbox only: the OTP, so the flow is demoable without a real SMS gateway. */
      sandboxOtp?: string;
      subject?: KycSubject;
    }
  | { ok: false; error: string };

export interface KycVerifyInput {
  sessionId: string;
  otp?: string;
}

export type KycVerifyResult =
  | { ok: true; subject: KycSubject }
  | { ok: false; error: string; attemptsRemaining?: number; locked?: boolean };

export interface KycProvider {
  /** Human-readable provider id recorded against every credential. */
  readonly id: string;
  /** True when this provider does not contact a real issuing authority. */
  readonly isSandbox: boolean;
  initiate(input: KycInitiateInput): Promise<KycInitiateResult>;
  verify(input: KycVerifyInput): Promise<KycVerifyResult>;
}
