# Landing Page Redesign — Spec

**Date:** 2026-03-23
**Scope:** `web/` — public landing page only (`/`). Authenticated app (dashboard, events, invitations) is unchanged.

---

## Goals

Replace the current dark navy/Three.js landing page with a premium light glassmorphism aesthetic. The hero explains the core product flow through a scroll-driven storytelling sequence. Everything should feel cinematic, elegant, and production-ready.

---

## Design Direction

- **Feel:** premium, elegant, cinematic, slightly futuristic but not flashy
- **Avoid:** generic SaaS look, clutter, neon overuse, childish UI
- **Typography:** Noto Serif (headlines, italic accents) + Manrope (body, labels)
- **Existing dark tokens** (`primary: #1a1a2e`, `secondary: #16213e`, `accent: #e94560`, `light: #a8dadc`) remain in Tailwind for the authenticated app — never overwritten

---

## Prerequisites

Run before implementation:
```bash
cd web && npm install framer-motion
```

`framer-motion` is not currently in `web/package.json` — it must be installed before `HeroScroll.tsx` can be written.

---

## Files Changed

| File | Change |
|---|---|
| `web/tailwind.config.js` | Add Noto Serif + Manrope font families; add new light color tokens (see table below) |
| `web/src/app/layout.tsx` | Add Noto Serif + Manrope via `next/font/google` with CSS variables; expose variables to Tailwind |
| `web/src/app/page.tsx` | Complete rewrite — server component, redirects auth users to `/dashboard` |
| `web/src/components/NavBar.tsx` | New — client component for landing nav (requires `usePathname` for active link) |
| `web/src/components/HeroScroll.tsx` | New — scroll-driven product storytelling (client component) |
| `web/src/components/ThreeHero.tsx` | Retired from landing page (kept in codebase, no longer imported) |
| `web/src/components/FeatureCards.tsx` | Retired from landing page (kept in codebase, no longer imported) |

---

## Tailwind Color Token Table

All new tokens are added alongside existing dark tokens. No existing token is renamed or overwritten.

| Token name | Hex | Usage |
|---|---|---|
| `brand` | `#006b5f` | Landing page primary CTA, teal accent |
| `brand-dim` | `#005e53` | Hover state for brand buttons |
| `brand-container` | `#73f2dd` | Aurora blob, pill badge background |
| `on-brand-container` | `#00594f` | Text on brand-container |
| `warm` | `#a04223` | Landing page secondary accent (italic headline word) |
| `tertiary` | `#b91156` | Tertiary accent (icon colours in bento) |
| `tertiary-container` | `#ff9cb3` | Aurora blob |
| `lp-background` | `#f9f9fb` | Landing page page background |
| `on-lp-background` | `#2f3336` | Landing page default text |
| `on-surface` | `#2f3336` | Body text |
| `on-surface-variant` | `#5c5f63` | Muted/secondary body text |
| `surface-container-lowest` | `#ffffff` | Bento card background (white cards) |
| `surface-container-low` | `#f3f3f6` | Bento card background (off-white) |
| `surface-container` | `#eceef1` | Section background |
| `surface-container-high` | `#e6e8ec` | Hover state backgrounds |
| `secondary-container` | `#ffdbd0` | Aurora blob |
| `on-secondary-container` | `#8e3517` | Text on secondary-container |
| `outline-variant` | `#afb2b6` | Dividers, subtle borders |
| `outline` | `#777b7f` | More visible borders |

**Font families added to Tailwind:**
```js
fontFamily: {
  headline: ['var(--font-noto-serif)', 'Georgia', 'serif'],
  body: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
  label: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
}
```

**`layout.tsx` font loading (next/font/google):**
```tsx
import { Noto_Serif, Manrope } from 'next/font/google';
const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif', style: ['normal', 'italic'] });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
// Apply: <body className={`${notoSerif.variable} ${manrope.variable} ...`}>
```

---

## Page Sections

### 1. NavBar (client component — `NavBar.tsx`)

Must be a client component to use `usePathname` for active link detection.

