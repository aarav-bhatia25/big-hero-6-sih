'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Wifi, QrCode, Link as LinkIcon, CheckCircle2, ShieldCheck, Radio, AlertCircle } from 'lucide-react';
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
    const unsub = globalWebRtcTransport.subscribePeers((updated) => {
      setPeers(updated);
    });
    return () => unsub();
  }, []);

  const handleStartHost = async () => {
    try {
      setMode('HOST');
      setStatusMsg('Generating WebRTC mesh pairing key...');
      const { offerSdp, peerId } = await globalWebRtcTransport.createOffer();
      setOfferCode(offerSdp);
      setActivePeerId(peerId);

      const url = await QRCode.toDataURL(offerSdp, { margin: 2, width: 220 });
      setQrDataUrl(url);
      setStatusMsg('Show this QR or code to Device B to pair direct mesh.');
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
      setStatusMsg('Processing Host offer key...');
      const { answerSdp, peerId } = await globalWebRtcTransport.acceptOffer(offerInput.trim());
      setAnswerOutput(answerSdp);
      setActivePeerId(peerId);
      setStatusMsg('Copy the answer code below back to Host Device A.');
    } catch (err: any) {
      setStatusMsg(`Invalid offer code: ${err.message}`);
    }
  };

  const connectedCount = peers.filter((p) => p.status === 'CONNECTED').length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-slate-100 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Radio className={`w-5 h-5 ${connectedCount > 0 ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
          <h3 className="font-semibold text-sm tracking-wide">Direct Side-by-Side Mesh</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-slate-800/80 px-2.5 py-1 rounded-full text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Nostr Zero-Trust Verified</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
        <span className="text-slate-400">Connected Direct Peers:</span>
        <span className={`font-mono font-bold px-2 py-0.5 rounded ${connectedCount > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
          {connectedCount} Device{connectedCount === 1 ? '' : 's'} Active
        </span>
      </div>

      {mode === 'IDLE' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            onClick={handleStartHost}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
          >
            <QrCode className="w-4 h-4" />
            <span>Host Mesh (Device A)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('JOIN')}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Join Mesh (Device B)</span>
          </button>
        </div>
      )}

      {mode === 'HOST' && (
        <div className="space-y-3 mt-2 text-xs">
          <p className="text-slate-300 font-medium">{statusMsg}</p>
          {qrDataUrl && (
            <div className="flex justify-center bg-white p-2 rounded-lg max-w-[180px] mx-auto">
              <img src={qrDataUrl} alt="Mesh Pairing QR Code" className="w-full h-auto" />
            </div>
          )}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Host Offer Pairing Key (Device A):</label>
            <textarea
              readOnly
              value={offerCode}
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-[10px] text-slate-300 select-all"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Paste Answer Key from Device B:</label>
            <input
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Paste Answer SDP key..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCompleteHostHandshake}
              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs transition"
            >
              Complete P2P Link
            </button>
            <button
              type="button"
              onClick={() => setMode('IDLE')}
              className="py-1.5 px-3 bg-slate-800 text-slate-400 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'JOIN' && (
        <div className="space-y-3 mt-2 text-xs">
          <p className="text-slate-300 font-medium">{statusMsg}</p>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Paste Host Offer Key (from Device A):</label>
            <textarea
              value={offerInput}
              onChange={(e) => setOfferInput(e.target.value)}
              placeholder="Paste Device A offer key..."
              className="w-full h-14 bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-[10px] text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={handleJoinMesh}
            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-xs transition"
          >
            Generate Join Key
          </button>

          {answerOutput && (
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Copy this Answer Key back to Device A:</label>
              <textarea
                readOnly
                value={answerOutput}
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-[10px] text-emerald-400 select-all"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode('IDLE')}
            className="w-full py-1 bg-slate-800 text-slate-400 rounded text-xs"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
