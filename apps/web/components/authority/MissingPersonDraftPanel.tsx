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
    <div className="pt-4 mt-4 border-t border-line space-y-3" aria-label="Missing-person information draft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileWarning className="size-4 shrink-0 text-amber-600" />
          <div>
            <h4 className="font-semibold text-ink text-xs">Missing-person information draft</h4>
            <p className="text-[11px] leading-relaxed text-ink-soft">Uses verified profile, location, emergency contacts, and reviewed SOS text.</p>
          </div>
        </div>
        <button onClick={generate} disabled={loading} className="minimal-button minimal-button-secondary text-xs px-2.5 py-1 shrink-0 disabled:opacity-60">
          {loading ? <Loader2 className="size-3 animate-spin" /> : <FileWarning className="size-3" />}
          {draft ? 'Regenerate draft' : 'Generate draft'}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      {draft && (
        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-2 rounded-lg border border-line bg-surface-2 p-2.5 text-xs text-ink-soft">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
            <span>{draft.legalFramework?.filingStatus === 'NOT_FILED_WITH_POLICE' ? 'Not filed with police. Officer must verify facts and obtain signature before electronic FIR record.' : 'Review legal filing status before taking action.'}</span>
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 font-sans text-xs leading-relaxed text-ink">{draft.narrative}</pre>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-ink-soft">Generated {draft.generatedAt ? new Date(draft.generatedAt).toLocaleString() : 'now'}</p>
            <button onClick={() => void copyDraft()} className="minimal-button minimal-button-secondary px-2.5 py-1 text-xs"><Clipboard className="size-3" />{copied ? 'Copied' : 'Copy draft text'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
