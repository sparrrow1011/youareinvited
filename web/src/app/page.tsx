import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import FeatureCards from '@/components/FeatureCards';

// Three.js uses browser APIs — disable SSR
const ThreeHero = dynamic(() => import('@/components/ThreeHero'), { ssr: false });

export default function Home() {
  // Authenticated users go straight to their dashboard
  const cookieStore = cookies();
  if (cookieStore.get('access_token')?.value) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-primary relative overflow-hidden">
      {/* Full-viewport Three.js background */}
      <div className="fixed inset-0 z-0">
        <ThreeHero />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ── Above the fold: split hero ── */}
        <section className="flex-1 flex items-center">
          <div className="max-w-6xl mx-auto px-6 py-16 w-full">
            <div className="flex items-center gap-12">

              {/* Left: headline + CTAs */}
              <div className="flex-1">
                <p
                  className="text-accent font-bold tracking-widest text-xs uppercase mb-4 animate-fadeUp"
                  style={{ animationDelay: '0s' }}
                >
                  YouAreInvited
                </p>
                <h1
                  className="text-5xl md:text-6xl font-black text-white leading-tight mb-4 animate-fadeUp"
                  style={{ animationDelay: '0.1s', opacity: 0 }}
                >
                  Turn any event into a{' '}
                  <span className="text-accent">beautiful</span> experience
                </h1>
                <p
                  className="text-light text-lg mb-8 animate-fadeUp"
                  style={{ animationDelay: '0.2s', opacity: 0 }}
                >
                  Upload your design. Add guests. Watch them arrive.
                </p>
                <div
                  className="flex flex-col sm:flex-row gap-4 animate-fadeUp"
                  style={{ animationDelay: '0.3s', opacity: 0 }}
                >
                  <Link
                    href="/signup"
                    className="bg-accent text-white font-bold px-8 py-3 rounded-lg text-center hover:bg-opacity-90 transition-all"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="/login"
                    className="border border-secondary text-light px-8 py-3 rounded-lg text-center hover:border-light transition-all"
                    style={{ borderColor: '#0f3460' }}
                  >
                    Sign In
                  </Link>
                </div>
              </div>

              {/* Right: e-invite card mockup */}
              <div className="hidden md:flex flex-shrink-0 flex-col items-center justify-center bg-secondary rounded-2xl p-8 w-64 shadow-2xl animate-float">
                <p className="text-accent text-xs font-bold tracking-widest uppercase mb-2">
                  You&apos;re Invited
                </p>
                <div className="w-10 h-px mb-3" style={{ background: '#0f3460' }} />
                <p className="text-white font-bold text-lg mb-1">Sarah Al-Rashid</p>
                <p className="text-light text-sm mb-4">Seat A-12 · VIP</p>
                <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center mb-3">
                  <span className="text-xs text-gray-400 font-mono text-center leading-tight">
                    QR<br />CODE
                  </span>
                </div>
                <p className="text-light text-xs">Scan to check in</p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Below the fold: feature cards (scroll-reveal) ── */}
        <section className="max-w-6xl mx-auto px-6 pb-20 w-full">
          <h2 className="text-white text-center text-2xl font-bold mb-8">
            Everything you need for a flawless event
          </h2>
          <FeatureCards />
        </section>
      </div>
    </main>
  );
}
