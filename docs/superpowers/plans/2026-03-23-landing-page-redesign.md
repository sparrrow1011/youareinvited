# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dark Three.js landing page with a premium light glassmorphism page featuring a scroll-driven 6-step product story.

**Architecture:** Seven sections assembled in `page.tsx` (server component). Two new client components: `NavBar.tsx` (sticky nav) and `HeroScroll.tsx` (Framer Motion scroll storytelling). Tailwind extended with new light color tokens — existing dark tokens untouched.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Framer Motion (`useScroll`/`useTransform`), `next/font/google` (Noto Serif + Manrope), Material Symbols Outlined (CDN icon font)

**Spec:** `docs/superpowers/specs/2026-03-23-landing-page-redesign.md`

---

## File Map

| File | Role |
|---|---|
| `web/tailwind.config.js` | Add new color tokens + font families |
| `web/src/app/layout.tsx` | Load Noto Serif + Manrope via `next/font`, inject Material Symbols link |
| `web/src/app/page.tsx` | Full landing page assembly (server component) |
| `web/src/components/NavBar.tsx` | Sticky glassmorphism nav (client component) |
| `web/src/components/HeroScroll.tsx` | Scroll-driven 6-step story (client component) |

---

## Task 1: Install framer-motion + update Tailwind config

**Files:**
- Modify: `web/package.json` (via npm install)
- Modify: `web/tailwind.config.js`

