'use client';

import { useEffect, useRef } from 'react';

const features = [
  {
    icon: '🎨',
    title: 'Custom Templates',
    desc: 'Upload your own design and brand every invitation with your style.',
  },
  {
    icon: '📱',
    title: 'QR Check-In',
    desc: 'Every guest gets a unique QR code for instant, touchless check-in.',
  },
  {
    icon: '📊',
    title: 'Guest Analytics',
    desc: 'Track attendance in real-time as guests arrive at your event.',
  },
];

export default function FeatureCards() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cards = containerRef.current?.querySelectorAll<HTMLDivElement>('[data-reveal]');
    if (!cards?.length) return;

    cards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(32px)';
      card.style.transition = `opacity 0.5s ease ${i * 0.12}s, transform 0.5s ease ${i * 0.12}s`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLDivElement;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="grid md:grid-cols-3 gap-6">
      {features.map((f) => (
        <div
          key={f.title}
          data-reveal
          className="bg-secondary rounded-xl p-6"
        >
          <div className="text-3xl mb-3">{f.icon}</div>
          <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
          <p className="text-light text-sm leading-relaxed">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}
