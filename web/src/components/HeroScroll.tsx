'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
      <div style={{ transform: 'rotateY(-12deg) rotateX(3deg)' }}>
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
            <div className="bg-brand h-2 rounded-full w-full" />
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

// ── STEPS defined AFTER all card components ───────────────────────────────────

type StepDef = { number: string; title: string; description: string; ui: React.ReactNode };

const STEPS: StepDef[] = [
  { number: '01', title: 'Create Event',       description: "Start with a blank canvas. Name your event, set the date, and you're ready.",  ui: <CreateEventCard /> },
  { number: '02', title: 'Personalize Invite', description: 'Upload your design. Mark where the guest name, tag, and QR code go.',           ui: <PersonalizeCard /> },
  { number: '03', title: 'Generate QR',        description: 'Each guest receives a unique QR code embedded in their personalised invite.',    ui: <QRCard /> },
  { number: '04', title: 'Share',              description: 'Deliver beautiful digital invitations to all 47 guests in one click.',           ui: <ShareCard /> },
  { number: '05', title: 'Check-in',           description: 'Guests scan at the door. Instant verification, no paper, no queues.',            ui: <CheckInCard /> },
  { number: '06', title: 'Dashboard',          description: 'Watch attendance roll in. Real-time control for the modern host.',               ui: <DashboardCard /> },
];

// ── Main carousel export ──────────────────────────────────────────────────────

export default function HeroScroll() {
  const [active, setActive] = useState(0);

  // Auto-advance every 4 seconds; resets if user clicks a dot
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % STEPS.length), 4000);
    return () => clearInterval(t);
  }, [active]);

  return (
    <section className="py-24 px-6 md:px-12">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-headline text-4xl md:text-5xl text-on-lp-background mb-4">How it works</h2>
          <p className="text-on-surface-variant text-lg">Six steps to a flawless event</p>
        </div>

        {/* Two-col layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: step text */}
          <div className="relative min-h-[200px] flex items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <span className="text-brand font-label font-bold text-sm tracking-widest mb-3 block">{STEPS[active].number}</span>
                <h3 className="font-headline text-3xl md:text-4xl text-on-lp-background mb-4">{STEPS[active].title}</h3>
                <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">{STEPS[active].description}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: card */}
          <div className="flex items-center justify-center min-h-[320px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                {STEPS[active].ui}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Clickable progress dots */}
        <div className="flex justify-center gap-3 mt-12">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Step ${i + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-8 bg-brand' : 'w-2.5 bg-outline-variant hover:bg-on-surface-variant'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
