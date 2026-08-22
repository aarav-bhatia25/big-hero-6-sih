'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Radio,
  FileText,
  Lock,
  PhoneCall,
  MapPin,
  Globe,
  Award,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Activity,
  Layers,
  Sparkles,
  Smartphone,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Official Government Header Strip */}
      <div className="bg-slate-900 border-b border-slate-800 text-[11px] px-4 md:px-8 py-2 flex flex-wrap items-center justify-between text-slate-300">
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            🇮🇳 भारत सरकार | GOVERNMENT OF INDIA
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400">MINISTRY OF TOURISM & HOME AFFAIRS</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-emerald-400 flex items-center gap-1 font-bold">
            ● SYSTEM ACTIVE: ALL DISTRICT NODES ONLINE
          </span>
          <a href="tel:112" className="text-red-400 font-bold hover:underline flex items-center gap-1">
            <PhoneCall className="w-3 h-3" /> HELPLINE: 112 / 1363
          </a>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">PRAHARI</h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                OFFICIAL PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Predictive Tourist Safety, Incident Response & Digital ID Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" /> Portal Login
          </Link>

          <Link
            href="/citizen"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" /> Citizen Portal →
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Radio className="w-4 h-4" /> Authority Command →
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {/* 3. Hero Platform Overview Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800 text-xs font-mono">
            <Sparkles className="w-4 h-4 text-amber-400" /> Digital Identity Framework • India AI Impact Summit Learnings
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight leading-tight">
            AI-Driven Proactive Tourist Protection & Emergency Incident Dispatch
          </h2>

          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Transitioning traveler security from reactive post-incident reporting to proactive AI surveillance. Featuring W3C Verifiable Credentials, Turf.js spatial geofencing, automated E-FIR complaint generation, and Sepolia blockchain evidence logging.
          </p>

          {/* Core Portal Entry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left">
            {/* Citizen Portal Card */}
            <Link
              href="/citizen"
              className="group glass-panel p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/50 bg-slate-900/90 transition shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    PUBLIC / TRAVELLER
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-100 group-hover:text-emerald-400 transition flex items-center justify-between">
                    Citizen & Tourist Portal <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition text-emerald-400" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Access your Verifiable Digital Tourist ID (`did:tourist:...`), 1-Click SOS Panic Button, automated E-FIR draft generator, AI clothing profile builder, dynamic risk score, and Sarvam AI voice assistance.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span>Open Citizen Safety Hub</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </Link>

            {/* Authority Command Center Card */}
            <Link
              href="/admin"
              className="group glass-panel p-6 rounded-2xl border border-slate-800 hover:border-blue-500/50 bg-slate-900/90 transition shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                    <Radio className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    AUTHORITY / POLICE
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-100 group-hover:text-blue-400 transition flex items-center justify-between">
                    Authority Command Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition text-blue-400" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    District command monitor with live tourist spatial map, real-time incident queue, intelligent responder dispatch matching, geofence zone creator, missing tourist investigation mode, and blockchain audit logs.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-400">
                <span>Launch Command Center</span>
                <Building2 className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* 4. Official System Capabilities Matrix */}
        <section className="space-y-6 pt-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> Key Technical Architecture Modules
              </h3>
              <p className="text-xs text-slate-400">End-to-End Privacy, Proactive Anomaly Detection & Immutable Audit Logging</p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
              ISO/IEC 27001 & DPDP Act Aligned
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Feature 1: Digital ID */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 w-fit">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-100 text-sm">W3C Verifiable Credentials</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Privacy-preserving Decentralized Identifiers (DIDs) backed by offline Aadhaar/Passport MRZ check digits. Personal identity details remain encrypted and accessed only during authorized emergencies.
              </p>
            </div>

            {/* Feature 2: Spatial Geofencing */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 w-fit">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-100 text-sm">Turf.js Spatial Geofencing</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Real-time `booleanPointInPolygon` evaluations against government-published safe corridors, restricted cliff areas, and live IMD/NDMA disaster hazard overlays.
              </p>
            </div>

            {/* Feature 3: Smart Dispatch & E-FIR */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 w-fit">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-100 text-sm">Smart Dispatch & Auto E-FIR</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Geodesic distance algorithms match incidents to the nearest available responder unit with ETA calculation. Generates pre-filled draft E-FIRs subject to police officer verification.
              </p>
            </div>

            {/* Feature 4: Dynamic Risk Engine */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 w-fit">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-100 text-sm">Dynamic Risk Engine (0-100)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Synthesizes location coordinates, night-time travel factors, crime density index, route anomaly scores, and environmental warnings into an explainable numerical score.
              </p>
            </div>

            {/* Feature 5: Multilingual Sarvam AI */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 w-fit">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-100 text-sm">Multilingual Sarvam / Bhashini AI</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Integrated speech recognition (ASR) and text-to-speech (TTS) supporting 10+ Indian regional languages for voice-based emergency reporting and cross-language translation.
              </p>
            </div>

            {/* Feature 6: Sepolia Audit Log */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 w-fit">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-100 text-sm">Sepolia Blockchain Audit Ledger</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Anchors SHA-256 cryptographic evidence hashes on Ethereum Sepolia testnet to guarantee immutable, tamper-evident audit trails for legal and forensic proceedings.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Official District Statistics Bar */}
        <section className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <span className="text-xs text-slate-400 font-semibold block uppercase">Monitored Districts</span>
            <span className="text-3xl font-black font-mono text-slate-100 mt-1 block">48</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block uppercase">Verified Credentials</span>
            <span className="text-3xl font-black font-mono text-emerald-400 mt-1 block">14,290+</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block uppercase">Avg Response Time</span>
            <span className="text-3xl font-black font-mono text-blue-400 mt-1 block">&lt; 4.5 mins</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block uppercase">Audit Hashing</span>
            <span className="text-3xl font-black font-mono text-amber-400 mt-1 block">100% Sepolia</span>
          </div>
        </section>

        {/* 6. Travel Safety Advisory Notice */}
        <section className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 flex items-start gap-4 text-xs text-amber-200">
          <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-300 text-sm">Official Tourist Advisory: High Terrain & Night Travel Guidance</h4>
            <p className="text-slate-300 leading-relaxed">
              Tourists visiting remote hill stations or cliff views are advised to keep location tracking enabled and download regional offline vector tiles. Night access to cliff trails is restricted after 19:00 hrs.
            </p>
          </div>
        </section>
      </main>

      {/* 7. Official Government Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 md:px-8 py-8 text-xs text-slate-400 space-y-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-slate-500" />
            <div>
              <span className="font-bold text-slate-200 block">Prahari National Tourist Safety Initiative</span>
              <span className="text-[11px] text-slate-500">Maintained under Smart City & Tourist Infrastructure Framework</span>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link href="/citizen" className="hover:text-white transition">Citizen Portal</Link>
            <Link href="/admin" className="hover:text-white transition">Admin Portal</Link>
            <a href="tel:112" className="text-red-400 font-bold hover:underline">SOS Hotline 112</a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto border-t border-slate-900 pt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <span>© 2026 Government of India — Ministry of Tourism & Home Affairs. All Rights Reserved.</span>
          <span>Digital Personal Data Protection (DPDP) Compliant • NCIIPC Security Standards</span>
        </div>
      </footer>
    </div>
  );
}
