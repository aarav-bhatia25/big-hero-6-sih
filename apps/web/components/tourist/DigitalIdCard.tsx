'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, QrCode, UserCheck, FlaskConical, AlertTriangle, Link2 } from 'lucide-react';
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
  anchorTxHash?: string | null;
  anchorChainId?: number | null;
}

/** Human label + optional explorer link for a chain id. */
function chainLabel(chainId?: number | null): { name: string; explorer?: string } {
  switch (chainId) {
    case 11155111: return { name: 'Ethereum Sepolia', explorer: 'https://sepolia.etherscan.io/tx/' };
    case 1: return { name: 'Ethereum', explorer: 'https://etherscan.io/tx/' };
    case 31337: return { name: 'Local Hardhat' };
    default: return { name: chainId ? `Chain ${chainId}` : 'Blockchain' };
  }
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
    const payload = tourist?.credentialHash ? `${did}?h=${tourist.credentialHash}` : did;
    generateDigitalIdQr(payload).then(setQrCodeUrl).catch(console.error);
  }, [did, tourist?.credentialHash]);

  if (!tourist || !did) {
    return (
      <div className="nb-card p-5 text-ink font-sans">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-nb border-2 border-line bg-warning text-ink shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-black text-lg">No credential issued yet</h3>
            <p className="text-sm text-ink-soft mt-1">
              Complete identity verification to receive a Digital Tourist ID.
            </p>
            <a href="/onboarding" className="nb-btn nb-btn-accent mt-3 text-xs">
              Start verification →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isSandbox = Boolean(tourist.credential?.sandbox);
  const revoked = tourist.credentialStatus === 'revoked' || tourist.credentialStatus === 'suspended';
  const anchor = tourist.anchorTxHash ? chainLabel(tourist.anchorChainId) : null;

  return (
    <div className="nb-card p-5 text-ink font-sans relative">
      <div className="flex flex-wrap items-center justify-between border-b-2 border-line pb-3.5 mb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent text-accent-ink rounded-nb border-2 border-line">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-ink text-lg tracking-tight">
                Digital Tourist Identity Permit
              </h3>
              {revoked ? (
                <span className="nb-chip bg-danger text-white">{tourist.credentialStatus}</span>
              ) : (
                <span className="nb-chip" style={{ background: '#15a34a', color: '#fff' }}>
                  <UserCheck className="w-3 h-3" /> VERIFIED
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-ink-soft mt-0.5 break-all">REF ID: {did}</p>
          </div>
        </div>

        <button onClick={() => setShowQr(!showQr)} className="nb-btn nb-btn-accent text-xs">
          <QrCode className="w-4 h-4" />
          {showQr ? 'Hide Official QR' : 'Show Official QR'}
        </button>
      </div>

      {isSandbox && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 nb-inset text-[11px]" style={{ background: 'var(--nb-accent-soft)' }}>
          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          <span>Issued by a simulated verification provider — not a government-recognised credential.</span>
        </div>
      )}

      {anchor && (
        <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 nb-inset text-[11px]">
          <Link2 className="w-3.5 h-3.5 shrink-0 text-success" />
          <span className="font-bold">Anchored on-chain</span>
          <span className="text-ink-soft">· {anchor.name} · credential hash immutably recorded</span>
          {anchor.explorer ? (
            <a href={`${anchor.explorer}${tourist.anchorTxHash}`} target="_blank" rel="noopener noreferrer"
              className="font-mono text-accent-strong underline break-all">
              {tourist.anchorTxHash!.slice(0, 10)}…{tourist.anchorTxHash!.slice(-8)}
            </a>
          ) : (
            <span className="font-mono text-ink-soft break-all">
              tx {tourist.anchorTxHash!.slice(0, 10)}…{tourist.anchorTxHash!.slice(-8)}
            </span>
          )}
        </div>
      )}

      {showQr ? (
        <div className="flex flex-col items-center justify-center p-4 nb-inset my-2 text-ink">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="Digital Tourist ID QR Code" className="w-44 h-44 object-contain bg-white p-2 rounded-nb border-2 border-line" />
          ) : (
            <div className="w-44 h-44 flex items-center justify-center text-ink-soft text-xs">Generating QR...</div>
          )}
          <p className="text-xs font-mono text-ink mt-2 font-bold text-center tracking-wider break-all max-w-xs">
            {did}
          </p>
          <p className="text-[11px] text-ink-soft text-center mt-1 max-w-sm">
            W3C Verifiable Credential. Authorised personnel scan this to verify identity and confirm
            the credential has not been tampered with.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Field label="PERMIT HOLDER" value={tourist.name} />
          <Field label="TOURIST SERIAL NO." value={tourist.touristId} mono />
          <Field label="NATIONALITY / ORIGIN" value={tourist.nationality} />
          <div className="nb-inset p-3">
            <span className="text-[10px] text-ink-soft font-mono uppercase tracking-wider block font-bold mb-0.5">
              KYC STATUS
            </span>
            <span className="font-bold text-success text-sm flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              {tourist.kycMethod === 'passport' ? 'Passport MRZ' : 'Aadhaar'} verified
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="nb-inset p-3">
      <span className="text-[10px] text-ink-soft font-mono uppercase tracking-wider block font-bold mb-0.5">
        {label}
      </span>
      <span className={`font-bold text-ink text-sm ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
