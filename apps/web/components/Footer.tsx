'use client';

import Link from 'next/link';
import {
  ShieldCheck,
  PhoneCall,
  Wifi,
  Radio,
  MapPin,
  Lock,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="landing-footer-wrapper">
      <div className="landing-footer-container">
        {/* Top Brand Banner Card */}
        <div className="landing-footer-brand-card">
          <div className="landing-footer-brand-info">
            <div className="landing-footer-logo-row">
              <div className="landing-footer-logo-icon">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>
              <span className="landing-footer-brand-name">Prahari</span>
              <span className="landing-footer-badge">Safety Protocol</span>
            </div>
            <p className="landing-footer-tagline">
              Empowering safe travel through digital verified identity, privacy-first location telemetry, and resilient peer-mesh emergency dispatch.
            </p>
          </div>

          <div className="landing-footer-emergency-box">
            <div className="landing-footer-status-header">
              <div className="landing-footer-status-dot">
                <span className="ping-dot"></span>
                <span className="solid-dot"></span>
              </div>
              <span className="landing-footer-status-text">SOS Dispatch Operational</span>
            </div>
            <a href="tel:112" className="landing-footer-emergency-btn">
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>Emergency Services 112</span>
            </a>
          </div>
        </div>

        {/* Main Links Grid */}
        <div className="landing-footer-grid">
          {/* Col 1: Traveller Solutions */}
          <div className="landing-footer-col">
            <h3 className="landing-footer-col-title">
              <MapPin className="w-4 h-4 text-sky-400 inline-block mr-1.5" />
              For Travellers
            </h3>
            <ul className="landing-footer-links">
              <li>
                <Link href="/onboarding" className="landing-footer-link">
                  Create Tourist ID <ArrowUpRight className="w-3.5 h-3.5 link-arrow" />
                </Link>
              </li>
              <li>
                <Link href={"/login?role=tourist" as any} className="landing-footer-link">
                  Traveller Portal Sign In
                </Link>
              </li>
              <li>
                <Link href="/tourist" className="landing-footer-link">
                  Safety Dashboard
                </Link>
              </li>
              <li>
                <Link href="/sos" className="landing-footer-link">
                  Emergency SOS Trigger
                </Link>
              </li>
              <li>
                <Link href="/citizen" className="landing-footer-link">
                  Verify Credentials
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Authority & Responders */}
          <div className="landing-footer-col">
            <h3 className="landing-footer-col-title">
              <Radio className="w-4 h-4 text-amber-400 inline-block mr-1.5" />
              For Authorities
            </h3>
            <ul className="landing-footer-links">
              <li>
                <Link href="/authority" className="landing-footer-link">
                  Operations Desk <ArrowUpRight className="w-3.5 h-3.5 link-arrow" />
                </Link>
              </li>
              <li>
                <Link href={"/login?role=staff" as any} className="landing-footer-link">
                  Responder Sign In
                </Link>
              </li>
              <li>
                <Link href="/authority" className="landing-footer-link">
                  Live Incidents & Feed
                </Link>
              </li>
              <li>
                <Link href="/authority" className="landing-footer-link">
                  Active Geofences
                </Link>
              </li>
              <li>
                <Link href="/authority" className="landing-footer-link">
                  Rapid Dispatch Desk
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Mesh Tech & Resilience */}
          <div className="landing-footer-col">
            <h3 className="landing-footer-col-title">
              <Wifi className="w-4 h-4 text-emerald-400 inline-block mr-1.5" />
              Resilient Mesh Tech
            </h3>
            <ul className="landing-footer-links">
              <li>
                <span className="landing-footer-feature-item">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Peer-to-Peer WebRTC SOS</span>
                </span>
              </li>
              <li>
                <span className="landing-footer-feature-item">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Offline Relay Protocol</span>
                </span>
              </li>
              <li>
                <span className="landing-footer-feature-item">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Zero-Knowledge Identity</span>
                </span>
              </li>
              <li>
                <span className="landing-footer-feature-item">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Encrypted SOS Telemetry</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Col 4: Security & Trust */}
          <div className="landing-footer-col">
            <h3 className="landing-footer-col-title">
              <Lock className="w-4 h-4 text-purple-400 inline-block mr-1.5" />
              Security & Privacy
            </h3>
            <p className="landing-footer-text-sm">
              Designed with strict privacy safeguards. Location data remains client-side and is only relayed to authorized law enforcement upon active SOS activation.
            </p>
            <div className="landing-footer-trust-chips">
              <span className="trust-chip">
                <Zap className="w-3 h-3 text-amber-400" /> SIH 2026 Ready
              </span>
              <span className="trust-chip">
                <Activity className="w-3 h-3 text-sky-400" /> Active Protection
              </span>
            </div>
          </div>
        </div>

        {/* Bottom copyright & legal bar */}
        <div className="landing-footer-bottom">
          <div className="landing-footer-copy">
            © {new Date().getFullYear()} <strong>Prahari Safety Protocol</strong>. All rights reserved.
          </div>
          <div className="landing-footer-legal">
            <a href="#top" className="landing-footer-legal-link">Privacy Policy</a>
            <span className="dot-sep">•</span>
            <a href="#top" className="landing-footer-legal-link">Terms of Service</a>
            <span className="dot-sep">•</span>
            <a href="#top" className="landing-footer-legal-link">Security Overview</a>
            <span className="dot-sep">•</span>
            <a href="tel:112" className="landing-footer-legal-link text-amber-300 font-semibold">
              Helpline: 112
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
