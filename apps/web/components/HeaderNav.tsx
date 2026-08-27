'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  ShieldCheck, 
  Radio, 
  MapPin, 
  UserCheck, 
  Building2, 
  ArrowRight, 
  ChevronDown, 
  Sparkles,
  Info,
  LogIn,
  UserPlus
} from 'lucide-react';

export default function HeaderNav() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <nav className="landing-nav" aria-label="Main Navigation">
      <Link href="/" className="landing-brand">Prahari</Link>

      <div className="landing-nav-links">
        {/* HOME LINK WITH HOVER CARD */}
        <div 
          className="landing-nav-item"
          onMouseEnter={() => setActiveDropdown('home')}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <a href="#top" className={`landing-nav-link ${activeDropdown === 'home' ? 'is-active' : ''}`}>
            Home
            <ChevronDown size={14} className="nav-caret" />
          </a>

          <div className="nav-dropdown-menu nav-dropdown-home">
            <div className="nav-dropdown-header">
              <div className="nav-dropdown-title-row">
                <Sparkles size={16} className="nav-title-icon nav-title-icon-amber" />
                <span className="nav-dropdown-title">Prahari Platform Overview</span>
                <span className="nav-badge-pill">v2.0 Active</span>
              </div>
              <p className="nav-dropdown-sub">
                Integrated tourist protection, decentralized offline SOS mesh &amp; real-time emergency routing network.
              </p>
            </div>

            <div className="nav-dropdown-grid">
              <div className="nav-dropdown-card">
                <div className="nav-icon-wrapper nav-icon-amber">
                  <ShieldCheck size={18} />
                </div>
                <div className="nav-card-body">
                  <h4 className="nav-card-title">Digital Safety ID</h4>
                  <p className="nav-card-desc">
                    Self-sovereign, tamper-proof QR credentials synced with trusted emergency contacts.
                  </p>
                </div>
              </div>

              <div className="nav-dropdown-card">
                <div className="nav-icon-wrapper nav-icon-sky">
                  <Radio size={18} />
                </div>
                <div className="nav-card-body">
                  <h4 className="nav-card-title">Offline SOS Mesh</h4>
                  <p className="nav-card-desc">
                    Multi-hop WebRTC, Bluetooth &amp; acoustic relay networks operating without cellular signal.
                  </p>
                </div>
              </div>

              <div className="nav-dropdown-card">
                <div className="nav-icon-wrapper nav-icon-emerald">
                  <MapPin size={18} />
                </div>
                <div className="nav-card-body">
                  <h4 className="nav-card-title">Geofence &amp; Hazard Radar</h4>
                  <p className="nav-card-desc">
                    Live dynamic risk zone mapping, automatic safety warnings &amp; 112 responder dispatch.
                  </p>
                </div>
              </div>
            </div>

            <div className="nav-dropdown-footer">
              <a href="#top" className="nav-footer-link">
                <span>Explore full platform capabilities</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* WHO IT'S FOR LINK WITH HOVER CARD */}
        <div 
          className="landing-nav-item"
          onMouseEnter={() => setActiveDropdown('roles')}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <a href="#roles" className={`landing-nav-link ${activeDropdown === 'roles' ? 'is-active' : ''}`}>
            Who it&apos;s for
            <ChevronDown size={14} className="nav-caret" />
          </a>

          <div className="nav-dropdown-menu nav-dropdown-roles">
            <div className="nav-dropdown-header">
              <div className="nav-dropdown-title-row">
                <Info size={16} className="nav-title-icon nav-title-icon-sky" />
                <span className="nav-dropdown-title">Target Stakeholders &amp; User Roles</span>
              </div>
              <p className="nav-dropdown-sub">
                Designed for both individual travellers needing safety &amp; emergency authorities managing incidents.
              </p>
            </div>

            <div className="nav-roles-dual-grid">
              {/* FOR TRAVELLERS */}
              <div className="nav-role-box nav-role-traveller">
                <div className="nav-role-badge">
                  <UserCheck size={16} />
                  <span>For Travellers &amp; Tourists</span>
                </div>
                <ul className="nav-role-feature-list">
                  <li>
                    <span className="dot dot-amber"></span>
                    <span>1-Tap SOS distress trigger with offline mesh relay</span>
                  </li>
                  <li>
                    <span className="dot dot-amber"></span>
                    <span>Verifiable digital ID card for hotels &amp; checkpoints</span>
                  </li>
                  <li>
                    <span className="dot dot-amber"></span>
                    <span>Real-time safety route warnings &amp; geofence alerts</span>
                  </li>
                </ul>
                <Link href="/onboarding" className="nav-role-link nav-role-link-amber">
                  Create Tourist ID <ArrowRight size={14} />
                </Link>
              </div>

              {/* FOR AUTHORITIES */}
              <div className="nav-role-box nav-role-authority">
                <div className="nav-role-badge">
                  <Building2 size={16} />
                  <span>For Responders &amp; Staff</span>
                </div>
                <ul className="nav-role-feature-list">
                  <li>
                    <span className="dot dot-sky"></span>
                    <span>Live incident command desk &amp; acoustic beacon radar</span>
                  </li>
                  <li>
                    <span className="dot dot-sky"></span>
                    <span>Verified tourist credential scanner &amp; triage desk</span>
                  </li>
                  <li>
                    <span className="dot dot-sky"></span>
                    <span>Dynamic geofence creation &amp; high-risk area alerts</span>
                  </li>
                </ul>
                <Link href="/authority" className="nav-role-link nav-role-link-sky">
                  Open Authority Desk <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="nav-dropdown-footer">
              <a href="#roles" className="nav-footer-link">
                <span>View interactive role cards</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* SIGN IN LINK WITH HOVER CARD */}
        <div 
          className="landing-nav-item"
          onMouseEnter={() => setActiveDropdown('signin')}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <Link href="/login" className={`landing-nav-link ${activeDropdown === 'signin' ? 'is-active' : ''}`}>
            Sign in
            <ChevronDown size={14} className="nav-caret" />
          </Link>

          <div className="nav-dropdown-menu nav-dropdown-signin">
            <div className="nav-dropdown-header">
              <div className="nav-dropdown-title-row">
                <LogIn size={16} className="nav-title-icon nav-title-icon-emerald" />
                <span className="nav-dropdown-title">Select Access Portal</span>
              </div>
              <p className="nav-dropdown-sub">
                Choose your designated portal to sign in or register your identity.
              </p>
            </div>

            <div className="nav-signin-options">
              <Link href="/login?role=tourist" className="nav-signin-card">
                <div className="nav-signin-icon nav-icon-amber">
                  <UserCheck size={18} />
                </div>
                <div className="nav-signin-text">
                  <div className="nav-signin-title-wrap">
                    <span className="nav-signin-title">Traveller Portal</span>
                    <span className="nav-tag nav-tag-tourist">Tourist</span>
                  </div>
                  <p className="nav-signin-desc">
                    Digital safety ID, trusted contacts &amp; live trip status.
                  </p>
                </div>
                <ArrowRight size={15} className="nav-arrow-icon" />
              </Link>

              <Link href="/login?role=staff" className="nav-signin-card">
                <div className="nav-signin-icon nav-icon-sky">
                  <Building2 size={18} />
                </div>
                <div className="nav-signin-text">
                  <div className="nav-signin-title-wrap">
                    <span className="nav-signin-title">Authority &amp; Staff Desk</span>
                    <span className="nav-tag nav-tag-staff">Authorized</span>
                  </div>
                  <p className="nav-signin-desc">
                    Incident command, live SOS triage &amp; regional safety.
                  </p>
                </div>
                <ArrowRight size={15} className="nav-arrow-icon" />
              </Link>
            </div>

            <div className="nav-dropdown-footer nav-signin-footer">
              <div className="nav-signup-prompt">
                <UserPlus size={15} className="nav-signup-icon" />
                <span>Don&apos;t have a Tourist ID?</span>
              </div>
              <Link href="/onboarding" className="nav-signup-link">
                Register Now <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <a href="#roles" className="landing-nav-cta">
        Get started <ArrowUpRight size={15} />
      </a>
    </nav>
  );
}
