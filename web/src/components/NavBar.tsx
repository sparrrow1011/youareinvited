'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Guest Experience', href: '/#guest-experience' },
  { label: 'Contact', href: '/#contact' },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };

    desktopQuery.addEventListener('change', closeAtDesktop);
    return () => desktopQuery.removeEventListener('change', closeAtDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    firstMenuLinkRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed top-0 z-50 w-full bg-white/60 shadow-[0_12px_40px_rgba(47,51,54,0.04)] backdrop-blur-xl"
    >
      <div className="relative mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-6 md:px-12 md:py-5">
        <Link
          href="/"
          className="font-serif text-xl italic text-on-lp-background sm:text-2xl"
          onClick={closeMenu}
        >
          YouAreInvited
        </Link>

        <div className="hidden items-center gap-10 font-headline font-light tracking-wide md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-sm text-on-surface-variant transition-colors hover:text-brand"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-6">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-on-surface transition-colors hover:text-brand md:inline-flex"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-brand px-3 py-2.5 text-sm font-medium text-white shadow-md transition-colors hover:bg-brand-dim sm:px-4 md:px-5"
            onClick={closeMenu}
          >
            Create<span className="hidden sm:inline"> Event</span>
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-white/70 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 md:hidden"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {menuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {menuOpen && (
          <div
            ref={menuRef}
            id={menuId}
            className="absolute left-4 right-4 top-[calc(100%+0.5rem)] overflow-hidden rounded-3xl border border-white/60 bg-white/95 p-2 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-6 sm:w-80 md:hidden"
          >
            <div className="flex flex-col">
              {NAV_LINKS.map(({ label, href }, index) => (
                <Link
                  key={label}
                  ref={index === 0 ? firstMenuLinkRef : undefined}
                  href={href}
                  onClick={closeMenu}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {label}
                </Link>
              ))}
              <div className="my-1 border-t border-outline-variant/20" />
              <Link
                href="/login"
                onClick={closeMenu}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
