'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, QrCode, UserCheck, Sparkles } from 'lucide-react';
import { generateDigitalIdQr, MOCK_DEMO_TOURIST } from '@/lib/services/digitalId';

export default function DigitalIdCard() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQr, setShowQr] = useState<boolean>(false);

  useEffect(() => {
    generateDigitalIdQr(MOCK_DEMO_TOURIST.did)
      .then(setQrCodeUrl)
      .catch(console.error);
  }, []);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 bg-slate-900/80 shadow-xl relative overflow-hidden text-slate-100">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-lg">Digital Tourist ID</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <UserCheck className="w-3 h-3" /> VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{MOCK_DEMO_TOURIST.did}</p>
          </div>
        </div>
        <button
          onClick={() => setShowQr(!showQr)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          {showQr ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      {showQr ? (
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl my-3 text-slate-900 shadow-inner">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="Digital Tourist ID QR Code" className="w-48 h-48 object-contain" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-sm">Generating QR...</div>
          )}
          <p className="text-xs font-mono text-slate-600 mt-2 font-semibold text-center">
            {MOCK_DEMO_TOURIST.did}
          </p>
          <p className="text-[11px] text-slate-500 text-center mt-1">
            Authorized safety officers scan this QR code for instant identity verification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold mb-1">Tourist Name</span>
            <span className="font-semibold text-slate-200">{MOCK_DEMO_TOURIST.name}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold mb-1">ID Number</span>
            <span className="font-mono font-semibold text-emerald-400">{MOCK_DEMO_TOURIST.touristId}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold mb-1">Nationality</span>
            <span className="font-semibold text-slate-200">{MOCK_DEMO_TOURIST.nationality}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold mb-1">Verification</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Mock Credential Pass
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
