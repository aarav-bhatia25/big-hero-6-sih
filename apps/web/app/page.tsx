'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight } from 'lucide-react';

import HeaderNav from '@/components/HeaderNav';

/* Photographic props framing the page corners — traveller kit down the left,
   authority kit down the right. Decorative only; the centre column stays clear.
   Sizes are tuned per-asset because these are tight cutouts with almost no
   padding in frame, unlike the illustrations they replaced. */
const ART = [
  { src: '/hero/map-india.jpeg', className: 'art-map', w: 1103, h: 857 },
  { src: '/hero/backpack.webp', className: 'art-backpack', w: 558, h: 549 },
  { src: '/hero/passport.webp', className: 'art-passport', w: 236, h: 335 },
  { src: '/hero/classified.webp', className: 'art-classified', w: 487, h: 598 },
  { src: '/hero/badge.webp', className: 'art-badge', w: 307, h: 371 },
  { src: '/hero/radio.webp', className: 'art-radio', w: 458, h: 490 },
];

export default function Home() {
  return (
    <div className="landing-shell">
      <div className="landing-art" aria-hidden="true">
        {ART.map((art) => (
          <Image key={art.src} src={art.src} alt="" width={art.w} height={art.h} className={art.className} priority />
        ))}
      </div>

      <HeaderNav />

      <main id="top" className="landing-main">
        <section className="landing-hero">
          <h1 className="landing-title">
            Travel with a <strong>verified ID.</strong>
            <br />
            <em>Get help when it matters.</em>
          </h1>
          <p className="landing-copy">
            Prahari gives travellers a digital safety ID, optional location sharing,
            and a direct emergency route to authorised responders.
          </p>
        </section>

        <section id="roles" className="landing-roles" aria-label="Choose your portal">
          <article className="role-card role-card-traveller">
            <h2>For travellers.</h2>
            <p>
              Create a digital tourist ID, keep emergency contacts on file, and reach help
              without exposing more location data than necessary.
            </p>
            <div className="role-actions">
              <Link href="/onboarding" className="role-btn-primary">
                Create tourist ID <ArrowUpRight size={16} />
              </Link>
              <Link href="/login?role=tourist" className="role-btn-secondary">
                Log in as traveller <ArrowRight size={16} />
              </Link>
            </div>
          </article>

          <div className="divider-or" aria-hidden="true"><span>OR</span></div>

          <article className="role-card role-card-authority">
            <h2>For authorised staff.</h2>
            <p>
              Review live incidents, safety signals, geofences, and verified traveller
              credentials from one operational desk.
            </p>
            <div className="role-actions">
              <Link href="/authority" className="role-btn-primary">
                Open authority desk <ArrowUpRight size={16} />
              </Link>
              <Link href="/login?role=staff" className="role-btn-secondary">
                Log in as authority <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
