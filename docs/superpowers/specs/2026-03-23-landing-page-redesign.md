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
- **Color palette:** light background (`#f9f9fb`), teal primary (`#006b5f`), warm secondary (`#a04223`), glassmorphism whites with opacity
- **Typography:** Noto Serif (headlines, italic accents) + Manrope (body, labels)
- **Existing dark tokens** (`primary: #1a1a2e` etc.) remain in Tailwind for the authenticated app

---

## Files Changed

| File | Change |
|---|---|
| `web/tailwind.config.js` | Add Noto Serif + Manrope font families; add full new color token set |
| `web/src/app/layout.tsx` | Add Google Fonts `<link>` for Noto Serif + Manrope |
| `web/src/app/page.tsx` | Complete rewrite — server component, redirects auth users to `/dashboard` |
| `web/src/components/HeroScroll.tsx` | New — scroll-driven product storytelling (client component) |
| `web/src/components/ThreeHero.tsx` | Retired from landing page (kept in codebase, no longer imported) |
| `web/src/components/FeatureCards.tsx` | Retired from landing page (kept in codebase, no longer imported) |

---

## Page Sections

### 1. Navigation (sticky, glassmorphism)

- `position: fixed`, `top: 0`, `z-50`
- Background: `bg-white/60 backdrop-blur-xl` with subtle bottom shadow
- Left: italic serif logo "YouAreInvited"
- Centre: anchor links (hidden on mobile) — Gallery, Services, Pricing, Journal
- Right: "Sign In" text button → `/login`; "Create Event" pill button → `/signup`

**Anchor targets:**

| Link | `href` | Section |
|---|---|---|
| Gallery | `#gallery` | Feature bento grid |
| Services | `#services` | Asymmetric image+text |
| Pricing | `#pricing` | Dark CTA section |
| Journal | `#journal` | Footer |

Active link: bottom border underline in primary teal.

---

### 2. Above-the-Fold Hero (static)

Two-column layout (`lg:grid-cols-2`):

**Left column — text:**
- Pill badge: "Redefining the Digital Gala" with pulse dot
- H1: `The Art of` / `*Invitation*.` (italic serif accent word)
- Subheading: "Elevate your event with cinematic digital curation…"
- Two CTAs: "Get Started" (filled primary) + "View Sample Event" (glass outline)

**Right column — glassmorphism card stack (decorative, `hidden lg:block`):**
- Layer 1 (front): large rotated glass card with event title, date, arrow — `rotate-3`
- Layer 2 (back): smaller card, greyscale image, `−rotate-12`
- Layer 3: floating UI chip "92% Attending" with progress bar — `−rotate-6`
- Aurora glow blob behind stack

---

### 3. Scroll Storytelling Hero (`HeroScroll.tsx`)

A `500vh` tall outer `<div>` with a sticky inner container pinned at `top: 0; height: 100vh`.

**Framer Motion approach:**
- `useScroll({ target: outerRef })` gives `scrollYProgress` (0 → 1)
- Divide progress into 6 equal bands (each ~0.167)
- Each step has an `opacity` that peaks at its band centre and fades at edges
- `useTransform` maps each step's `opacity` value

**6 steps — left text + right UI mockup card:**

| # | Step | UI Mockup | Left Text |
|---|---|---|---|
| 1 | Create Event | Form card: event name + date fields | "Start with a blank canvas" |
| 2 | Personalize Invite | Invitation card with glowing name zone | "Design your perfect invite" |
| 3 | Generate QR | Same card + QR code materialises with scanning line | "Each guest gets a unique code" |
| 4 | Share | Card perspective-shifts to phone view, "Sent to 47 guests" badge | "Deliver to everyone instantly" |
| 5 | Check-in | QR pulse ring → green checkmark | "Check in with a scan" |
| 6 | Dashboard | Card expands to stats panel (Total / Checked In / Rate) | "Real-time event control" |

Step transitions: `opacity` cross-fade + subtle `y` translate (20px up). The right-side card morphs between step states. Background aurora blobs shift hue per step.

**Layout:** Two columns inside the sticky container. Left: step number, title, description. Right: the animated UI mockup card. Progress dots on the side (6 dots, active one filled).

---

### 4. Feature Bento Grid (`id="gallery"`)

Editorial bento: `md:grid-cols-12`.

- Large card (col-span-7): "Bespoke Design Studio" — icon, headline, description, arrow CTA, ambient glow on hover
- Tall card (col-span-5): "Guest Concierge" — icon, headline, description, image
- Three equal small cards (col-span-4 each): Integrated Registry, Cinematic Gallery, Host Insights

Card style: `rounded-[3rem]`, `bg-surface-container-lowest`, hover shadow transition.

---

### 5. Testimonial (editorial)

Centred, constrained max-width. Large opening quote in serif italic. Blockquote headline at `text-4xl md:text-5xl` italic. Avatar ring + name + title below.

---

### 6. Asymmetric Image + Text (`id="services"`)

Two-column flex. Left: tall `aspect-[4/5]` image with `rounded-[4rem]`, decorative offset rectangle behind. Right: headline, paragraph, 3 bullet points with check icons, CTA button.

---

### 7. Dark CTA Section (`id="pricing"`)

Full-width dark background (`bg-on-background`). Dual aurora glows (teal + tertiary). Centred: large headline, subtext, two buttons — "Create Event" (white filled) + "Contact Sales" (glass outline).

---

### 8. Footer (`id="journal"`)

6-column grid. Brand column (logo + description). Platform links. Company links. Newsletter form (email input + arrow button). Bottom bar: copyright + legal links.

---

## Aurora Background

Three fixed blurred orbs behind the entire page (pointer-events none, z-0):
- Top-left: `bg-primary/20`, `blur-[120px]`
- Right: `bg-secondary-container/30`
- Bottom-left: `bg-tertiary-container/20`

---

## Framer Motion Dependency

`framer-motion` is already installed in `web/`. The `HeroScroll` component uses:
- `useScroll` + `useTransform` — scroll progress to step opacity
- `motion.div` — opacity/y spring transitions between steps
- No `AnimatePresence` needed (opacity-based, not mount/unmount)

---

## Out of Scope

- Dark mode toggle (light-only for now)
- Pricing section content (placeholder CTA only)
- Gallery, Journal sub-pages
- Mobile nav menu (hamburger) — nav links hidden on mobile for now
- Authenticated app restyling (separate spec)
