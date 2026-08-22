'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, QrCode, UserCheck } from 'lucide-react';
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
    <div className="bg-white rounded-md p-5 border border-[#D8D2C4] text-[#14213D] font-sans relative">
      {/* Top Printed Form Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#D8D2C4] pb-3.5 mb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#14213D] text-white rounded">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-[#14213D] text-lg tracking-tight">Digital Tourist Identity Permit</h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-[#1B5E3C] border border-[#1B5E3C]/30 flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> VERIFIED CREDENTIAL
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-0.5">REF ID: {MOCK_DEMO_TOURIST.did}</p>
          </div>
        </div>

        <button
          onClick={() => setShowQr(!showQr)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14213D] hover:bg-[#1C2D52] text-white rounded text-xs font-bold transition cursor-pointer border border-[#14213D]"
        >
          <QrCode className="w-4 h-4" />
          {showQr ? 'Hide Official QR' : 'Show Official QR'}
        </button>
      </div>

      {showQr ? (
        <div className="flex flex-col items-center justify-center p-4 bg-[#F7F5F0] rounded border border-[#D8D2C4] my-2 text-[#14213D]">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="Digital Tourist ID QR Code" className="w-44 h-44 object-contain mix-blend-multiply" />
          ) : (
            <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">Generating QR...</div>
          )}
          <p className="text-xs font-mono text-[#14213D] mt-2 font-bold text-center tracking-wider">
            {MOCK_DEMO_TOURIST.did}
          </p>
          <p className="text-[11px] text-slate-600 text-center mt-1 max-w-sm">
            Official W3C Verifiable Credential. Authorized law enforcement & emergency personnel scan this code for identity verification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#F7F5F0] p-3 rounded border border-[#D8D2C4]">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-bold mb-0.5">PERMIT HOLDER</span>
            <span className="font-serif font-bold text-[#14213D] text-sm">{MOCK_DEMO_TOURIST.name}</span>
          </div>

          <div className="bg-[#F7F5F0] p-3 rounded border border-[#D8D2C4]">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-bold mb-0.5">TOURIST SERIAL NO.</span>
            <span className="font-mono font-bold text-[#14213D] text-sm">{MOCK_DEMO_TOURIST.touristId}</span>
          </div>

          <div className="bg-[#F7F5F0] p-3 rounded border border-[#D8D2C4]">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-bold mb-0.5">NATIONALITY / ORIGIN</span>
            <span className="font-bold text-[#14213D] text-sm">{MOCK_DEMO_TOURIST.nationality}</span>
          </div>

          <div className="bg-[#F7F5F0] p-3 rounded border border-[#D8D2C4]">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-bold mb-0.5">KYC STATUS</span>
            <span className="font-bold text-[#1B5E3C] text-sm flex items-center gap-1">
              ✓ Aadhaar / Passport Checked
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
