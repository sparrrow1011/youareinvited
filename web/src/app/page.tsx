import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import NavBar from '@/components/NavBar';

const HeroScroll = dynamic(() => import('@/components/HeroScroll'), { ssr: false });

export default async function Home() {
  // Redirect authenticated users to dashboard
  const cookieStore = cookies();
  const token = cookieStore.get('access_token');
  if (token?.value) redirect('/dashboard');

  return (
    <div className="bg-lp-background text-on-lp-background font-body overflow-x-hidden">
      {/* Aurora background — fixed, behind everything */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand/20 blur-[120px]" />
        <div className="absolute top-1/4 -right-48 w-full h-[600px] rounded-full bg-secondary-container/30 blur-[120px]" />
        <div className="absolute -bottom-48 left-1/4 w-[800px] h-[800px] rounded-full bg-tertiary-container/20 blur-[120px]" />
      </div>

      <NavBar />

      <main className="relative z-10 pt-28">
        {/* ── Section 1: Above-fold hero ── */}
        <section className="min-h-[90vh] flex items-center px-6 md:px-12 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">

            {/* Left: headline + CTAs */}
            <div className="space-y-8">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-container/30 border border-brand-container/40 text-on-brand-container text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                Redefining the Digital Gala
              </div>

              {/* H1 */}
              <h1 className="font-headline text-6xl md:text-8xl leading-tight text-on-lp-background tracking-tight">
                The Art of <br />
                <span className="italic text-warm">Invitation</span>.
              </h1>

              <p className="text-xl md:text-2xl text-on-surface-variant font-light max-w-xl leading-relaxed">
                Elevate your event with cinematic digital curation. A high-end experience that begins the moment they click.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="bg-brand hover:bg-brand-dim text-white px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-xl"
                >
                  Get Started
                </Link>
                <Link
                  href="/login"
                  className="bg-white/40 backdrop-blur-md border border-outline-variant/20 hover:bg-white/60 text-on-surface px-8 py-4 rounded-full font-semibold text-lg transition-all"
                >
                  View Sample Event
                </Link>
              </div>
            </div>

            {/* Right: glassmorphism card stack */}
            <div className="relative h-[580px] hidden lg:block">
              {/* Layer 1 — main card */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[500px] bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl z-30 border border-white/60 p-8 flex flex-col justify-between rotate-3">
                <div className="w-full h-56 rounded-2xl bg-gradient-to-br from-brand-container/40 to-secondary-container/40 shadow-inner" />
                <div className="space-y-3">
                  <h3 className="font-headline text-2xl text-on-lp-background">The Golden Hour Soirée</h3>
                  <p className="text-sm font-medium text-on-surface-variant uppercase tracking-widest">Beverly Hills · 10.24.2025</p>
                  <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center">
                    <span className="text-xs italic text-on-surface-variant">Private Invitation Only</span>
                    <span className="material-symbols-outlined text-brand">arrow_forward</span>
                  </div>
                </div>
              </div>

              {/* Layer 2 — back card */}
              <div className="absolute top-[8%] right-[2%] w-60 h-72 bg-white/20 backdrop-blur-2xl rounded-[2rem] shadow-xl z-20 border border-white/40 -rotate-12">
                <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-surface-container to-outline-variant/20" />
              </div>

              {/* Layer 3 — floating chip */}
              <div className="absolute bottom-[12%] left-[2%] w-52 h-28 bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg z-40 border border-white/50 p-5 flex flex-col justify-center space-y-2 -rotate-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-on-brand-container">done_all</span>
                  </div>
                  <span className="text-sm font-semibold text-on-lp-background">92% Attending</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand w-[92%] h-full rounded-full" />
                </div>
              </div>

              {/* Glow behind cards */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-warm/20 rounded-full blur-[80px] z-10" />
            </div>

          </div>
        </section>

        {/* ── Section 2: Scroll storytelling ── */}
        <HeroScroll />

        {/* ── Section 3: Feature bento grid ── */}
        <section id="gallery" className="py-32 px-6 md:px-12 max-w-screen-2xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="font-headline text-4xl md:text-5xl text-on-lp-background">
              Curation for the Conscious Host
            </h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto text-lg">
              Beyond a simple link — a sophisticated ecosystem for your most meaningful moments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Large card */}
            <div className="md:col-span-7 group relative overflow-hidden rounded-[3rem] bg-surface-container-lowest p-10 md:p-12 shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="space-y-5">
                  <span className="material-symbols-outlined text-4xl text-tertiary">brush</span>
                  <h3 className="font-headline text-3xl text-on-lp-background">Bespoke Design Studio</h3>
                  <p className="text-on-surface-variant text-lg max-w-md">
                    Upload your design, mark the zones, and we composite every invitation automatically.
                  </p>
                </div>
                <div className="pt-10">
                  <Link href="/signup" className="flex items-center gap-2 font-semibold text-brand group-hover:gap-4 transition-all">
                    Explore Studio <span className="material-symbols-outlined">north_east</span>
                  </Link>
                </div>
              </div>
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-tertiary-container/20 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-700" />
            </div>

            {/* Tall card */}
            <div className="md:col-span-5 relative overflow-hidden rounded-[3rem] bg-surface-container-low p-10 md:p-12">
              <div className="space-y-5">
                <span className="material-symbols-outlined text-4xl text-brand">diversity_1</span>
                <h3 className="font-headline text-3xl text-on-lp-background">Guest Concierge</h3>
                <p className="text-on-surface-variant text-lg">
                  CSV upload, per-guest personalisation, and real-time check-in tracking.
                </p>
              </div>
              <div className="mt-10 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-container/30 to-secondary-container/30 h-36" />
            </div>

            {/* Three small cards */}
            {[
              { icon: 'card_giftcard', title: 'Bulk Import', desc: 'Upload a CSV of names, seats, and tags to populate all guests instantly.', bg: 'bg-secondary-container', iconColor: 'text-on-secondary-container' },
              { icon: 'photo_library', title: 'QR Generation', desc: 'Every invitation carries a unique QR code. No extras, no duplicates.', bg: 'bg-brand-container', iconColor: 'text-on-brand-container' },
              { icon: 'analytics', title: 'Host Insights', desc: 'Real-time attendance tracking and check-in rate for the modern planner.', bg: 'bg-tertiary-container', iconColor: 'text-on-lp-background' },
            ].map(({ icon, title, desc, bg, iconColor }) => (
              <div key={title} className="md:col-span-4 rounded-[3rem] bg-surface-container-lowest p-8 md:p-10 border border-outline-variant/10 space-y-4">
                <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
                </div>
                <h4 className="font-headline text-xl text-on-lp-background">{title}</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4: Testimonial ── */}
        <section className="py-32 bg-surface-container/50">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-10">
            <span className="font-headline italic text-5xl text-warm">&ldquo;</span>
            <blockquote className="font-headline text-4xl md:text-5xl leading-tight text-on-lp-background italic">
              The difference between a party and a gala is in the first moment of interaction. YouAreInvited made our wedding feel like a premiere.
            </blockquote>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-container to-secondary-container ring-4 ring-white shadow-lg" />
              <cite className="not-italic">
                <div className="font-bold text-lg text-on-lp-background">Julianne St. Claire</div>
                <div className="text-on-surface-variant uppercase tracking-widest text-xs font-semibold">Boutique Events Director</div>
              </cite>
            </div>
          </div>
        </section>

        {/* ── Section 5: Asymmetric image + text ── */}
        <section id="services" className="py-40 px-6 md:px-12 max-w-screen-2xl mx-auto overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-16 md:gap-20">
            {/* Left: decorative image */}
            <div className="w-full md:w-1/2 relative">
              <div className="aspect-[4/5] rounded-[4rem] overflow-hidden shadow-2xl relative z-10 bg-gradient-to-br from-brand-container/40 to-secondary-container/60" />
              <div className="absolute -bottom-10 -right-10 w-64 h-80 bg-secondary-container rounded-[3rem] -z-10 hidden md:block" />
              <div className="absolute -top-10 -left-10 w-64 h-64 bg-brand-container/30 rounded-full blur-3xl -z-10" />
            </div>

            {/* Right: text */}
            <div className="w-full md:w-1/2 space-y-8 md:pl-8">
              <h2 className="font-headline text-5xl leading-tight text-on-lp-background">
                Moments That <br />
                <span className="text-brand italic">Live Forever</span>.
              </h2>
              <p className="text-xl text-on-surface-variant leading-relaxed">
                Every invitation suite created on YouAreInvited is preserved — a cinematic memory of your event, accessible for years to come.
              </p>
              <ul className="space-y-5">
                {[
                  'Personalised invite per guest, generated instantly',
                  'QR check-in — no paper, no queues',
                  'Real-time dashboard control for the host',
                ].map((item) => (
                  <li key={item} className="flex gap-4 items-start">
                    <span className="material-symbols-outlined text-brand mt-0.5">check_circle</span>
                    <span className="text-on-surface">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="inline-block bg-brand hover:bg-brand-dim text-white px-10 py-4 rounded-full font-bold transition-all shadow-lg"
              >
                Start Designing
              </Link>
            </div>
          </div>
        </section>

        {/* ── Section 6: Dark CTA ── */}
        <section id="pricing" className="relative py-40 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-on-lp-background -z-20" />
          <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-brand/20 blur-[150px] -z-10" />
          <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-tertiary/20 blur-[150px] -z-10" />
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <h2 className="font-headline text-5xl md:text-7xl text-white">Ready to begin?</h2>
            <p className="text-white/60 text-xl max-w-xl mx-auto font-light">
              Join the hosts who have elevated their events from ordinary to extraordinary.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Link
                href="/signup"
                className="w-full md:w-auto bg-white text-on-lp-background hover:bg-surface-container-high px-12 py-5 rounded-full font-bold text-xl transition-all"
              >
                Create Event
              </Link>
              <a
                href="#"
                className="w-full md:w-auto bg-transparent border border-white/30 text-white hover:bg-white/10 px-12 py-5 rounded-full font-bold text-xl transition-all"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </section>

        {/* ── Section 7: Footer ── */}
        <footer id="journal" className="py-20 px-6 md:px-12 border-t border-outline-variant/10 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10 md:gap-12">
            {/* Brand */}
            <div className="col-span-2 space-y-5">
              <div className="text-3xl font-headline italic text-on-lp-background">YouAreInvited</div>
              <p className="text-on-surface-variant max-w-xs text-sm leading-relaxed">
                A digital invitation platform for those who value elegance, intentionality, and cinematic storytelling.
              </p>
            </div>

            {/* Platform links */}
            <div className="space-y-4">
              <div className="font-bold text-sm uppercase tracking-widest text-on-lp-background">Platform</div>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {['Features', 'Pricing', 'Showcase', 'Guidelines'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-brand transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div className="space-y-4">
              <div className="font-bold text-sm uppercase tracking-widest text-on-lp-background">Company</div>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {['Our Story', 'Journal', 'Contact', 'Careers'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-brand transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div className="col-span-2 space-y-5">
              <div className="font-bold text-sm uppercase tracking-widest text-on-lp-background">Newsletter</div>
              <p className="text-xs text-on-surface-variant">Weekly inspiration for high-end event curation.</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="email address"
                  className="flex-1 bg-surface-container-low rounded-l-full px-6 py-3 text-sm outline-none focus:ring-1 focus:ring-brand border-0"
                />
                <button className="bg-on-lp-background text-white px-6 py-3 rounded-r-full hover:bg-brand transition-all">
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-16 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-xs text-on-surface-variant">© 2025 YouAreInvited. All Rights Reserved.</div>
            <div className="flex gap-8 text-xs text-on-surface-variant font-medium">
              {['Privacy Policy', 'Terms of Service', 'Cookie Settings'].map((item) => (
                <a key={item} href="#" className="hover:text-on-lp-background transition-colors">{item}</a>
              ))}
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
