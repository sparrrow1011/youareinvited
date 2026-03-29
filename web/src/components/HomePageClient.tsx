'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import HeroScroll from '@/components/HeroScroll';
import LegalFooterLinks from '@/components/LegalFooterLinks';
import NavBar from '@/components/NavBar';
import { useEffect, useState } from 'react';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const revealInView = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.6, ease: EASE_OUT },
};

const ANALYTICS_SNAPSHOTS = [
  {
    eventName: 'Golden Hour Soirée',
    totals: {
      sent: '248',
      checkedIn: '189',
      rate: '76%',
    },
    bars: [20, 45, 70, 95, 80, 60, 40, 55, 30, 15],
    guests: [
      { name: 'Amara Osei-Bonsu', seat: 'A-12', status: true },
      { name: 'Luciano Ferretti', seat: 'B-04', status: true },
      { name: 'Yuki Tanaka', seat: 'A-08', status: false },
    ],
  },
  {
    eventName: 'Emerald Ballroom Gala',
    totals: {
      sent: '312',
      checkedIn: '224',
      rate: '72%',
    },
    bars: [12, 28, 54, 77, 94, 88, 63, 42, 29, 18],
    guests: [
      { name: 'Nadia Mensah', seat: 'VIP-03', status: true },
      { name: 'Henrik Solberg', seat: 'B-19', status: true },
      { name: 'Chioma Eze', seat: 'A-04', status: false },
    ],
  },
  {
    eventName: 'Starlight Premiere Dinner',
    totals: {
      sent: '164',
      checkedIn: '141',
      rate: '86%',
    },
    bars: [14, 32, 48, 58, 72, 91, 96, 73, 44, 21],
    guests: [
      { name: 'Isabella Moretti', seat: 'C-07', status: true },
      { name: 'Daniel Okafor', seat: 'A-01', status: true },
      { name: 'Mina Park', seat: 'B-15', status: true },
    ],
  },
] as const;

function MotionButton({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.985 }}>
      <Link href={href} className={`${className} block`}>
        {children}
      </Link>
    </motion.div>
  );
}

