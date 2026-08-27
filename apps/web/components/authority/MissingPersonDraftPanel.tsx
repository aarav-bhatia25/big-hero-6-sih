'use client';

import { useState } from 'react';
import { Clipboard, FileWarning, Loader2, ShieldCheck } from 'lucide-react';

export default function MissingPersonDraftPanel({ incident, onSaved }: { incident: any; onSaved: (incident: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const draft = incident?.missingPersonDraft;

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/efir/missing-person-draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ incidentId: incident.incidentId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Missing-person draft could not be generated.');
      onSaved(data.incident);
    } catch (cause: any) {
      setError(cause.message || 'Missing-person draft could not be generated.');
    } finally { setLoading(false); }
  };

  const copyDraft = async () => {
    if (!draft?.narrative || !navigator.clipboard) return;
    await navigator.clipboard.writeText(draft.narrative);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  return (
    <section className="rounded-nb border border-amber-600/25 bg-amber-50 p-4" aria-label="Missing-person information draft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <FileWarning className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold text-ink">Missing-person information draft</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-soft">Uses the verified tourist profile, latest consented location, emergency contacts, identification profile, and reviewed SOS text. It generates factual content only.</p>
          </div>
        </div>
        <button onClick={generate} disabled={loading} className="minimal-button border border-amber-600/25 bg-white text-amber-900 hover:bg-amber-100 disabled:opacity-60">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <FileWarning className="size-4" />}
          {draft ? 'Regenerate factual draft' : 'Generate draft'}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-xs leading-5 text-rose-700">{error}</p>}
      {draft && (
        <div className="mt-4 space-y-3 border-t border-amber-600/20 pt-4">
          <div className="flex items-start gap-2 rounded border border-amber-600/20 bg-white/70 p-3 text-xs leading-5 text-ink-soft"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-700" />{draft.legalFramework?.filingStatus === 'NOT_FILED_WITH_POLICE' ? 'Not filed with police. An authorised officer must verify facts, use the relevant State/UT process, and obtain the informant’s signature when required before an electronic FIR can be taken on record.' : 'Review the legal filing status before taking further action.'}</div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border border-line bg-surface p-3 font-sans text-sm leading-6 text-ink">{draft.narrative}</pre>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-soft">Generated {draft.generatedAt ? new Date(draft.generatedAt).toLocaleString() : 'now'} · Last location is an historic, consented record—not a live location.</p>
            <button onClick={() => void copyDraft()} className="minimal-button minimal-button-secondary px-3 py-2 text-xs"><Clipboard className="size-3.5" />{copied ? 'Copied' : 'Copy factual draft'}</button>
          </div>
        </div>
      )}
    </section>
  );
}