- `position: fixed`, `top: 0`, `z-50`, full width
- Background: `bg-white/60 backdrop-blur-xl` with subtle bottom shadow
- Left: italic serif logo "YouAreInvited" in `on-lp-background`
- Centre: anchor links (`hidden md:flex`) — Gallery, Services, Pricing, Journal
- Right: "Sign In" text → `/login`; "Create Event" pill → `/signup`

**Anchor targets:**

| Link | `href` | Scrolls to |
|---|---|---|
| Gallery | `#gallery` | Feature bento grid section |
| Services | `#services` | Asymmetric image+text section |
| Pricing | `#pricing` | Dark CTA section |
| Journal | `#journal` | Footer |

Active link: teal bottom border (`border-b-2 border-brand`). Active state: when `pathname === '/'`, treat all links as potentially active; track with `IntersectionObserver` on section IDs, or simplify by making active link state based on scroll position. If this is complex, defer active-link tracking and use static styling for v1 (no `usePathname` needed, NavBar can be a server component).

---

### 2. Above-the-Fold Hero (static, in `page.tsx`)

Two-column layout (`lg:grid-cols-2 gap-16`):

**Left column — text:**
- Pill badge: `bg-brand-container/30 border border-brand-container/40 text-on-brand-container` — "Redefining the Digital Gala" with `bg-brand animate-pulse` dot
- H1 (`font-headline text-6xl md:text-8xl`): `The Art of` + line break + `*Invitation*.` where "Invitation" is `italic text-warm`
- Subheading: `text-on-surface-variant font-light text-xl`
- CTA row: "Get Started" → `/signup` (`bg-brand text-white rounded-full`); "View Sample Event" → `/login` (`bg-white/40 backdrop-blur border border-outline-variant/20 rounded-full`)

**Right column — glassmorphism card stack (`hidden lg:block`):**

All images in the card stack use a CSS gradient placeholder (no external image URLs required — avoids dependency on lh3.googleusercontent.com which may not be stable):
- Layer 1 (front card, `z-30 rotate-3`): `bg-white/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/60` — contains a `rounded-2xl bg-gradient-to-br from-brand-container/40 to-secondary-container/40 h-64` placeholder image area, event title "The Golden Hour Soirée", date, arrow icon
- Layer 2 (back card, `z-20 -rotate-12`): `bg-white/20 backdrop-blur-2xl rounded-[2rem] border border-white/40` — `bg-gradient-to-br from-surface-container to-outline-variant/20` placeholder, greyscale-style muted colours
- Layer 3 (floating chip, `z-40 -rotate-6`): `bg-white/80 backdrop-blur-xl rounded-3xl` — "92% Attending" + progress bar
- Aurora glow blob behind stack: `bg-warm/20 rounded-full blur-[80px]`

---

### 3. Scroll Storytelling (`HeroScroll.tsx`)

**Outer container:** `ref={outerRef}` at `h-[500vh]` — provides scroll distance.

**Sticky inner:** `position: sticky; top: 0; height: 100vh; overflow: hidden` — stays pinned while outer scrolls.

**Framer Motion scroll binding:**
```tsx
const outerRef = useRef(null);
const { scrollYProgress } = useScroll({
  target: outerRef,
  offset: ['start start', 'end end'],  // maps full outer scroll range to 0→1
});
```

**Step opacity mapping (6 equal bands):**

Each step `i` (0–5) gets an `opacity` derived from `scrollYProgress` via `useTransform`:
- Active range: `[i/6, (i+0.5)/6, (i+1)/6]` → `[0, 1, 0]`
- Slightly overlap fade-in/out: fade in over first 20% of band, hold for 60%, fade out over last 20%

**6 steps:**

| # | Step title | Description | Right-side UI |
|---|---|---|---|
| 1 | Create Event | "Start with a blank canvas" | Form card: event name field + date field + "Create" button |
| 2 | Personalize Invite | "Design your perfect invite" | Invitation card with soft pulsing glow on the name zone area |
| 3 | Generate QR | "Each guest gets a unique code" | Same card + QR code square materialises with scan-line animation |
| 4 | Share | "Deliver to everyone instantly" | Card in phone-perspective (`rotateY(-15deg)`) + "Sent to 47 guests ✓" floating badge |
| 5 | Check-in | "Check in with a scan" | QR circle with pulsing ring → morphs to green checkmark |
| 6 | Dashboard | "Real-time event control" | Mini stats panel: Total Guests / Checked In / Check-in Rate with progress bar |