- [ ] **Step 1: Install framer-motion**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/web && npm install framer-motion
```

Expected: `framer-motion` appears in `web/package.json` dependencies.

- [ ] **Step 2: Replace tailwind.config.js**

Replace the entire `web/tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Authenticated app (dark theme) — DO NOT CHANGE ──
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#e94560',
        light: '#a8dadc',

        // ── Landing page light theme ──
        brand: '#006b5f',
        'brand-dim': '#005e53',
        'brand-container': '#73f2dd',
        'on-brand-container': '#00594f',
        warm: '#a04223',
        tertiary: '#b91156',
        'tertiary-container': '#ff9cb3',
        'lp-background': '#f9f9fb',
        'on-lp-background': '#2f3336',
        'on-surface': '#2f3336',
        'on-surface-variant': '#5c5f63',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f3f6',
        'surface-container': '#eceef1',
        'surface-container-high': '#e6e8ec',
        'secondary-container': '#ffdbd0',
        'on-secondary-container': '#8e3517',
        'outline-variant': '#afb2b6',
        outline: '#777b7f',
      },
      fontFamily: {
        headline: ['var(--font-noto-serif)', 'Georgia', 'serif'],
        body: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        label: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      // Keep existing animations for authenticated app
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        fadeUp: 'fadeUp 0.6s ease forwards',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Verify build compiles with new tokens**

```bash
cd web && npm run build
```

Expected: Build succeeds. Zero type errors.

- [ ] **Step 4: Commit**

```bash
git add web/tailwind.config.js web/package.json web/package-lock.json
git commit -m "feat: add landing page color tokens and framer-motion"
```

---

## Task 2: Update layout.tsx — fonts + Material Symbols

**Files:**
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

```tsx
import type { Metadata } from 'next';
import { Inter, Noto_Serif, Manrope } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-noto-serif',
  style: ['normal', 'italic'],
  weight: ['300', '400', '700'],
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'YouAreInvited | The Art of Invitation',
  description: 'Cinematic digital invitations for your most meaningful moments.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0"
        />
      </head>
      <body className={`${inter.className} ${notoSerif.variable} ${manrope.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/layout.tsx
git commit -m "feat: add Noto Serif, Manrope fonts and Material Symbols to layout"
```

---

## Task 3: NavBar component

**Note:** NavBar is a client component for future extensibility. Active-link scroll tracking is deferred to v2 — no `usePathname` is used here.

**Files:**
- Create: `web/src/components/NavBar.tsx`

- [ ] **Step 1: Create NavBar.tsx**

```tsx
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
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

Expected: Build succeeds, NavBar compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/NavBar.tsx
git commit -m "feat: add landing page NavBar component"
```

---

## Task 4: HeroScroll component

**Files:**
- Create: `web/src/components/HeroScroll.tsx`

This is the most complex component. Read carefully before implementing.

- [ ] **Step 1: Create HeroScroll.tsx**

**Important:** `STEPS` is defined AFTER all card component functions to avoid referencing them before declaration. `ProgressDot` is a separate component so hooks are never called inside a loop.

```tsx
'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';

// ── Step opacity helpers ─────────────────────────────────────────────────────

function useStepOpacity(scrollYProgress: MotionValue<number>, index: number) {
  const band = 1 / 6;
  const start = index * band;
  const mid = start + band * 0.3;
  const midEnd = start + band * 0.7;
  const end = start + band;
  return useTransform(scrollYProgress, [start, mid, midEnd, end], [0, 1, 1, 0]);
}

function useStepY(scrollYProgress: MotionValue<number>, index: number) {
  const band = 1 / 6;
  const start = index * band;
  const mid = start + band * 0.3;
  const end = start + band;
  return useTransform(scrollYProgress, [start, mid, end], [20, 0, -20]);
}

// ── UI Mock Cards ─────────────────────────────────────────────────────────────

function CardShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6 w-full max-w-sm ${className}`}>
      {children}
    </div>
  );
}


function CreateEventCard() {
  return (
    <CardShell>
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-4">New Event</p>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-on-surface-variant mb-1 block">Event Name</label>
          <div className="w-full h-10 rounded-xl bg-surface-container border border-outline-variant/30 px-3 flex items-center">
            <span className="text-sm text-on-surface-variant">The Golden Hour Soirée</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-on-surface-variant mb-1 block">Date</label>
          <div className="w-full h-10 rounded-xl bg-surface-container border border-outline-variant/30 px-3 flex items-center">
            <span className="text-sm text-on-surface-variant">October 24, 2025</span>
          </div>
        </div>
        <div className="pt-2">
          <div className="w-full h-10 rounded-full bg-brand flex items-center justify-center">
            <span className="text-white text-sm font-semibold">Create Event</span>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function PersonalizeCard() {
  return (
    <CardShell>
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-4">Your Invitation</p>
      <div className="w-full h-32 rounded-2xl bg-gradient-to-br from-brand-container/40 to-secondary-container/40 mb-4 relative">
        {/* Glowing name zone */}
        <div className="absolute bottom-4 left-4 right-4 h-8 rounded-lg border-2 border-brand/60 bg-brand/10 flex items-center px-3 animate-pulse">
          <span className="text-xs text-brand font-semibold">Guest Name Zone</span>
        </div>
      </div>
      <p className="text-xs text-on-surface-variant text-center">Drag to position · Click to resize</p>
    </CardShell>
  );
}

function QRCard() {
  return (
    <CardShell>
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-4">Your Invitation</p>
      <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-brand-container/40 to-secondary-container/40 mb-4" />
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-white border-2 border-outline-variant/20 flex items-center justify-center shadow-sm">
          {/* QR grid visual */}
          <div className="grid grid-cols-4 gap-0.5 w-10 h-10">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className={`rounded-sm ${[0,1,4,5,2,7,8,11,13,14,15,10].includes(i) ? 'bg-on-lp-background' : 'bg-transparent'}`} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-on-lp-background">Sarah Al-Rashid</p>
          <p className="text-xs text-on-surface-variant">Seat A-12 · VIP</p>
          <p className="text-xs text-brand mt-1">Scan to check in</p>
        </div>
      </div>
    </CardShell>
  );
}

function ShareCard() {
  return (
    <div style={{ perspective: '800px' }}>
      <div style={{ transform: 'rotateY(-12deg) rotateX(3deg)' }} className="transition-transform">
        <CardShell>
          <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-3">Invitations Sent</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-base">send</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-lp-background">47 guests notified</p>
              <p className="text-xs text-on-surface-variant">Just now</p>
            </div>
          </div>
          <div className="w-full bg-surface-container rounded-full h-2">
            <div className="bg-brand h-2 rounded-full w-full transition-all" />
          </div>
          <p className="text-xs text-brand text-right mt-1">100% delivered ✓</p>
        </CardShell>
      </div>
    </div>
  );
}

function CheckInCard() {
  return (
    <CardShell className="text-center">
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-6">Gate Scanner</p>
      <div className="relative flex items-center justify-center mx-auto w-24 h-24 mb-6">
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full border-2 border-brand/30 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-brand/50" />
        <div className="w-14 h-14 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center">
          <span className="material-symbols-outlined text-green-600 text-2xl">check</span>
        </div>
      </div>
      <p className="font-semibold text-on-lp-background">Sarah Al-Rashid</p>
      <p className="text-xs text-green-600 font-semibold mt-1">✓ Checked in · 8:43 PM</p>
    </CardShell>
  );
}

function DashboardCard() {
  return (
    <CardShell>
      <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-4">Live Dashboard</p>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total', value: '47' },
          { label: 'Checked In', value: '43' },
          { label: 'Rate', value: '91%' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-container rounded-2xl p-3 text-center">
            <div className="text-xl font-bold text-brand">{value}</div>
            <div className="text-xs text-on-surface-variant">{label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-on-surface-variant mb-1">
          <span>Check-in progress</span>
          <span className="text-brand font-semibold">91%</span>
        </div>
        <div className="w-full bg-surface-container rounded-full h-2">
          <div className="bg-brand h-2 rounded-full" style={{ width: '91%' }} />
        </div>
      </div>
    </CardShell>
  );
}

// ── Step text / card wrappers ────────────────────────────────────────────────

type StepDef = { number: string; title: string; description: string; ui: React.ReactNode };

function StepText({ step, index, scrollYProgress }: { step: StepDef; index: number; scrollYProgress: MotionValue<number> }) {
  const opacity = useStepOpacity(scrollYProgress, index);
  const y = useStepY(scrollYProgress, index);
  return (
    <motion.div className="absolute inset-0 flex flex-col justify-center" style={{ opacity, y }}>
      <span className="text-brand font-label font-bold text-sm tracking-widest mb-3">{step.number}</span>
      <h3 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-4">{step.title}</h3>
      <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">{step.description}</p>
    </motion.div>
  );
}

function StepCard({ index, scrollYProgress, children }: { index: number; scrollYProgress: MotionValue<number>; children: React.ReactNode }) {
  const opacity = useStepOpacity(scrollYProgress, index);
  const y = useStepY(scrollYProgress, index);
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}

// ── Progress dots — each dot is its own component so hooks are NOT in a loop ─

function ProgressDot({ index, scrollYProgress }: { index: number; scrollYProgress: MotionValue<number> }) {
  const opacity = useStepOpacity(scrollYProgress, index);
  const bg = useTransform(opacity, [0, 1], ['#afb2b6', '#006b5f']);
  const scale = useTransform(opacity, [0, 1], [1, 1.4]);
  return <motion.div className="w-2 h-2 rounded-full" style={{ backgroundColor: bg, scale }} />;
}

function ProgressDots({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  return (
    <div className="flex justify-center gap-2 mt-8">
      {STEPS.map((_, i) => <ProgressDot key={i} index={i} scrollYProgress={scrollYProgress} />)}
    </div>
  );
}

// ── STEPS defined AFTER all card components to avoid forward-reference errors ─

const STEPS: StepDef[] = [
  { number: '01', title: 'Create Event',      description: "Start with a blank canvas. Name your event, set the date, and you're ready.", ui: <CreateEventCard /> },
  { number: '02', title: 'Personalize Invite', description: 'Upload your design. Mark where the guest name, tag, and QR code go.',          ui: <PersonalizeCard /> },
  { number: '03', title: 'Generate QR',        description: 'Each guest receives a unique QR code embedded in their personalised invite.',    ui: <QRCard /> },
  { number: '04', title: 'Share',              description: 'Deliver beautiful digital invitations to all 47 guests in one click.',           ui: <ShareCard /> },
  { number: '05', title: 'Check-in',           description: 'Guests scan at the door. Instant verification, no paper, no queues.',           ui: <CheckInCard /> },
  { number: '06', title: 'Dashboard',          description: 'Watch attendance roll in. Real-time control for the modern host.',               ui: <DashboardCard /> },
];

// ── Main export ───────────────────────────────────────────────────────────────

export default function HeroScroll() {
  const outerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  });

  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const auroraOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);

  return (
    <div ref={outerRef} className="h-[500vh] relative">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-brand-container/10 to-secondary-container/10"
            style={{ opacity: auroraOpacity }}
          />
        </div>

        <div className="relative w-full max-w-screen-2xl mx-auto px-6 md:px-12">
          <motion.div className="text-center mb-12" style={{ opacity: headerOpacity }}>
            <h2 className="font-headline text-4xl md:text-5xl text-on-lp-background mb-4">How it works</h2>
            <p className="text-on-surface-variant text-lg">Scroll to explore the experience</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative h-64">
              {STEPS.map((step, i) => (
                <StepText key={i} step={step} index={i} scrollYProgress={scrollYProgress} />
              ))}
            </div>
            <div className="relative h-80 lg:h-96">
              {STEPS.map((step, i) => (
                <StepCard key={i} index={i} scrollYProgress={scrollYProgress}>
                  {step.ui}
                </StepCard>
              ))}
            </div>
          </div>

          <ProgressDots scrollYProgress={scrollYProgress} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

Expected: Build succeeds. No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/HeroScroll.tsx
git commit -m "feat: add HeroScroll scroll-driven storytelling component"
```

---

## Task 5: Rewrite page.tsx — aurora + above-fold hero

**Files:**
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Rewrite page.tsx (above-fold hero + aurora only — no lower sections yet)**

```tsx
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

        {/* Remaining sections — placeholders to be filled in Task 6 */}
        <div id="gallery" />
        <div id="services" />
        <div id="pricing" />
        <footer id="journal" />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "feat: landing page above-fold hero and aurora background"
```

---

## Task 6: Scroll story + Feature bento grid

**Files:**
- Modify: `web/src/app/page.tsx` — replace the `{/* Remaining sections */}` placeholder

- [ ] **Step 1: Add HeroScroll + Feature bento grid sections to page.tsx**

Replace the placeholder comment block with:

```tsx
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

        {/* Remaining — placeholder */}
        <div id="services" />
        <div id="pricing" />
        <footer id="journal" />
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "feat: add scroll story and feature bento grid to landing page"
```

---

## Task 7: Testimonial + Services sections

**Files:**
- Modify: `web/src/app/page.tsx` — replace the Services placeholder

- [ ] **Step 1: Add Testimonial + Services sections**

Replace `{/* Remaining — placeholder */}` and `<div id="services" />` with:

```tsx
        {/* ── Section 4: Testimonial ── */}
        <section className="py-32 bg-surface-container/50">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-10">
            <span className="font-headline italic text-5xl text-warm">"</span>
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

        {/* Remaining — placeholder */}
        <div id="pricing" />
        <footer id="journal" />
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "feat: add testimonial and services sections to landing page"
```

---

## Task 8: Dark CTA + Footer

**Files:**
- Modify: `web/src/app/page.tsx` — replace pricing + journal placeholders

- [ ] **Step 1: Add CTA + Footer sections**

Replace the remaining placeholders with:

```tsx
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
```

**Note:** The footer is placed as the last child inside `<main>` (which already wraps all sections). This is intentional for this landing page since all content including the footer is part of the page flow. Close `</main>` and `</div>` tags after the footer close tag as shown.

Replace the entire return statement in `page.tsx` — the outer structure should be:
```tsx
return (
  <div className="bg-lp-background text-on-lp-background font-body overflow-x-hidden">
    {/* Aurora */}
    <NavBar />
    <main className="relative z-10 pt-28">
      {/* Section 1: Hero */}
      {/* Section 2: HeroScroll */}
      {/* Section 3: Bento */}
      {/* Section 4: Testimonial */}
      {/* Section 5: Services */}
      {/* Section 6: CTA */}
      <footer id="journal"> ... </footer>
    </main>
  </div>
);
```

- [ ] **Step 2: Final build check**

```bash
cd web && npm run build
```

Expected: Build succeeds with zero errors.

- [ ] **Step 3: Final commit**

```bash
git add web/src/app/page.tsx
git commit -m "feat: complete landing page redesign — CTA, footer, all sections"
```

---

## Verification Checklist

After all tasks complete, manually verify in the browser (`npm run dev`):

- [ ] Page loads with light background (not dark navy)
- [ ] NavBar is sticky and blurs background content on scroll
- [ ] "Get Started" → `/signup`, "Sign In" → `/login`
- [ ] Glassmorphism card stack visible on desktop, hidden on mobile
- [ ] HeroScroll: scrolling through the hero section transitions all 6 steps
- [ ] Progress dots update as user scrolls through story
- [ ] Feature bento grid renders at correct column spans on desktop
- [ ] Dark CTA section has visible aurora glow effects
- [ ] Footer anchor links (#gallery, #services, #pricing, #journal) scroll correctly
- [ ] Authenticated users visiting `/` are redirected to `/dashboard`
- [ ] Existing dashboard/events pages still use dark navy theme (unchanged)
