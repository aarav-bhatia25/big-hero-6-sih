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
    <section className="rounded-nb border border-violet-400/30 bg-violet-400/10 p-4" aria-label="AI-assisted incident brief">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-600 text-white"><Bot size={18} /></div>
          <div>
            <p className="font-semibold text-ink">AI-assisted incident brief</p>
            <p className="mt-1 text-xs leading-5 text-ink-soft">Sarvam AI condenses the authorised incident record into a review aid. It never dispatches responders or makes a finding.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={briefLanguage} onChange={(event) => setBriefLanguage(event.target.value)} className="rounded border border-violet-400/40 bg-surface px-2 py-1.5 text-xs text-ink">
            {COMMUNICATION_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
          <button onClick={generate} disabled={loading} className="minimal-button border border-violet-400/50 bg-violet-600/20 text-violet-100 hover:bg-violet-600/30 disabled:opacity-60">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Preparing brief…' : brief ? 'Refresh brief' : 'Generate brief'}
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
    </section>
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
