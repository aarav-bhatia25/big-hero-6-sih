'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { QrCode, UserCheck, FlaskConical, AlertTriangle, Link2 } from 'lucide-react';
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
      <section className="minimal-card p-6 text-ink">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={20} />
          <div>
            <h3 className="text-lg font-semibold">No credential issued yet</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Complete identity verification to receive a Digital Tourist ID.
            </p>
            <a href="/onboarding" className="minimal-button minimal-button-primary mt-4 text-sm">
              Start verification →
            </a>
          </div>
        </div>
      </section>
    );
  }

  const isSandbox = Boolean(tourist.credential?.sandbox);
  const revoked = tourist.credentialStatus === 'revoked' || tourist.credentialStatus === 'suspended';
  const anchor = tourist.anchorTxHash ? chainLabel(tourist.anchorChainId) : null;

  return (
    <section className="minimal-card relative p-6 text-ink">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight text-ink">
                Digital Tourist ID
              </h3>
              {revoked ? (
                <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">{tourist.credentialStatus}</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  <UserCheck className="size-3.5" /> Verified
                </span>
              )}
            </div>
            <p className="mt-1 break-all font-mono text-xs text-ink-soft">{did}</p>
        </div>

        <button onClick={() => setShowQr(!showQr)} className="minimal-button minimal-button-primary text-sm">
          <QrCode className="w-4 h-4" />
          {showQr ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      {isSandbox && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs text-ink-soft">
          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          <span>Issued by a simulated verification provider — not a government-recognised credential.</span>
        </div>
      )}

      {anchor ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-3 text-xs">
          <Link2 className="w-3.5 h-3.5 shrink-0 text-success" />
          <span className="font-semibold text-ink">Anchored on-chain</span>
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
          <span className="w-full text-ink-soft">No personal wallet was connected: this anchor was submitted by the Prahari server wallet.</span>
        </div>
      ) : (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-line bg-surface-2 px-3 py-3 text-xs">
          <Link2 className="w-3.5 h-3.5 shrink-0 text-ink-soft" />
          <span><strong>Blockchain anchor not recorded.</strong> Your credential remains signed and verifiable, but an on-chain registry must be configured before a server anchor can be created.</span>
        </div>
      )}

      {showQr ? (
        <div className="my-2 flex flex-col items-center justify-center rounded-xl border border-line bg-surface-2 p-5 text-ink">
          {qrCodeUrl ? (
            <Image src={qrCodeUrl} alt="Digital Tourist ID QR Code" width={176} height={176} unoptimized className="h-44 w-44 object-contain rounded-nb border-2 border-line bg-white p-2" />
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
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <Field label="Holder" value={tourist.name} />
          <Field label="Tourist ID" value={tourist.touristId} mono />
          <Field label="Nationality" value={tourist.nationality} />
          <div className="rounded-lg border border-line bg-surface-2 p-3">
            <span className="mb-1 block text-xs text-ink-soft">
              Verification
            </span>
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-300">
              <UserCheck className="w-3.5 h-3.5" />
              {tourist.kycMethod === 'passport' ? 'Passport MRZ' : 'Aadhaar'} verified
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <span className="mb-1 block text-xs text-ink-soft">
        {label}
      </span>
      <span className={`text-sm font-medium text-ink ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
