# Homepage Redesign & Route Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the internal-only homepage with a public SaaS landing page (Three.js split hero, e-invite mockup, scroll-reveal feature cards), fix the broken logout cookie name, and redirect `/admin` → `/dashboard`.

**Architecture:** `web/src/app/page.tsx` becomes a Next.js Server Component that checks the `access_token` cookie and redirects authenticated users to `/dashboard`; unauthenticated users see the landing page. A dynamically imported (`ssr: false`) `ThreeHero` client component renders the full-viewport Three.js background canvas. The feature cards section uses a native Intersection Observer for scroll-reveal (no new dependencies). Route fixes are small targeted edits.

**Tech Stack:** Next.js 14 App Router, Three.js, Tailwind CSS (existing tokens: `primary #1a1a2e`, `secondary #16213e`, `accent #e94560`, `light #a8dadc`). Skills: `@threejs`, `@scroll-animations`, `@text-animations`.

**Spec:** `docs/superpowers/specs/2026-03-22-homepage-admin-redesign.md` — Workstreams 1 & 2.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `web/src/app/logout/route.ts` | Modify | Fix cookie name `site_auth` → `access_token` |
| `web/src/app/admin/page.tsx` | Delete | Old single-tenant admin page |
| `web/next.config.js` | Modify | Add `/admin` → `/dashboard` permanent redirect |
| `web/src/middleware.ts` | Modify | Add `/` to `PUBLIC_PATHS` |
| `web/package.json` | Modify | Add `three` and `@types/three` |
| `web/tailwind.config.js` | Modify | Add `float` and `fadeUp` keyframe animations |
| `web/src/components/ThreeHero.tsx` | Create | Three.js floating invitation cards scene (client, `ssr: false`) |
| `web/src/components/FeatureCards.tsx` | Create | Scroll-reveal feature cards section (client) |
| `web/src/app/page.tsx` | Rewrite | SaaS landing page (server component) |

---

## Task 1: Route fixes — logout cookie + admin redirect

**What:** Three tiny fixes with no dependencies. Do them together in one commit.

**Files:**
- Modify: `web/src/app/logout/route.ts`
- Delete: `web/src/app/admin/page.tsx`
- Modify: `web/next.config.js`

- [ ] **Step 1: Fix logout cookie name**

Current file at `web/src/app/logout/route.ts` clears `site_auth` — the old cookie name. The app now uses `access_token`. Replace the whole file:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', req.url));

  res.cookies.set('access_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return res;
}
```

- [ ] **Step 2: Delete the old admin page**

Delete the file `web/src/app/admin/page.tsx`. This page is superseded by `/dashboard` + `/events/[id]` and has a broken create-invitation form (missing `event` field). It should not be accessible.

```bash
rm web/src/app/admin/page.tsx
```

- [ ] **Step 3: Add `/admin` → `/dashboard` permanent redirect in next.config.js**

Current `web/next.config.js` has an `async rewrites()` block but no redirects. Add one:

```js
/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
      },
      {
        protocol: 'https',
        hostname: 'event-invitation-backend.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${BACKEND_URL}/media/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

- [ ] **Step 4: Verify build passes**

```bash
cd web && npm run build
```

Expected: no errors. If the deleted `admin/page.tsx` is referenced anywhere, the build will tell you which file — trace and remove the reference.

- [ ] **Step 5: Commit**

```bash
cd web
git add src/app/logout/route.ts next.config.js
git rm src/app/admin/page.tsx
git commit -m "fix: clean up routes — fix logout cookie name, delete /admin, add /admin redirect"
```

---

## Task 2: Middleware — make `/` public

**What:** Add `/` to `PUBLIC_PATHS` so unauthenticated visitors can see the landing page instead of being redirected to `/login`.

**Files:**
- Modify: `web/src/middleware.ts`

- [ ] **Step 1: Update PUBLIC_PATHS**

Open `web/src/middleware.ts`. The current `PUBLIC_PATHS` set is:

```typescript
const PUBLIC_PATHS = new Set([
  '/login', '/logout', '/signup',
  '/security/login', '/security/logout',
]);
```

Add `'/'`:

```typescript
const PUBLIC_PATHS = new Set([
  '/', '/login', '/logout', '/signup',
  '/security/login', '/security/logout',
]);
```

No other changes needed — the rest of the middleware is already correct.

- [ ] **Step 2: Verify build passes**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd web
git add src/middleware.ts
git commit -m "feat: make / a public route for landing page"
```

---

## Task 3: Install Three.js + add Tailwind animations

**What:** Add Three.js as a dependency and add `float` / `fadeUp` CSS animation tokens to Tailwind so the homepage components can use them.

**Files:**
- Modify: `web/package.json`
- Modify: `web/tailwind.config.js`

> **Reference skill:** `@threejs` — The Three.js scene uses `WebGLRenderer`, `PlaneGeometry`, `MeshBasicMaterial`, `Points`, and a `requestAnimationFrame` loop.

- [ ] **Step 1: Install Three.js**

```bash
cd web && npm install three && npm install --save-dev @types/three
```

Expected: `three` appears in `dependencies` and `@types/three` in `devDependencies` in `package.json`.

- [ ] **Step 2: Add Tailwind animation tokens**

Replace `web/tailwind.config.js` with:

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
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#e94560',
        light: '#a8dadc',
      },
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

- [ ] **Step 3: Verify build passes**

```bash
cd web && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd web
git add package.json package-lock.json tailwind.config.js
git commit -m "feat: add three.js dependency and float/fadeUp tailwind animations"
```

---

## Task 4: ThreeHero component

**What:** A client component that fills its container with a Three.js scene — 8 invitation card planes floating and slowly rotating in dark space, with 200 red particles drifting between them and subtle camera drift. Cleans up on unmount. Falls back gracefully if WebGL is unavailable (the CSS background color `bg-primary` shows through).

**Files:**
- Create: `web/src/components/ThreeHero.tsx`

> **Reference skill:** `@threejs` — Level 1 (scene setup, render loop) and Level 3 Animations (per-frame updates).

- [ ] **Step 1: Create ThreeHero.tsx**

```typescript
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeHero() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a2e');

    // Camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 8);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      // WebGL unavailable — component returns null, CSS background shows
      return;
    }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Invitation card planes
    const cardGeo = new THREE.PlaneGeometry(1.4, 2.0);
    const cards: THREE.Mesh[] = [];
    const vels: { rx: number; ry: number; vx: number; vy: number }[] = [];

    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: '#16213e',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(cardGeo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      scene.add(mesh);
      cards.push(mesh);
      vels.push({
        rx: (Math.random() - 0.5) * 0.004,
        ry: (Math.random() - 0.5) * 0.004,
        vx: (Math.random() - 0.5) * 0.006,
        vy: (Math.random() - 0.5) * 0.004,
      });
    }

    // Particles
    const particleCount = 200;
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 20;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: '#e94560',
      size: 0.06,
      transparent: true,
      opacity: 0.5,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // Animate
    let frameId: number;
    let t = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      t += 0.005;

      cards.forEach((card, i) => {
        card.rotation.x += vels[i].rx;
        card.rotation.y += vels[i].ry;
        card.position.x += vels[i].vx;
        card.position.y += vels[i].vy;
        // Bounce off invisible walls
        if (Math.abs(card.position.x) > 9) vels[i].vx *= -1;
        if (Math.abs(card.position.y) > 7) vels[i].vy *= -1;
      });

      // Camera drift
      camera.position.x = Math.sin(t * 0.12) * 0.6;
      camera.position.y = Math.cos(t * 0.09) * 0.4;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const w2 = mount.clientWidth;
      const h2 = mount.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      cardGeo.dispose();
      pGeo.dispose();
      pMat.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd web && npm run build
