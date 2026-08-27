'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Languages, Loader2, MessageSquare, Send, Shield, CheckCircle2 } from 'lucide-react';
import { createChatPacket, SOSPacket } from '@/lib/sos-mesh/sosPacket';
import { COMMUNICATION_LANGUAGES, languageLabel } from '@/lib/languages';

interface AuthorityEmergencyChatProps {
  incidentId: string;
  touristName?: string;
  touristLanguage?: string;
}

export default function AuthorityEmergencyChat({ incidentId, touristName = 'Traveller', touristLanguage = 'en-IN' }: AuthorityEmergencyChatProps) {
  const [messages, setMessages] = useState<SOSPacket[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [outgoingLanguage, setOutgoingLanguage] = useState('en-IN');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translatingPacketId, setTranslatingPacketId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load the protected, server-persisted chat transcript.
  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const res = await fetch(`/api/chat-relay?incidentId=${encodeURIComponent(incidentId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.messages)) {
            setMessages(data.messages);
          }
        }
      } catch (e) {
        console.warn('[AuthorityEmergencyChat] Fetch transcript error:', e);
      }
    };

    void fetchTranscript();
    const interval = window.setInterval(fetchTranscript, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [incidentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    try {
      setSending(true);
      setTranslationError(null);
      let deliveredText = text.trim();
      if (outgoingLanguage !== touristLanguage) {
        const translationResponse = await fetch('/api/multilingual/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incidentId,
            text: deliveredText,
            sourceLanguage: outgoingLanguage,
            targetLanguage: touristLanguage,
          }),
        });
        const translation = await translationResponse.json().catch(() => null);
        if (!translationResponse.ok || !translation?.success) throw new Error(translation?.error || 'Message translation could not be completed.');
        deliveredText = translation.translatedText;
      }
      const packet = createChatPacket({
        incidentId,
        touristId: 'POLICE-HQ',
        senderRole: 'authority',
        senderName: 'Police Command HQ',
        text: deliveredText,
        language: touristLanguage,
        ...(deliveredText !== text.trim() ? { originalText: text.trim(), originalLanguage: outgoingLanguage } : {}),
      });

      // 1. Post to Gateway API
      const res = await fetch('/api/chat-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packet }),
      });

      const result = await res.json().catch(() => null);
      if (res.ok && result?.success) {
        const authenticatedPacket = result.packet ?? packet;
        setMessages((prev) => [...prev, authenticatedPacket]);
        setText('');

      } else {
        throw new Error(result?.error || 'Failed to dispatch the translated response.');
      }
    } catch (err: any) {
      window.alert(err.message || 'Failed to dispatch chat response.');
    } finally {
      setSending(false);
    }
  };

  const translateIncoming = async (message: SOSPacket) => {
    if (!message.chatText || translations[message.packetId]) return;
    setTranslatingPacketId(message.packetId);
    setTranslationError(null);
    try {
      const response = await fetch('/api/multilingual/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId,
          text: message.chatText,
          sourceLanguage: message.chatLanguage || touristLanguage,
          targetLanguage: 'en-IN',
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error || 'Message translation could not be completed.');
      setTranslations((current) => ({ ...current, [message.packetId]: result.translatedText }));
    } catch (error: any) {
      setTranslationError(error.message || 'Message translation could not be completed.');
    } finally {
      setTranslatingPacketId(null);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-line bg-surface p-4 text-ink">
      <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
          <Shield className="size-4 text-emerald-400" /> Multilingual emergency communications
        </h3>
        <span className="font-mono text-xs text-ink-soft">Traveller: {languageLabel(touristLanguage)} • {incidentId}</span>
      </div>

      {/* Transcript List */}
      <div className="max-h-56 min-h-[120px] overflow-y-auto rounded-lg border border-line bg-surface-2 p-3 space-y-2.5">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-soft">
            No messages exchanged yet with {touristName}. Type a response below to send through the protected command channel.
          </p>
        ) : (
          messages.map((msg) => {
            const isAuthority = msg.senderRole === 'authority';
            return (
              <div
                key={msg.packetId}
                className={`flex flex-col ${isAuthority ? 'items-end' : 'items-start'}`}
              >
                <div className="mb-0.5 flex items-center gap-1.5 text-[10px] text-ink-soft">
                  <span className="font-semibold text-ink">{msg.senderName || (isAuthority ? 'Police HQ' : touristName)}</span>
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    isAuthority
                      ? 'bg-emerald-700 text-white rounded-br-none font-medium'
                      : 'bg-surface border border-sky-500/40 text-sky-200 rounded-bl-none'
                  }`}
                >
                  {isAuthority && msg.originalText ? msg.originalText : msg.chatText}
                </div>
                {isAuthority && msg.originalText && (
                  <p className="mt-1 max-w-[85%] text-[10px] leading-4 text-ink-soft">Delivered in {languageLabel(msg.chatLanguage)}: {msg.chatText}</p>
                )}
                {!isAuthority && translations[msg.packetId] && (
                  <p className="mt-1 max-w-[85%] rounded bg-sky-500/10 px-2 py-1 text-[10px] leading-4 text-sky-200">English: {translations[msg.packetId]}</p>
                )}
                {!isAuthority && msg.chatText && !translations[msg.packetId] && (
                  <button type="button" onClick={() => void translateIncoming(msg)} disabled={translatingPacketId === msg.packetId}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-sky-300 underline disabled:opacity-50">
                    {translatingPacketId === msg.packetId ? <Loader2 className="size-3 animate-spin" /> : <Languages className="size-3" />} Translate to English
                  </button>
                )}
                <div className="mt-0.5 flex items-center gap-1 text-[9px] text-emerald-400/80 font-mono">
                  <CheckCircle2 className="size-2.5" />
                  <span>{msg.lastKnownTransport === 'INTERNET' ? 'Saved to command record' : 'Pending delivery'}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {translationError && <p role="alert" className="mt-2 text-xs text-rose-300">{translationError}</p>}

      {/* Authority Response Form */}
      <form onSubmit={handleSendResponse} className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-soft">
          <label className="flex items-center gap-1.5"><Languages className="size-3.5 text-sky-400" /> Officer writes in
            <select value={outgoingLanguage} onChange={(event) => setOutgoingLanguage(event.target.value)} className="rounded border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink">
              {COMMUNICATION_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
            </select>
          </label>
          <span>{outgoingLanguage === touristLanguage ? 'Sent as written' : `Translated to ${languageLabel(touristLanguage)} before transmission`}</span>
        </div>
        <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Type official instructions to ${touristName}...`}
          className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink placeholder-ink-soft focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} {outgoingLanguage === touristLanguage ? 'Transmit response' : 'Translate & transmit'}
        </button>
        </div>
      </form>
    </div>
  );
}
