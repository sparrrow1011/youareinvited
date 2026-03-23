'use client';

import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Gallery', href: '#gallery' },
  { label: 'Services', href: '#services' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Journal', href: '#journal' },
];

export default function NavBar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-xl shadow-[0_12px_40px_rgba(47,51,54,0.04)]">
      <div className="flex justify-between items-center w-full px-6 md:px-12 py-5 max-w-screen-2xl mx-auto">

        {/* Logo */}
        <Link href="/" className="text-2xl font-serif italic text-on-lp-background">
          YouAreInvited
        </Link>

        {/* Centre links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-10 font-headline font-light tracking-wide">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-on-surface-variant hover:text-brand transition-colors text-sm"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Right CTAs */}
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href="/login"
            className="text-sm font-medium text-on-surface hover:text-brand transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="bg-brand hover:bg-brand-dim text-white px-5 py-2.5 rounded-full font-medium text-sm transition-all shadow-md"
          >
            Create Event
          </Link>
        </div>
      </div>
    </nav>
  );
}