```

If you see a TypeScript error like "Cannot find module 'three'", ensure `npm install three @types/three` ran successfully in Task 3.

- [ ] **Step 3: Commit**

```bash
cd web
git add src/components/ThreeHero.tsx
git commit -m "feat: add ThreeHero client component — floating invitation cards scene"
```

---

## Task 5: Homepage — SaaS landing page

**What:** Rewrite `web/src/app/page.tsx` as a Server Component. It reads the `access_token` cookie via `next/headers` and redirects authenticated users to `/dashboard`. Unauthenticated users see: full-viewport Three.js background (dynamically imported), split hero (left: animated headline + CTAs, right: e-invite card mockup with float animation), and scroll-reveal feature cards below the fold.

**Files:**
- Create: `web/src/components/FeatureCards.tsx`
- Rewrite: `web/src/app/page.tsx`

> **Reference skills:** `@text-animations` (hero headline `animate-fadeUp`), `@scroll-animations` (Intersection Observer on feature cards).

- [ ] **Step 1: Create FeatureCards client component**

The feature cards need an Intersection Observer for scroll-reveal, so they must be a client component. Server components cannot use `useEffect`.

Create `web/src/components/FeatureCards.tsx`:

```typescript
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

    // Start hidden
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
```

- [ ] **Step 2: Rewrite page.tsx as a server component**

Replace the entire contents of `web/src/app/page.tsx`:

```typescript
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
```

**Note on `animate-fadeUp` initial state:** The `style={{ opacity: 0 }}` on hero elements sets them invisible before the CSS animation fires. The `animate-fadeUp` keyframe starts at `opacity: 0` and ends at `opacity: 1` with `animation-fill-mode: forwards` (set in tailwind config). This achieves a staggered text entrance without JavaScript.

- [ ] **Step 3: Verify build passes**

```bash
cd web && npm run build
```

Common issues:
- If you see "cookies() is not allowed in client components" — make sure `page.tsx` has **no** `'use client'` directive at the top.
- If you see a TypeScript error about `redirect` — import it from `next/navigation` (not `next/router`).
- If you see "Cannot find name 'THREE'" in ThreeHero — ensure `@types/three` is installed.

- [ ] **Step 4: Smoke test in browser**

```bash
cd web && npm run dev
```

1. Visit `http://localhost:3000` — you should see the landing page with the Three.js background
2. The e-invite mockup card on the right should gently float up and down
3. Scroll down — the three feature cards should fade up into view as they enter the viewport
4. While logged out: click "Get Started Free" → should go to `/signup`; "Sign In" → should go to `/login`
5. Log in, then visit `http://localhost:3000` — should immediately redirect to `/dashboard`
6. Visit `http://localhost:3000/admin` — should redirect to `/dashboard` (308 permanent redirect)
7. Log out, visit `http://localhost:3000/admin` — should redirect to `/dashboard` (Next.js redirect runs before middleware auth check for this route)

- [ ] **Step 5: Commit**

```bash
cd web
git add src/app/page.tsx src/components/FeatureCards.tsx
git commit -m "feat: homepage SaaS landing page — split hero, Three.js background, scroll-reveal features"
```
