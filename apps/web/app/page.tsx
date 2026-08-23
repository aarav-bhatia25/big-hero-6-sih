'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Radio } from 'lucide-react';

export default function Home() {
  return (
    <div className="minimal-page flex min-h-screen flex-col">
      <header className="minimal-nav">
        <Link href="/" className="text-xl font-semibold tracking-tight text-ink">
          Prahari
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="minimal-text-link">Sign in</Link>
          <Link href="/onboarding" className="minimal-button minimal-button-primary">Create ID <ArrowRight size={15} /></Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-20 pt-16 sm:pt-24">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-5xl font-semibold tracking-[-0.045em] text-ink sm:text-6xl">
            Travel with a verified ID. Get help when it matters.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg">
            Prahari gives travellers a digital safety ID, optional location sharing, and a direct emergency route to authorised responders.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/onboarding" className="minimal-button minimal-button-primary minimal-button-large">
              Create a tourist ID <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="minimal-button minimal-button-secondary minimal-button-large">
              Sign in to Prahari
            </Link>
          </div>
          <p className="mt-5 text-sm text-ink-soft">Mock KYC · Sepolia testnet · Location sharing is opt-in</p>
        </section>

        <section className="mx-auto mt-16 grid max-w-5xl gap-5 md:grid-cols-2">
          <Link href="/onboarding" className="minimal-card minimal-card-link group">
            <div className="flex items-center gap-3 text-sky-400">
              <MapPin size={24} strokeWidth={2} aria-hidden="true" />
              <h2 className="text-2xl font-semibold tracking-tight text-ink">For travellers</h2>
            </div>
            <p className="mt-4 max-w-md text-base leading-7 text-ink-soft">
              Create a digital tourist ID, keep emergency contacts on file, and use SOS when you need help.
            </p>
            <span className="minimal-card-action">Start onboarding <ArrowRight size={16} /></span>
          </Link>

          <Link href="/authority" className="minimal-card minimal-card-link group">
            <div className="flex items-center gap-3 text-sky-400">
              <Radio size={24} strokeWidth={2} aria-hidden="true" />
              <h2 className="text-2xl font-semibold tracking-tight text-ink">For authorised staff</h2>
            </div>
            <p className="mt-4 max-w-md text-base leading-7 text-ink-soft">
              Review live incidents, safety signals, geofences, and verified traveller credentials.
            </p>
            <span className="minimal-card-action">Open authority desk <ArrowRight size={16} /></span>
          </Link>
        </section>

        <section className="mx-auto mt-14 grid max-w-5xl gap-6 border-y border-line py-7 text-base text-ink-soft sm:grid-cols-3">
          <div><strong className="block text-ink">Consent first</strong><span className="mt-1 block">Location sharing can be disabled by the traveller.</span></div>
          <div><strong className="block text-ink">Human review</strong><span className="mt-1 block">Safety signals support investigation; they do not make decisions.</span></div>
          <div><strong className="block text-ink">Privacy-preserving ID</strong><span className="mt-1 block">Only a credential commitment is anchored on-chain.</span></div>
        </section>
      </main>

      <footer className="minimal-footer">
        <span>Prahari demonstration platform</span>
        <a href="tel:112" className="font-medium text-ink hover:underline">Emergency: 112</a>
      </footer>
    </div>
  );
}
