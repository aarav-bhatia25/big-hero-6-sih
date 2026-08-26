'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Shield, CheckCircle2 } from 'lucide-react';
import { createChatPacket, SOSPacket } from '@/lib/sos-mesh/sosPacket';

interface AuthorityEmergencyChatProps {
  incidentId: string;
  touristName?: string;
}

export default function AuthorityEmergencyChat({ incidentId, touristName = 'Traveller' }: AuthorityEmergencyChatProps) {
  const [messages, setMessages] = useState<SOSPacket[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Load chat transcript & setup broadcast listener
  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const res = await fetch(`/api/chat-relay?incidentId=${encodeURIComponent(incidentId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.messages)) {
            setMessages((prev) => {
              const map = new Map<string, SOSPacket>();
              for (const m of prev) map.set(m.packetId, m);
              for (const m of data.messages) map.set(m.packetId, m);
              return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
            });
          }
        }
      } catch (e) {
        console.warn('[AuthorityEmergencyChat] Fetch transcript error:', e);
      }
    };

    void fetchTranscript();
    // Polling timer disabled for manual Bluetooth hardware testing
    // const interval = window.setInterval(fetchTranscript, 3000);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('prahari_chat_mesh');
        broadcastChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data?.type === 'EMERGENCY_CHAT_MESSAGE' && event.data.packet) {
            const incoming: SOSPacket = event.data.packet;
            if (incoming.incidentId === incidentId) {
              setMessages((prev) => {
                if (prev.some((m) => m.packetId === incoming.packetId)) return prev;
                return [...prev, incoming].sort((a, b) => a.timestamp - b.timestamp);
              });
            }
          }
        };
      } catch (e) {
        console.warn('[AuthorityEmergencyChat] BroadcastChannel error:', e);
      }
    }

    return () => {
      // window.clearInterval(interval);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [incidentId]);



  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    try {
      setSending(true);
      const packet = createChatPacket({
        incidentId,
        touristId: 'POLICE-HQ',
        senderRole: 'authority',
        senderName: 'Police Command HQ',
        text: text.trim(),
      });

      // 1. Post to Gateway API
      const res = await fetch('/api/chat-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packet }),
      });

      if (res.ok) {
        setMessages((prev) => [...prev, packet]);
        setText('');

        // 2. Broadcast over local mesh (Disabled for direct Web Bluetooth testing)
        /*
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'EMERGENCY_CHAT_MESSAGE',
            packet,
          });
        }
        */
      }
    } catch (err: any) {
      window.alert(err.message || 'Failed to dispatch chat response.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-line bg-surface p-4 text-ink">
      <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
          <Shield className="size-4 text-emerald-400" /> Police Authority Emergency Communications Console
        </h3>
        <span className="font-mono text-xs text-ink-soft">Direct Mesh Bridge • {incidentId}</span>
      </div>

      {/* Transcript List */}
      <div className="max-h-56 min-h-[120px] overflow-y-auto rounded-lg border border-line bg-surface-2 p-3 space-y-2.5">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-soft">
            No messages exchanged yet with {touristName}. Type a response below to transmit via mesh relay.
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
                  {msg.chatText}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[9px] text-emerald-400/80 font-mono">
                  <CheckCircle2 className="size-2.5" />
                  <span>Mesh Hop: {msg.hopCount} ({msg.lastKnownTransport || 'RELAY'})</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Authority Response Form */}
      <form onSubmit={handleSendResponse} className="mt-3 flex items-center gap-2">
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
          <Send className="size-3.5" /> Transmit Response
        </button>
      </form>
    </div>
  );
}