**Layout inside sticky container:**
- Two columns: left = step counter + title + description; right = animated UI card
- Side progress dots: 6 vertical dots (`w-2 h-2 rounded-full`), active dot filled `bg-brand`
- Background: subtle aurora colour shift per step (using `useTransform` on a teal→warm gradient opacity)

---

### 4. Feature Bento Grid (`id="gallery"`)

`md:grid-cols-12 gap-8`:

- Large card (col-span-7): "Bespoke Design Studio" — `rounded-[3rem] bg-surface-container-lowest p-12` — brush icon (`text-tertiary`), headline, description, arrow CTA, ambient glow on hover
- Tall card (col-span-5): "Guest Concierge" — `bg-surface-container-low` — diversity icon (`text-brand`), gradient placeholder image
- Three small cards (col-span-4 each):
  - "Integrated Registry" (`bg-white border border-outline-variant/10`) — gift icon in `bg-secondary-container` circle
  - "Cinematic Gallery" — photo icon in `bg-brand-container` circle
  - "Host Insights" — analytics icon in `bg-tertiary-container` circle

---

### 5. Testimonial

Centred, `max-w-4xl`. Large `"` opener in `font-headline italic text-4xl text-warm`. Blockquote `font-headline text-4xl md:text-5xl italic`. Avatar: `w-16 h-16 rounded-full bg-gradient-to-br from-brand-container to-secondary-container` (CSS gradient, no image). Name + title below.

---

### 6. Asymmetric Image + Text (`id="services"`)

`flex-col md:flex-row gap-20`:
- Left: `aspect-[4/5] rounded-[4rem] bg-gradient-to-br from-brand-container/40 to-secondary-container/60` decorative image stand-in. Offset rectangle behind: `bg-secondary-container rounded-[3rem] -z-10`. Blur orb top-left.
- Right: headline `font-headline text-5xl`, italic `text-brand` span, paragraph, 3 bullet items with `check_circle` Material Symbol icons in `text-brand`, CTA button.

---

### 7. Dark CTA (`id="pricing"`)

`bg-on-lp-background` full-width section. Aurora blobs (teal + tertiary, `blur-[150px]`). White text headline `text-5xl md:text-7xl font-headline`. Two buttons: "Create Event" (`bg-white text-on-lp-background rounded-full`) → `/signup`; "Contact Sales" (glass outline `border-white/30 text-white`) → `#` for now.

---

### 8. Footer (`id="journal"`)

6-column grid (`lg:grid-cols-6`). Brand col (logo + tagline). Platform links. Company links. Newsletter form (email input + arrow submit button — non-functional, visual only). Bottom bar: © + legal links.

---

## Aurora Background (Global, `page.tsx`)

Three `fixed` blurred orbs, `pointer-events-none`, `z-0`:
- Top-left: `w-96 h-96 rounded-full bg-brand/20 blur-[120px]`
- Right: `w-full h-[600px] rounded-full bg-secondary-container/30 blur-[120px]`
- Bottom-left: `w-[800px] h-[800px] rounded-full bg-tertiary-container/20 blur-[120px]`

---

## Material Symbols Icons

Used in bento grid and bullets. Load via Google CDN in `layout.tsx`:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0" />
```
Usage: `<span className="material-symbols-outlined">brush</span>`

---

## Out of Scope

- Dark mode toggle (light-only for now)
- Pricing section content (placeholder CTA only)
- Gallery, Journal sub-pages
- Mobile hamburger menu (nav links hidden on mobile for v1)
- Active nav link scroll-tracking (static styling for v1, can be enhanced later)
- Authenticated app restyling (separate spec)
- Real newsletter form submission
- "Contact Sales" destination
