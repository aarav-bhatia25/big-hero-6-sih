'use client';

import { useEffect, useState } from 'react';
import { Bot, CircleAlert, Loader2, Sparkles } from 'lucide-react';
import { COMMUNICATION_LANGUAGES } from '@/lib/languages';

type Brief = {
  overview: string;
  priorityActions: string[];
  questionsForTraveller: string[];
  uncertainties: string[];
};

export default function AIIncidentBrief({ incidentId }: { incidentId: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefLanguage, setBriefLanguage] = useState('en-IN');

  useEffect(() => {
    setBrief(null);
    setError(null);
  }, [incidentId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/authority/incidents/${encodeURIComponent(incidentId)}/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputLanguage: briefLanguage }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'The AI brief could not be generated.');
      setBrief(data.brief);
    } catch (error: any) {
      setError(error.message || 'The AI brief could not be generated.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-4 mt-4 border-t border-line space-y-3" aria-label="AI-assisted incident brief">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 shrink-0 text-indigo-600" />
          <div>
            <h4 className="font-semibold text-ink text-xs">AI-assisted incident brief</h4>
            <p className="text-[11px] leading-relaxed text-ink-soft">Sarvam AI condensed case summary aid for review.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={briefLanguage} onChange={(event) => setBriefLanguage(event.target.value)} className="rounded border border-line bg-surface px-2 py-1 text-[11px] text-ink">
            {COMMUNICATION_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
          <button onClick={generate} disabled={loading} className="minimal-button minimal-button-primary text-xs px-2.5 py-1 shrink-0 disabled:opacity-60">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {loading ? 'Preparing…' : brief ? 'Refresh brief' : 'Generate brief'}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 flex items-start gap-2 text-xs leading-5 text-rose-300"><CircleAlert className="mt-0.5 size-3.5 shrink-0" />{error}</p>}
      {brief && (
        <div className="mt-4 space-y-4 border-t border-violet-400/20 pt-4 text-sm">
          <p className="leading-6 text-ink">{brief.overview}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <BriefList title="Priority checks" items={brief.priorityActions} />
            <BriefList title="Ask the traveller" items={brief.questionsForTraveller} />
            <BriefList title="Uncertain / missing" items={brief.uncertainties} />
          </div>
        </div>
      )}
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{title}</p>
      {items.length ? <ul className="mt-2 space-y-1.5 text-xs leading-5 text-ink-soft">{items.map((item, index) => <li key={`${title}-${index}`}>• {item}</li>)}</ul> : <p className="mt-2 text-xs text-ink-soft">None identified.</p>}
    </div>
  );
}
