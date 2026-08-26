'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, ShieldAlert, Wifi, WifiOff, CheckCircle2, Clock } from 'lucide-react';
import { createChatPacket, SOSPacket } from '@/lib/sos-mesh/sosPacket';
import { saveChatMessage, getChatMessagesForIncident } from '@/lib/sos-mesh/indexedDbQueue';

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
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

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

  // Load stored messages & setup mesh broadcast channel
  useEffect(() => {
    void (async () => {
      const stored = await getChatMessagesForIncident(incidentId);
      setMessages(stored);
    })();

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('prahari_chat_mesh');
        broadcastChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data?.type === 'EMERGENCY_CHAT_MESSAGE' && event.data.packet) {
            const incoming: SOSPacket = event.data.packet;
            if (incoming.incidentId === incidentId) {
              void saveChatMessage(incoming);
              setMessages((prev) => {
                if (prev.some((m) => m.packetId === incoming.packetId)) return prev;
                return [...prev, incoming].sort((a, b) => a.timestamp - b.timestamp);
              });
            }
          }
        };
      } catch (e) {
        console.warn('[OfflineEmergencyChat] BroadcastChannel error:', e);
      }
    }

    // Server Sync Poller
    const syncInterval = window.setInterval(async () => {
      try {
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
        // Offline poller error ignored
      }
    }, 4000);

    return () => {
      window.clearInterval(syncInterval);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [incidentId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const packet = createChatPacket({
      incidentId,
      touristId,
      senderRole: 'tourist',
      senderName: touristName,
      text: text.trim(),
      latitude,
      longitude,
    });

    // 1. Save local IndexedDB
    await saveChatMessage(packet);
    setMessages((prev) => [...prev, packet]);
    setText('');

    // 2. Broadcast over local P2P Mesh
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'EMERGENCY_CHAT_MESSAGE',
        packet,
      });
    }

    // 3. Post to Gateway API endpoint
    try {
      await fetch('/api/chat-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packet }),
      });
    } catch {
      // Offline fallback: saved in IndexedDB
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4 text-ink">
      <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
          <MessageSquare className="size-4 text-sky-400" /> Emergency Two-Way Mesh Chat
        </h3>
        <span className="flex items-center gap-1 rounded-full bg-surface border border-line px-2.5 py-0.5 font-mono text-xs font-medium text-sky-300">
          {isOnline ? <Wifi className="size-3 text-emerald-400" /> : <WifiOff className="size-3 text-amber-400" />}
          {isOnline ? 'Direct Gateway' : 'Mesh Relay Active'}
        </span>
      </div>

      {/* Message History Container */}
      <div className="max-h-56 min-h-[120px] overflow-y-auto rounded-lg border border-line bg-surface p-3 space-y-2.5">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-soft">
            No messages sent yet. Send a message to communicate with Police Command even without internet.
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
                      ? 'bg-sky-600 text-white rounded-br-none'
                      : 'bg-surface-2 border border-emerald-500/40 text-emerald-200 rounded-bl-none font-medium'
                  }`}
                >
                  {msg.chatText}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[9px] text-sky-300/70 font-mono">
                  <CheckCircle2 className="size-2.5 text-emerald-400" />
                  <span>{msg.lastKnownTransport || 'MESH_RELAY'}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2">
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
      </form>
    </div>
  );
}
