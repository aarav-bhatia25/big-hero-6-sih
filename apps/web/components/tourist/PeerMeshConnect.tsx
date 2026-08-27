'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Link as LinkIcon, ShieldCheck, Radio, CheckCircle2, AlertCircle } from 'lucide-react';
import { globalWebRtcTransport, PeerMeshInfo } from '@/lib/sos-mesh/transports/webRtcTransport';

export default function PeerMeshConnect() {
  const [peers, setPeers] = useState<PeerMeshInfo[]>([]);
  const [mode, setMode] = useState<'IDLE' | 'HOST' | 'JOIN'>('IDLE');
  const [offerCode, setOfferCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [offerInput, setOfferInput] = useState('');
  const [answerOutput, setAnswerOutput] = useState('');
  const [activePeerId, setActivePeerId] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const unsub = globalWebRtcTransport.subscribePeers((updated: PeerMeshInfo[]) => {
      setPeers(updated);
    });
    return () => unsub();
  }, []);

  const handleStartHost = async () => {
    try {
      setMode('HOST');
      setStatusMsg('Generating WebRTC mesh pairing key…');
      const { offerSdp, peerId } = await globalWebRtcTransport.createOffer();
      setOfferCode(offerSdp);
      setActivePeerId(peerId);

      const url = await QRCode.toDataURL(offerSdp, { margin: 2, width: 200, color: { dark: '#1d1c1a', light: '#ffffff' } });
      setQrDataUrl(url);
      setStatusMsg('Show this QR code or key to Device B to pair direct mesh.');
    } catch (err: any) {
      setStatusMsg(`Error creating offer: ${err.message}`);
    }
  };

  const handleCompleteHostHandshake = async () => {
    if (!answerInput.trim() || !activePeerId) return;
    try {
      const ok = await globalWebRtcTransport.completeHandshake(activePeerId, answerInput.trim());
      if (ok) {
        setStatusMsg('✓ Direct P2P WebRTC Mesh Connected!');
        setMode('IDLE');
      } else {
        setStatusMsg('⚠ Failed to complete handshake. Verify answer code.');
      }
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleJoinMesh = async () => {
    if (!offerInput.trim()) return;
    try {
      setStatusMsg('Processing Host offer key…');
      const { answerSdp, peerId } = await globalWebRtcTransport.acceptOffer(offerInput.trim());
      setAnswerOutput(answerSdp);
      setActivePeerId(peerId);
      setStatusMsg('Copy the answer key below back to Host Device A.');
    } catch (err: any) {
      setStatusMsg(`Invalid offer code: ${err.message}`);
    }
  };

  const connectedCount = peers.filter((p) => p.status === 'CONNECTED').length;

  return (
    <div className="minimal-card p-4 space-y-3 text-ink text-left">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${connectedCount > 0 ? 'text-emerald-600 animate-pulse' : 'text-amber-600'}`} />
          <h3 className="font-semibold text-xs tracking-tight text-ink">Side-by-Side Direct Mesh</h3>
        </div>
        <div className="nb-chip nb-chip-accent text-[10px] py-0.5 px-2">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Nostr Zero-Trust</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs bg-surface-2 p-2.5 rounded-lg border border-border">
        <span className="text-ink-soft">Connected Direct Peers:</span>
        <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${connectedCount > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-surface text-ink-soft border border-border'}`}>
          {connectedCount} Device{connectedCount === 1 ? '' : 's'} Active
        </span>
      </div>

      {mode === 'IDLE' && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleStartHost}
            className="minimal-button minimal-button-primary text-xs w-full"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Host Mesh (Device A)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('JOIN')}
            className="minimal-button minimal-button-secondary text-xs w-full"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Join Mesh (Device B)</span>
          </button>
        </div>
      )}

      {mode === 'HOST' && (
        <div className="space-y-3 text-xs pt-1">
          <p className="text-ink font-medium">{statusMsg}</p>
          {qrDataUrl && (
            <div className="flex justify-center bg-white p-2 border border-border rounded-lg max-w-[180px] mx-auto">
              <img src={qrDataUrl} alt="Mesh Pairing QR Code" className="w-full h-auto" />
            </div>
          )}
          <div>
            <label className="block minimal-eyebrow mb-1">Host Offer Key (Device A):</label>
            <textarea
              readOnly
              value={offerCode}
              className="nb-input font-mono text-[10px] h-12 select-all"
            />
          </div>

          <div>
            <label className="block minimal-eyebrow mb-1">Paste Answer Key from Device B:</label>
            <input
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Paste Answer SDP key..."
              className="nb-input font-mono text-xs"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCompleteHostHandshake}
              className="minimal-button minimal-button-primary text-xs flex-1"
            >
              Complete P2P Link
            </button>
            <button
              type="button"
              onClick={() => setMode('IDLE')}
              className="minimal-button minimal-button-secondary text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'JOIN' && (
        <div className="space-y-3 text-xs pt-1">
          <p className="text-ink font-medium">{statusMsg}</p>
          <div>
            <label className="block minimal-eyebrow mb-1">Paste Host Offer Key (from Device A):</label>
            <textarea
              value={offerInput}
              onChange={(e) => setOfferInput(e.target.value)}
              placeholder="Paste Device A offer key..."
              className="nb-input font-mono text-[10px] h-14"
            />
          </div>

          <button
            type="button"
            onClick={handleJoinMesh}
            className="minimal-button minimal-button-primary text-xs w-full"
          >
            Generate Join Key
          </button>

          {answerOutput && (
            <div>
              <label className="block minimal-eyebrow mb-1">Copy this Answer Key back to Device A:</label>
              <textarea
                readOnly
                value={answerOutput}
                className="nb-input font-mono text-[10px] h-12 text-emerald-700 select-all"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode('IDLE')}
            className="minimal-button minimal-button-secondary text-xs w-full"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
