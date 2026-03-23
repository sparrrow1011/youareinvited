'use client';

import { motion } from 'framer-motion';

export default function HeroCards() {
  return (
    <div className="relative h-[580px] hidden lg:block">
      {/* Glow behind cards */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-warm/20 rounded-full blur-[80px] z-10" />

      {/* Layer 2 — back card */}
      <motion.div
        className="absolute top-[8%] right-[2%] w-60 h-72 bg-white/20 backdrop-blur-2xl rounded-[2rem] shadow-xl z-20 border border-white/40 -rotate-12 overflow-hidden"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      >
        <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-surface-container to-outline-variant/20" />
      </motion.div>

      {/* Layer 1 — main card */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[500px] bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl z-30 border border-white/60 p-8 flex flex-col justify-between rotate-3"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-full h-56 rounded-2xl bg-gradient-to-br from-brand-container/40 to-secondary-container/40 shadow-inner" />
        <div className="space-y-3">
          <h3 className="font-headline text-2xl text-on-lp-background">The Golden Hour Soirée</h3>
          <p className="text-sm font-medium text-on-surface-variant uppercase tracking-widest">Beverly Hills · 10.24.2025</p>
          <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center">
            <span className="text-xs italic text-on-surface-variant">Private Invitation Only</span>
            <span className="material-symbols-outlined text-brand">arrow_forward</span>
          </div>
        </div>
      </motion.div>

      {/* Layer 3 — floating chip */}
      <motion.div
        className="absolute bottom-[12%] left-[2%] w-52 h-28 bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg z-40 border border-white/50 p-5 flex flex-col justify-center space-y-2 -rotate-6"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
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
    </div>
  );
}
