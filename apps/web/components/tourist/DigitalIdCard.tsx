'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, QrCode, UserCheck, FlaskConical, AlertTriangle } from 'lucide-react';
import { generateDigitalIdQr } from '@/lib/services/digitalId';

export interface DigitalIdTourist {
  touristId: string;
  name: string;
  nationality: string;
  did?: string | null;
  identityStatus?: string;
  credentialHash?: string | null;
  credentialStatus?: string | null;
  kycMethod?: string | null;
  credential?: { sandbox?: unknown; expirationDate?: string } | null;
}

/**
 * Renders an issued Digital Tourist ID. Requires a real, credentialed tourist —
 * there is deliberately no mock fallback, so an un-issued identity is visibly
 * un-issued rather than silently showing fabricated data.
 */
export default function DigitalIdCard({ tourist }: { tourist: DigitalIdTourist | null }) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQr, setShowQr] = useState<boolean>(false);

  const did = tourist?.did ?? null;

  useEffect(() => {
    if (!did) { setQrCodeUrl(''); return; }
    // The QR carries the DID plus the credential hash, so a verifier can both
    // resolve the identity and detect tampering.
    const payload = tourist?.credentialHash ? `${did}?h=${tourist.credentialHash}` : did;
    generateDigitalIdQr(payload).then(setQrCodeUrl).catch(console.error);
  }, [did, tourist?.credentialHash]);

  if (!tourist || !did) {
    return (
      <div className="bg-white rounded-md p-5 border border-[#D8D2C4] text-[#14213D] font-sans">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
          <div>
            <h3 className="font-serif font-bold text-lg">No credential issued yet</h3>
            <p className="text-sm text-slate-600 mt-1">
              Complete identity verification to receive a Digital Tourist ID.
            </p>
            <a href="/onboarding"
              className="inline-block mt-3 px-3 py-1.5 bg-[#14213D] text-white rounded text-xs font-bold">
              Start verification →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isSandbox = Boolean(tourist.credential?.sandbox);
  const revoked = tourist.credentialStatus === 'revoked' || tourist.credentialStatus === 'suspended';

  return (
    <div className="bg-white rounded-md p-5 border border-[#D8D2C4] text-[#14213D] font-sans relative">
      <div className="flex flex-wrap items-center justify-between border-b border-[#D8D2C4] pb-3.5 mb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#14213D] text-white rounded">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif font-bold text-[#14213D] text-lg tracking-tight">
                Digital Tourist Identity Permit
              </h3>
              {revoked ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-300">
                  {tourist.credentialStatus}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-[#1B5E3C] border border-[#1B5E3C]/30 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> VERIFIED CREDENTIAL
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-500 mt-0.5 break-all">REF ID: {did}</p>
          </div>
        </div>

        <button
          onClick={() => setShowQr(!showQr)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14213D] hover:bg-[#1C2D52] text-white rounded text-xs font-bold transition cursor-pointer border border-[#14213D]"
        >
          <QrCode className="w-4 h-4" />
          {showQr ? 'Hide Official QR' : 'Show Official QR'}
        </button>
      </div>

      {isSandbox && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900">
          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          <span>Issued by a simulated verification provider — not a government-recognised credential.</span>
        </div>
      )}

      {showQr ? (
        <div className="flex flex-col items-center justify-center p-4 bg-[#F7F5F0] rounded border border-[#D8D2C4] my-2 text-[#14213D]">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="Digital Tourist ID QR Code" className="w-44 h-44 object-contain mix-blend-multiply" />
          ) : (
            <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">Generating QR...</div>
          )}
          <p className="text-xs font-mono text-[#14213D] mt-2 font-bold text-center tracking-wider break-all max-w-xs">
            {did}
          </p>
          <p className="text-[11px] text-slate-600 text-center mt-1 max-w-sm">
            W3C Verifiable Credential. Authorised personnel scan this to verify identity
            and confirm the credential has not been tampered with.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Field label="PERMIT HOLDER" value={tourist.name} serif />
          <Field label="TOURIST SERIAL NO." value={tourist.touristId} mono />
          <Field label="NATIONALITY / ORIGIN" value={tourist.nationality} />
          <div className="bg-[#F7F5F0] p-3 rounded border border-[#D8D2C4]">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-bold mb-0.5">
              KYC STATUS
            </span>
            <span className="font-bold text-[#1B5E3C] text-sm flex items-center gap-1">
              ✓ {tourist.kycMethod === 'passport' ? 'Passport MRZ verified' : 'Aadhaar verified'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono, serif }: { label: string; value: string; mono?: boolean; serif?: boolean }) {
  return (
    <div className="bg-[#F7F5F0] p-3 rounded border border-[#D8D2C4]">
      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-bold mb-0.5">
        {label}
      </span>
      <span className={`font-bold text-[#14213D] text-sm ${mono ? 'font-mono' : serif ? 'font-serif' : ''}`}>
        {value}
      </span>
    </div>
  );
}
