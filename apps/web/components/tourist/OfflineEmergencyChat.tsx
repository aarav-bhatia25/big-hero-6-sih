'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Languages, MessageSquare, Send, Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import { createChatPacket, SOSPacket } from '@/lib/sos-mesh/sosPacket';
import { saveChatMessage, getChatMessagesForIncident } from '@/lib/sos-mesh/indexedDbQueue';
import { COMMUNICATION_LANGUAGES, languageLabel } from '@/lib/languages';

interface OfflineEmergencyChatProps {
  incidentId: string;
  touristId: string;
  touristName?: string;
  latitude?: number;
  longitude?: number;
}

export default function OfflineEmergencyChat({
  incidentId,
  touristId,
  touristName = 'Tourist',
  latitude,
  longitude,
}: OfflineEmergencyChatProps) {
  const [messages, setMessages] = useState<SOSPacket[]>([]);
  const [text, setText] = useState('');
  const [messageLanguage, setMessageLanguage] = useState('en-IN');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Monitor network status
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load locally retained messages. The server transcript is fetched separately
  // when online; local messages remain visibly pending until that succeeds.
  useEffect(() => {
    void (async () => {
      const stored = await getChatMessagesForIncident(incidentId);
      setMessages(stored);
    })();

    let syncing = false;
    const sync = async () => {
      if (syncing || !navigator.onLine) return;
      syncing = true;
      try {
        const locallyQueued = await getChatMessagesForIncident(incidentId);
        for (const packet of locallyQueued.filter((message) => message.senderRole === 'tourist' && message.lastKnownTransport !== 'INTERNET')) {
          const delivery = await fetch('/api/chat-relay', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packet }),
          }).catch(() => null);
          const delivered = delivery ? await delivery.json().catch(() => null) : null;
          if (delivery?.ok && delivered?.success && delivered.packet) void saveChatMessage(delivered.packet);
        }
        const res = await fetch(`/api/chat-relay?incidentId=${encodeURIComponent(incidentId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              void saveChatMessage(msg);
            }
            setMessages((prev) => {
              const combinedMap = new Map<string, SOSPacket>();
              for (const m of prev) combinedMap.set(m.packetId, m);
              for (const m of data.messages) combinedMap.set(m.packetId, m);
              return Array.from(combinedMap.values()).sort((a, b) => a.timestamp - b.timestamp);
            });
          }
        }
      } catch {
        // The locally retained message remains pending for the next connection.
      } finally {
        syncing = false;
      }
    };

    void sync();
    const syncInterval = window.setInterval(() => void sync(), 4_000);

    return () => {
      window.clearInterval(syncInterval);
    };
  }, [incidentId]);



  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const packet = createChatPacket({
      incidentId,
      touristId,
      senderRole: 'tourist',
      senderName: touristName,
      text: text.trim(),
      language: messageLanguage,
      latitude,
      longitude,
    });

    // Persist first; a failed delivery remains locally queued for a later
    // authenticated connection.
    await saveChatMessage(packet);
    setMessages((prev) => [...prev, packet]);
    setText('');

    try {
      const response = await fetch('/api/chat-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packet }),
      });
      const delivered = await response.json().catch(() => null);
      if (response.ok && delivered?.success && delivered.packet) {
        await saveChatMessage(delivered.packet);
        setMessages((current) => current.map((message) => message.packetId === packet.packetId ? delivered.packet : message));
      }
    } catch {
      // Retained locally and retried by the online sync loop.
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4 text-ink">
      <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
          <MessageSquare className="size-4 text-sky-400" /> Emergency messages
        </h3>
        <span className="flex items-center gap-1 rounded-full bg-surface border border-line px-2.5 py-0.5 font-mono text-xs font-medium text-sky-300">
          {isOnline ? <Wifi className="size-3 text-emerald-400" /> : <WifiOff className="size-3 text-amber-400" />}
          {isOnline ? 'Connected to command server' : 'Stored locally — awaiting connection'}
        </span>
      </div>

      {/* Message History Container */}
      <div className="max-h-56 min-h-[120px] overflow-y-auto rounded-lg border border-line bg-surface p-3 space-y-2.5">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-soft">
            No messages sent yet. Online messages are delivered to the authorised command team; offline messages stay on this device until it reconnects.
          </p>
        ) : (
          messages.map((msg) => {
            const isTourist = msg.senderRole === 'tourist';
            return (
              <div
                key={msg.packetId}
                className={`flex flex-col ${isTourist ? 'items-end' : 'items-start'}`}
              >
                <div className="mb-0.5 flex items-center gap-1.5 text-[10px] text-ink-soft">
                  <span className="font-semibold text-ink">{msg.senderName || (isTourist ? 'You' : 'Police HQ')}</span>
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    isTourist
                      ? 'bg-sky-700 text-white rounded-br-none font-medium shadow-sm'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-bl-none font-medium shadow-sm'
                  }`}
                >
                  {msg.chatText}
                </div>
                {msg.senderRole === 'authority' && msg.originalText && (
                  <p className="mt-1 max-w-[85%] text-[10px] leading-4 text-ink-soft">Official original ({languageLabel(msg.originalLanguage)}): {msg.originalText}</p>
                )}
                <div className="mt-0.5 flex items-center gap-1 text-[9px] text-emerald-700 font-mono">
                  <CheckCircle2 className="size-2.5 text-emerald-600" />
                  <span>{msg.lastKnownTransport === 'INTERNET' ? 'Sent to authority queue' : 'Stored locally — pending delivery'}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="mt-3 space-y-2">
        <label className="flex items-center gap-1.5 text-[11px] text-ink-soft"><Languages className="size-3.5 text-sky-400" /> I&apos;m writing in
          <select value={messageLanguage} onChange={(event) => setMessageLanguage(event.target.value)} className="rounded border border-line bg-surface px-2 py-1 text-[11px] text-ink">
            {COMMUNICATION_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type emergency message to Police HQ..."
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder-ink-soft focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
        >
          <Send className="size-3.5" /> Send
        </button>
        </div>
      </form>
    </div>
  );
}
