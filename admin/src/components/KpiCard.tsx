'use client';

import { useEffect, useRef, useState } from 'react';

interface KpiCardProps {
  label: string;
  value: number | string;
}

export default function KpiCard({ label, value }: KpiCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const isNumber = typeof value === 'number';
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!isNumber) return;
    const target = value as number;
    const duration = 800;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, isNumber]);

  return (
    <div className="bg-secondary rounded-xl p-6">
      <p className="text-light text-sm mb-2">{label}</p>
      <p className="text-white text-3xl font-bold">
        {isNumber ? displayed.toLocaleString() : value}
      </p>
    </div>
  );
}
