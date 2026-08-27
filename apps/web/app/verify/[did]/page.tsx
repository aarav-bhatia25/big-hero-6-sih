'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, CircleX, ExternalLink, FlaskConical, Link2, Loader2, LockKeyhole } from 'lucide-react';

type VerificationRecord = {
  ok: boolean;
  valid: boolean;
  error?: string;
  reason?: string;
  did?: string;
  credentialStatus?: string;
  verificationMethod?: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  sandbox?: boolean;
  blockchain?: {
    anchored: boolean;
    valid: boolean;
    state: string;
    chainId: number;
    txHash: string | null;
  } | null;
  disclosure?: {
    personalDataDisclosed: boolean;
    detailAccess: string;
  };
};

function date(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not available';
}

export default function CredentialVerificationPage() {
  const params = useParams<{ did: string }>();
  const searchParams = useSearchParams();
  const did = useMemo(() => decodeURIComponent(params.did ?? ''), [params.did]);
  const claimHash = searchParams.get('h');
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!did) return;
    const endpoint = `/api/identity/verify/${encodeURIComponent(did)}${claimHash ? `?h=${encodeURIComponent(claimHash)}` : ''}`;
    void fetch(endpoint, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as VerificationRecord;
        setRecord(payload);
      })
      .catch(() => setRecord({ ok: false, valid: false, error: 'The verification service could not be reached.' }))
      .finally(() => setLoading(false));
  }, [did, claimHash]);

  const explorer = record?.blockchain?.chainId === 11155111 && record.blockchain.txHash
    ? `https://sepolia.etherscan.io/tx/${record.blockchain.txHash}`
    : null;

  return (
    <main className="minimal-page min-h-screen">
      <header className="minimal-nav">
        <Link href="/" className="text-xl font-semibold tracking-tight text-ink">Prahari</Link>
      </header>

      <section className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-20">
        <Link href="/" className="minimal-text-link inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Prahari
        </Link>

        {loading ? (
          <div className="minimal-card mt-8 flex min-h-56 items-center justify-center gap-3 text-ink-soft">
            <Loader2 className="animate-spin text-sky-400" size={21} /> Checking credential…
          </div>
        ) : !record?.ok ? (
          <div className="minimal-card mt-8">
            <div className="flex items-start gap-3">
              <CircleX className="mt-0.5 shrink-0 text-danger" size={26} />
              <div>
                <h1 className="text-2xl font-semibold text-ink">Credential could not be verified</h1>
                <p className="mt-2 text-base leading-7 text-ink-soft">{record?.error ?? 'No credential was found for this DID.'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="minimal-card mt-8 space-y-7 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className={`grid size-12 shrink-0 place-items-center rounded-full ${record.valid ? 'bg-emerald-100 text-success' : 'bg-red-100 text-danger'}`}>
                {record.valid ? <CheckCircle2 size={27} /> : <CircleX size={27} />}
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-sky-400">Credential verification</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                  {record.valid ? 'Credential is active' : 'Credential is not valid'}
                </h1>
                <p className="mt-2 text-base text-ink-soft">
                  {record.valid
                    ? 'The credential signature and recorded status have been checked.'
                    : record.reason ?? 'This credential does not pass the verification checks.'}
                </p>
              </div>
            </div>

            {record.sandbox && (
              <div className="onboarding-notice text-sm">
                <FlaskConical className="mt-0.5 shrink-0" size={19} />
                <span>Sandbox identity verification: this credential is not government-recognised.</span>
              </div>
            )}

            <dl className="grid gap-x-8 gap-y-4 border-y border-line py-6 text-sm sm:grid-cols-2">
              {[
                ['Verification method', record.verificationMethod],
                ['Credential status', record.credentialStatus],
                ['Valid until', date(record.expiresAt)],
                ['DID', record.did],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
                  <dd className="mt-1 break-all font-mono text-sm text-ink">{value || 'Not available'}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-xl border border-line bg-surface-2 p-5">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 shrink-0 text-sky-400" size={21} />
                <div>
                  <h2 className="font-semibold text-ink">Privacy-preserving scan</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    {record.disclosure?.detailAccess ?? 'This scan does not disclose personal information, identity document data, emergency contacts, or location.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-5">
              <div className="flex items-start gap-3">
                <Link2 className={`mt-0.5 shrink-0 ${record.blockchain?.anchored ? 'text-success' : 'text-ink-soft'}`} size={21} />
                <div className="min-w-0">
                  <h2 className="font-semibold text-ink">Blockchain anchor</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    {record.blockchain?.anchored && record.blockchain.valid
                      ? `Active credential hash anchored on chain ${record.blockchain.chainId}. No personal identity data is stored on-chain.`
                      : 'No active blockchain anchor was found for this credential.'}
                  </p>
                  {explorer && (
                    <a href={explorer} target="_blank" rel="noreferrer" className="minimal-button minimal-button-secondary mt-4">
                      View transaction on Sepolia Etherscan <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