export default function HomePageClient() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [analyticsSnapshotIndex, setAnalyticsSnapshotIndex] = useState(0);

  const backgroundYOne = useTransform(scrollY, [0, 1200], [0, prefersReducedMotion ? 0 : -32]);
  const backgroundYTwo = useTransform(scrollY, [0, 1200], [0, prefersReducedMotion ? 0 : -52]);
  const backgroundYThree = useTransform(scrollY, [0, 1200], [0, prefersReducedMotion ? 0 : -22]);
  const heroFrontY = useTransform(scrollY, [0, 700], [0, prefersReducedMotion ? 0 : -18]);
  const heroBackY = useTransform(scrollY, [0, 700], [0, prefersReducedMotion ? 0 : -10]);
  const heroChipY = useTransform(scrollY, [0, 700], [0, prefersReducedMotion ? 0 : -26]);
  const analyticsSnapshot = ANALYTICS_SNAPSHOTS[analyticsSnapshotIndex];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setAnalyticsSnapshotIndex((current) => (current + 1) % ANALYTICS_SNAPSHOTS.length);
    }, prefersReducedMotion ? 4200 : 2600);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <div className="bg-lp-background text-on-lp-background font-body overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          style={{ y: backgroundYOne }}
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand/20 blur-[120px]"
        />
        <motion.div
          style={{ y: backgroundYTwo }}
          className="absolute top-1/4 -right-48 w-full h-[600px] rounded-full bg-secondary-container/30 blur-[120px]"
        />
        <motion.div
          style={{ y: backgroundYThree }}
          className="absolute -bottom-48 left-1/4 w-[800px] h-[800px] rounded-full bg-tertiary-container/20 blur-[120px]"
        />
      </div>

      <NavBar />

      <main className="relative z-10 pt-28">
        <section className="min-h-[90vh] flex items-center px-6 md:px-12 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: EASE_OUT }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-container/30 border border-brand-container/40 text-on-brand-container text-sm font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                Redefining the Digital Gala
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.08, ease: EASE_OUT }}
                className="font-headline text-6xl md:text-8xl leading-tight text-on-lp-background tracking-tight"
              >
                The Art of <br />
                <span className="italic text-warm">Invitation</span>.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.16, ease: EASE_OUT }}
                className="text-xl md:text-2xl text-on-surface-variant font-light max-w-xl leading-relaxed"
              >
                Elevate your event with cinematic digital curation. A high-end experience that begins the moment they click.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.24, ease: EASE_OUT }}
                className="flex flex-wrap gap-4"
              >
                <MotionButton
                  href="/signup"
                  className="bg-brand hover:bg-brand-dim text-white px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-xl"
                >
                  Get Started
                </MotionButton>
                <MotionButton
                  href="/login"
                  className="bg-white/40 backdrop-blur-md border border-outline-variant/20 hover:bg-white/60 text-on-surface px-8 py-4 rounded-full font-semibold text-lg transition-all"
                >
                  View Sample Event
                </MotionButton>
              </motion.div>
            </div>

            <div className="relative h-[580px] hidden lg:block">
              <motion.div
                initial={{ opacity: 0, y: 32, rotate: 5 }}
                animate={{ opacity: 1, y: 0, rotate: 3 }}
                transition={{ duration: 0.75, delay: 0.2, ease: EASE_OUT }}
                whileHover={prefersReducedMotion ? undefined : { y: -8, rotate: 2 }}
                style={{ y: heroFrontY }}
                className="absolute top-10 left-36 -translate-x-6 -translate-y-1/2 w-[380px] h-[450px] 
                bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl z-30 border border-white/60 p-8 
                flex flex-col justify-between rotate-3"
              >
                <div className="w-full h-56 rounded-2xl bg-gradient-to-br from-brand-container/40 to-secondary-container/40 shadow-inner" >
                  <img src="/img/marriage_party.png" alt="Femi & Chioma Wedding" className='rounded-2xl' width={380} height={500} />
                </div>
                <div className="space-y-3">
                  <h3 className="font-headline text-2xl text-on-lp-background">Femi & Chioma Wedding</h3>
                  <p className="text-sm font-medium text-on-surface-variant uppercase tracking-widest">Transcorp Hilton · 10.24.2025</p>
                  <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center">
                    <span className="text-xs italic text-on-surface-variant">Private Invitation Only</span>
                    <span className="material-symbols-outlined text-brand">arrow_forward</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24, rotate: -15 }}
                animate={{ opacity: 1, y: 0, rotate: -12 }}
                transition={{ duration: 0.7, delay: 0.32, ease: EASE_OUT }}
                style={{ y: heroBackY }}
                className="absolute -top-[10%] right-[2%] w-60 h-72 bg-white/20 backdrop-blur-2xl rounded-[2rem] shadow-xl z-20 border border-white/40 -rotate-12"
              >
                <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-surface-container to-outline-variant/20" >
                  <img src="/img/afro_woman.jpg" alt="Charity Gala" className='rounded-[2rem] w-full h-full object-cover' />
                </div>

              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24, rotate: -9 }}
                animate={{ opacity: 1, y: 0, rotate: -6 }}
                transition={{ duration: 0.7, delay: 0.42, ease: EASE_OUT }}
                whileHover={prefersReducedMotion ? undefined : { y: -6, rotate: -5 }}
                style={{ y: heroChipY }}
                className="absolute bottom-[12%] left-[2%] w-52 h-28 bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg z-40 border border-white/50 p-5 flex flex-col justify-center space-y-2 -rotate-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-on-brand-container">done_all</span>
                  </div>
                  <span className="text-sm font-semibold text-on-lp-background">92% Attending</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand w-[92%] h-full rounded-full" />
                </div>
              </motion.div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-warm/20 rounded-full blur-[80px] z-10" />
            </div>
          </div>
        </section>

        <HeroScroll />

        <section id="gallery" className="py-32 px-6 md:px-12 max-w-screen-2xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <motion.h2 {...revealInView} className="font-headline text-4xl md:text-5xl text-on-lp-background">
              Curation for the Conscious Host
            </motion.h2>
            <motion.p
              {...revealInView}
              transition={{ duration: 0.55, delay: 0.08, ease: EASE_OUT }}
              className="text-on-surface-variant max-w-2xl mx-auto text-lg"
            >
              Beyond a simple link — a sophisticated ecosystem for your most meaningful moments.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <motion.div
              {...revealInView}
              whileHover={prefersReducedMotion ? undefined : { y: -6 }}
              className="md:col-span-7 group relative overflow-hidden rounded-[3rem] bg-surface-container-lowest p-10 md:p-12 shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="space-y-5">
                  <span className="material-symbols-outlined text-4xl text-tertiary">brush</span>
                  <h3 className="font-headline text-3xl text-on-lp-background">Bespoke Design Studio</h3>
                  <p className="text-on-surface-variant text-lg max-w-md">
                    Upload your design, mark the zones, and we composite every invitation automatically.
                  </p>
                </div>
                <div className="pt-10">
                  <motion.div whileHover={prefersReducedMotion ? undefined : { x: 4 }} whileTap={{ scale: 0.985 }}>
                    <Link href="/signup" className="flex items-center gap-2 font-semibold text-brand group-hover:gap-4 transition-all">
                      Explore Studio <span className="material-symbols-outlined">north_east</span>
                    </Link>
                  </motion.div>
                </div>
              </div>
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-tertiary-container/20 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-700" />
            </motion.div>

            <motion.div
              {...revealInView}
              transition={{ duration: 0.6, delay: 0.06, ease: EASE_OUT }}
              whileHover={prefersReducedMotion ? undefined : { y: -6 }}
              className="md:col-span-5 relative overflow-hidden rounded-[3rem] bg-surface-container-low p-10 md:p-12"
            >
              <div className="space-y-5">
                <span className="material-symbols-outlined text-4xl text-brand">diversity_1</span>
                <h3 className="font-headline text-3xl text-on-lp-background">Guest Concierge</h3>
                <p className="text-on-surface-variant text-lg">
                  CSV upload, per-guest personalisation, and real-time check-in tracking.
                </p>
              </div>
              <div className="mt-10 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-container/30 to-secondary-container/30 h-36" >
                <img src="/img/event.jpg" alt="Guest List" className='w-full h-full object-cover' />
              </div>
            </motion.div>

            {[
              { icon: 'card_giftcard', title: 'Bulk Import', desc: 'Upload a CSV of names, seats, and tags to populate all guests instantly.', bg: 'bg-secondary-container', iconColor: 'text-on-secondary-container' },
              { icon: 'photo_library', title: 'QR Generation', desc: 'Every invitation carries a unique QR code. No extras, no duplicates.', bg: 'bg-brand-container', iconColor: 'text-on-brand-container' },
              { icon: 'analytics', title: 'Host Insights', desc: 'Real-time attendance tracking and check-in rate for the modern planner.', bg: 'bg-tertiary-container', iconColor: 'text-on-lp-background' },
            ].map(({ icon, title, desc, bg, iconColor }, index) => (
              <motion.div
                key={title}
                {...revealInView}
                transition={{ duration: 0.55, delay: 0.08 * index, ease: EASE_OUT }}
                whileHover={prefersReducedMotion ? undefined : { y: -5 }}
                className="md:col-span-4 rounded-[3rem] bg-surface-container-lowest p-8 md:p-10 border border-outline-variant/10 space-y-4"
              >
                <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
                </div>
                <h4 className="font-headline text-xl text-on-lp-background">{title}</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-32 px-6 md:px-12 max-w-screen-2xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <motion.div
              {...revealInView}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container/30 border border-secondary-container/40 text-on-secondary-container text-sm font-medium mb-4"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              End-to-End Experience
            </motion.div>
            <motion.h2 {...revealInView} className="font-headline text-4xl md:text-5xl text-on-lp-background">
              Experience the Workflow
            </motion.h2>
            <motion.p
              {...revealInView}
              transition={{ duration: 0.55, delay: 0.08, ease: EASE_OUT }}
              className="text-on-surface-variant max-w-2xl mx-auto text-lg"
            >
              From first upload to final check-in — every touchpoint elevated.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: 'Step 01',
                iconWrap: 'bg-brand-container',
                iconColor: 'text-on-brand-container',
                stepColor: 'text-brand',
                title: 'Organizer Dashboard',
                description: 'Create your event, upload your design, import guests from CSV, and configure every detail — all in one elegant command centre.',
                illustration: (
                  <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-brand-container/30 to-secondary-container/30 relative overflow-hidden">
                    <img src="/img/dashboard.png" alt="Organizer Dashboard" className='w-full h-full object-cover' />
                  </div>
                ),
                extraClass: '',
              },
              {
                step: 'Step 02',
                iconWrap: 'bg-secondary-container',
                iconColor: 'text-on-secondary-container',
                stepColor: 'text-secondary',
                title: 'Guest Experience',
                description: 'Each guest receives a personalised invitation page — their name, seat, and QR code — beautifully composed for any device.',
                illustration: (
                  <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-secondary-container/30 to-tertiary-container/30 relative overflow-hidden flex items-center justify-center">
                    <div className="w-24 h-36 rounded-2xl bg-white/60 backdrop-blur-sm shadow-lg p-3 flex flex-col items-center justify-between">
                      <div className="w-full h-16 rounded-xl bg-gradient-to-br from-brand-container/60 to-secondary-container/60" />
                      <div className="text-center space-y-1">
                        <div className="h-1.5 bg-on-lp-background/20 rounded-full w-12" />
                        <div className="h-1.5 bg-brand/40 rounded-full w-8 mx-auto" />
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-on-lp-background/10 grid grid-cols-3 gap-0.5 p-1">
                        {Array(9).fill(0).map((_, i) => (
                          <div key={i} className="bg-on-lp-background/40 rounded-[1px]" />
                        ))}
                      </div>
                    </div>
                  </div>
                ),
                extraClass: 'md:-mt-8',
              },
              {
                step: 'Step 03',
                iconWrap: 'bg-tertiary-container',
                iconColor: 'text-on-lp-background',
                stepColor: 'text-tertiary',
                title: 'Security Check-In',
                description: 'Security staff scan QR codes at the door. Instant verification, no paper lists, no confusion — just seamless entry.',
                illustration: (
                  <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-tertiary-container/30 to-brand-container/20 relative overflow-hidden flex items-center justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-white/60 shadow-lg grid grid-cols-3 gap-1 p-2">
                        {Array(9).fill(0).map((_, i) => (
                          <div key={i} className={`rounded-[2px] ${[0, 2, 6, 8].includes(i) ? 'bg-on-lp-background/70' : i === 4 ? 'bg-on-lp-background/50' : 'bg-on-lp-background/20'}`} />
                        ))}
                      </div>
                      <div className="absolute -top-1 -left-1 -right-1 h-0.5 bg-green-400 rounded-full animate-pulse" />
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2 bg-green-100/80 backdrop-blur-sm rounded-xl px-3 py-2">
                        <span className="material-symbols-outlined text-green-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="text-xs font-semibold text-green-700">Identity Verified</span>
                      </div>
                    </div>
                  </div>
                ),
                extraClass: '',
              },
            ].map((card, index) => (
              <motion.div
                key={card.title}
                {...revealInView}
                transition={{ duration: 0.6, delay: 0.08 * index, ease: EASE_OUT }}
                whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                className={`group relative rounded-[2.5rem] bg-surface-container-lowest overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 p-8 space-y-6 ${card.extraClass}`}
              >
                <div className={`w-12 h-12 rounded-2xl ${card.iconWrap} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${card.iconColor} text-2xl`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {index === 0 ? 'dashboard' : index === 1 ? 'contact_mail' : 'qr_code_scanner'}
                  </span>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest ${card.stepColor} mb-2`}>{card.step}</p>
                  <h3 className="font-headline text-2xl text-on-lp-background mb-3">{card.title}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{card.description}</p>
                </div>
                {card.illustration}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand via-secondary to-tertiary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-32 px-6 md:px-12 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              {...revealInView}
              whileHover={prefersReducedMotion ? undefined : { y: -6 }}
              className="relative"
            >
              <div className="rounded-[3rem] bg-surface-container-lowest p-6 shadow-xl border border-outline-variant/10 space-y-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-on-lp-background">Event Analytics</p>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={analyticsSnapshot.eventName}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.35, ease: EASE_OUT }}
                        className="text-xs text-on-surface-variant"
                      >
                        {analyticsSnapshot.eventName} · Live
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-100 px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-semibold text-green-700">Live</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Invites Sent', value: analyticsSnapshot.totals.sent, icon: 'send', color: 'bg-brand-container text-on-brand-container' },
                    { label: 'Checked In', value: analyticsSnapshot.totals.checkedIn, icon: 'how_to_reg', color: 'bg-secondary-container text-on-secondary-container' },
                    { label: 'Check-In Rate', value: analyticsSnapshot.totals.rate, icon: 'trending_up', color: 'bg-tertiary-container text-on-lp-background' },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className="rounded-2xl bg-surface-container p-4 space-y-2">
                      <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`${label}-${value}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.3, ease: EASE_OUT }}
                          className="font-headline text-2xl text-on-lp-background"
                        >
                          {value}
                        </motion.div>
                      </AnimatePresence>
                      <div className="text-xs text-on-surface-variant">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-surface-container p-4">
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-4">Check-Ins by Hour</p>
                  <div className="flex items-end gap-1.5 h-20">
                    {analyticsSnapshot.bars.map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.65, ease: EASE_OUT }}
                        className="flex-1 rounded-t-lg bg-brand/30 hover:bg-brand/60 transition-colors"
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {analyticsSnapshot.guests.map(({ name, seat, status }) => (
                      <motion.div
                        key={`${analyticsSnapshot.eventName}-${name}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.35, ease: EASE_OUT }}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-container/60 to-secondary-container/60" />
                          <span className="text-sm font-medium text-on-lp-background">{name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-on-surface-variant">Seat {seat}</span>
                          <span className={`material-symbols-outlined text-base ${status ? 'text-green-500' : 'text-outline-variant'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {status ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand/10 rounded-full blur-[80px] -z-10" />
            </motion.div>

            <div className="space-y-8">
              <motion.div
                {...revealInView}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tertiary-container/30 border border-tertiary-container/40 text-on-lp-background text-sm font-medium"
              >
                <span className="material-symbols-outlined text-sm text-tertiary">insights</span>
                Real-Time Intelligence
              </motion.div>
              <motion.h2 {...revealInView} className="font-headline text-5xl leading-tight text-on-lp-background">
                Insights for the <br />
                <span className="italic text-warm">Perfectionist</span>.
              </motion.h2>
              <motion.p
                {...revealInView}
                transition={{ duration: 0.55, delay: 0.08, ease: EASE_OUT }}
                className="text-xl text-on-surface-variant leading-relaxed"
              >
                Monitor your event with the confidence of a director. Live attendance, check-in velocity, and guest status — all at a glance.
              </motion.p>
              <ul className="space-y-5">
                {[
                  { icon: 'bar_chart', text: 'Real-time check-in charts and attendance curves' },
                  { icon: 'person_search', text: 'Per-guest status — searched, filtered, exported' },
                  { icon: 'notifications_active', text: 'Instant alerts when your first guest arrives' },
                  { icon: 'share', text: 'Share statistics with co-hosts in a single tap' },
                ].map(({ icon, text }, index) => (
                  <motion.li
                    key={text}
                    {...revealInView}
                    transition={{ duration: 0.45, delay: 0.06 * index, ease: EASE_OUT }}
                    className="flex gap-4 items-start"
                  >
                    <div className="w-9 h-9 rounded-2xl bg-tertiary-container/40 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-sm text-on-lp-background">{icon}</span>
                    </div>
                    <span className="text-on-surface leading-relaxed pt-1.5">{text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-32 bg-surface-container/50">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-10">
            <motion.span {...revealInView} className="font-headline italic text-5xl text-warm inline-block">
              &ldquo;
            </motion.span>
            <motion.blockquote
              {...revealInView}
              className="font-headline text-4xl md:text-5xl leading-tight text-on-lp-background italic"
            >
              As an event organizer, I need the invitation, guest flow, and check-in moment to feel seamless. YouAreInvited gave our events the polish of a premium production.
            </motion.blockquote>
            <motion.div {...revealInView} className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-container to-secondary-container ring-4 ring-white shadow-lg" >
                <img src="/img/ifeoluwa.png" alt="Ifeoluwa Oyedepo" className='w-full h-full object-cover rounded-full' />
              </div>
              <cite className="not-italic">
                <div className="font-bold text-lg text-on-lp-background">Ifeoluwa Oyedepo</div>
                <div className="text-on-surface-variant uppercase tracking-widest text-xs font-semibold">Luxury Event Organizer</div>
              </cite>
            </motion.div>
          </div>
        </section>

        <section id="services" className="py-40 px-6 md:px-12 max-w-screen-2xl mx-auto overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-16 md:gap-20">
            <motion.div
              {...revealInView}
              whileHover={prefersReducedMotion ? undefined : { y: -6 }}
              className="w-full md:w-1/2 relative"
            >
              <div className="aspect-[4/5] rounded-[4rem] overflow-hidden shadow-2xl relative z-10 bg-gradient-to-br from-brand-container/40 to-secondary-container/60" >
                <img src="/img/lady_standing.jpg" alt="Organizer Dashboard" className='w-full h-full object-cover' />
              </div>
              <div className="absolute -bottom-10 -right-10 w-64 h-80 bg-secondary-container rounded-[3rem] -z-10 hidden md:block" />
              <div className="absolute -top-10 -left-10 w-64 h-64 bg-brand-container/30 rounded-full blur-3xl -z-10" />
            </motion.div>

            <div className="w-full md:w-1/2 space-y-8 md:pl-8">
              <motion.h2 {...revealInView} className="font-headline text-5xl leading-tight text-on-lp-background">
                Moments That <br />
                <span className="text-brand italic">Live Forever</span>.
              </motion.h2>
              <motion.p
                {...revealInView}
                transition={{ duration: 0.55, delay: 0.08, ease: EASE_OUT }}
                className="text-xl text-on-surface-variant leading-relaxed"
              >
                Every invitation suite created on YouAreInvited is preserved — a cinematic memory of your event, accessible for years to come.
              </motion.p>
              <ul className="space-y-5">
                {[
                  'Personalised invite per guest, generated instantly',
                  'QR check-in — no paper, no queues',
                  'Real-time dashboard control for the host',
                ].map((item, index) => (
                  <motion.li
                    key={item}
                    {...revealInView}
                    transition={{ duration: 0.45, delay: 0.05 * index, ease: EASE_OUT }}
                    className="flex gap-4 items-start"
                  >
                    <span className="material-symbols-outlined text-brand mt-0.5">check_circle</span>
                    <span className="text-on-surface">{item}</span>
                  </motion.li>
                ))}
              </ul>
              <MotionButton
                href="/signup"
                className="inline-block bg-brand hover:bg-brand-dim text-white px-10 py-4 rounded-full font-bold transition-all shadow-lg"
              >
                Start Designing
              </MotionButton>
            </div>
          </div>
        </section>

        {/* <section id="pricing" className="py-32 px-6 md:px-12 max-w-screen-2xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <motion.div
              {...revealInView}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-container/30 border border-brand-container/40 text-on-brand-container text-sm font-medium mb-4"
            >
              <span className="material-symbols-outlined text-sm text-brand">workspace_premium</span>
              Choose Your Tier
            </motion.div>
            <motion.h2 {...revealInView} className="font-headline text-4xl md:text-5xl text-on-lp-background">
              Invest in the Impression
            </motion.h2>
            <motion.p
              {...revealInView}
              transition={{ duration: 0.55, delay: 0.08, ease: EASE_OUT }}
              className="text-on-surface-variant max-w-2xl mx-auto text-lg"
            >
              Every event deserves elegance. Start free, scale with intention.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {[
              {
                tier: 'Social',
                accent: 'text-on-surface-variant',
                price: '$0',
                note: '/event',
                summary: 'For intimate gatherings and first-time hosts.',
                features: ['Up to 50 guests', 'Personalised invitations', 'QR code check-in', 'Basic analytics', 'youareinvited branding'],
                ctaHref: '/signup',
                ctaClass: 'block text-center bg-surface-container hover:bg-surface-container-high text-on-lp-background font-semibold py-3.5 rounded-2xl transition-all',
                ctaLabel: 'Get Started Free',
                wrapperClass: 'rounded-[2.5rem] bg-surface-container-lowest border border-outline-variant/10 p-8 space-y-6 flex flex-col',
                iconColor: 'text-brand',
              },
              {
                tier: 'Professional',
                accent: 'text-brand',
                price: '$49',
                note: '/event',
                summary: 'For professional hosts and corporate events.',
                features: ['Up to 500 guests', 'Custom invitation themes', 'Remove youareinvited branding', 'Event branding (logo + name)', 'Advanced analytics & exports', 'Priority support'],
                ctaHref: '/signup',
                ctaClass: 'block text-center bg-brand hover:bg-brand-dim text-white font-semibold py-3.5 rounded-2xl transition-all shadow-lg',
                ctaLabel: 'Upgrade to Pro',
                wrapperClass: 'rounded-[2.5rem] bg-brand p-0.5 shadow-2xl shadow-brand/20 relative flex flex-col',
                iconColor: 'text-brand',
              },
              {
                tier: 'Elite',
                accent: 'text-warm',
                price: '$199',
                note: '/event',
                summary: 'For galas, premieres, and unforgettable occasions.',
                features: ['Unlimited guests', 'All Professional features', 'Bespoke theme design', 'Dedicated account manager', 'White-glove onboarding', 'Custom domain'],
                ctaHref: '/signup',
                ctaClass: 'block text-center bg-on-lp-background hover:bg-on-surface text-white font-semibold py-3.5 rounded-2xl transition-all',
                ctaLabel: 'Contact for Elite',
                wrapperClass: 'rounded-[2.5rem] bg-surface-container-lowest border border-outline-variant/10 p-8 space-y-6 flex flex-col',
                iconColor: 'text-warm',
              },
            ].map((tier, index) => (
              <motion.div
                key={tier.tier}
                {...revealInView}
                transition={{ duration: 0.6, delay: 0.08 * index, ease: EASE_OUT }}
                whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                className={tier.wrapperClass}
              >
                {tier.tier === 'Professional' ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warm text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                    Most Popular
                  </div>
                ) : null}
                <div className={tier.tier === 'Professional' ? 'rounded-[calc(2.5rem-2px)] bg-surface-container-lowest p-8 space-y-6 flex flex-col flex-1' : ''}>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-widest ${tier.accent} mb-3`}>{tier.tier}</p>
                    <div className="flex items-end gap-1">
                      <span className="font-headline text-5xl text-on-lp-background">{tier.price}</span>
                      <span className="text-on-surface-variant text-sm mb-2">{tier.note}</span>
                    </div>
                    <p className="text-on-surface-variant text-sm mt-2">{tier.summary}</p>
                  </div>
                  <div className="h-px bg-outline-variant/10" />
                  <ul className="space-y-3 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className={`material-symbols-outlined ${tier.iconColor} text-base mt-0.5`} style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="text-sm text-on-surface">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <MotionButton href={tier.ctaHref} className={tier.ctaClass}>
                    {tier.ctaLabel}
                  </MotionButton>
                </div>
              </motion.div>
            ))}
          </div>
        </section> */}

        <section className="relative py-40 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-on-lp-background -z-20" />
          <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-brand/20 blur-[150px] -z-10" />
          <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-warm/20 blur-[150px] -z-10" />
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <motion.div
              {...revealInView}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium mb-4"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-warm animate-pulse" />
              Your next event awaits
            </motion.div>
            <motion.h2 {...revealInView} className="font-headline text-5xl md:text-7xl text-white leading-tight">
              Ready to curate your <br />
              <span className="italic text-warm">next masterpiece?</span>
            </motion.h2>
            <motion.p
              {...revealInView}
              transition={{ duration: 0.55, delay: 0.08, ease: EASE_OUT }}
              className="text-white/60 text-xl max-w-xl mx-auto font-light"
            >
              Join the hosts who have elevated their events from ordinary to extraordinary.
            </motion.p>
            <motion.div
              {...revealInView}
              transition={{ duration: 0.55, delay: 0.14, ease: EASE_OUT }}
              className="flex flex-col md:flex-row items-center justify-center gap-6"
            >
              <MotionButton
                href="/signup"
                className="w-full md:w-auto bg-white text-on-lp-background hover:bg-surface-container-high px-12 py-5 rounded-full font-bold text-xl transition-all"
              >
                Create Your Event
              </MotionButton>
              <motion.a
                href="#"
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                className="w-full md:w-auto bg-transparent border border-white/30 text-white hover:bg-white/10 px-12 py-5 rounded-full font-bold text-xl transition-all"
              >
                Contact Sales
              </motion.a>
            </motion.div>
          </div>
        </section>

        <footer id="journal" className="py-20 px-6 md:px-12 border-t border-outline-variant/10 max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10 md:gap-12">
            <div className="col-span-2 space-y-5">
              <div className="text-3xl font-headline italic text-on-lp-background">YouAreInvited</div>
              <p className="text-on-surface-variant max-w-xs text-sm leading-relaxed">
                A digital invitation platform for those who value elegance, intentionality, and cinematic storytelling.
              </p>
            </div>

            <div className="space-y-4">
              <div className="font-bold text-sm uppercase tracking-widest text-on-lp-background">Platform</div>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {['Features', 'Pricing', 'Showcase', 'Guidelines'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-brand transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="font-bold text-sm uppercase tracking-widest text-on-lp-background">Company</div>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {['Our Story', 'Journal', 'Contact', 'Careers'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-brand transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 space-y-5">
              <div className="font-bold text-sm uppercase tracking-widest text-on-lp-background">Newsletter</div>
              <p className="text-xs text-on-surface-variant">Weekly inspiration for high-end event curation.</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="email address"
                  className="flex-1 bg-surface-container-low rounded-l-full px-6 py-3 text-sm outline-none focus:ring-1 focus:ring-brand border-0"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.985 }}
                  className="bg-on-lp-background text-white px-6 py-3 rounded-r-full hover:bg-brand transition-all"
                >
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </motion.button>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-xs text-on-surface-variant">© {new Date().getFullYear()} YouAreInvited. All Rights Reserved.</div>
            <LegalFooterLinks className="text-xs text-on-surface-variant font-medium" />
          </div>
        </footer>
      </main>
    </div>
  );
}
