# Homepage Redesign, Route Cleanup & Super-Admin App

**Date:** 2026-03-22
**Status:** Approved for implementation

---

## Goal

Three parallel workstreams:
1. Replace the old internal homepage with a SaaS marketing landing page
2. Clean up orphaned/broken routes in the existing `web` app
3. Build a new standalone super-admin Next.js app for platform management

---

## Workstream 1 — Homepage Redesign (`web` app)

### What changes

`/` becomes a public SaaS marketing landing page. Currently it is blocked by JWT auth (middleware redirects unauthenticated visitors to `/login`) and shows an outdated "Event Invitation System" page with links to `/admin` and `/security`.

### Layout: Split Hero (B)

- **Left column:** Brand name `YouAreInvited` animates in (text-animations skill), tagline, two CTAs: "Get Started Free" → `/signup` and "Sign In" → `/login`
- **Right column:** Styled HTML e-invite card mockup (floating animation) showing a sample guest invitation — name, seat, tag, QR placeholder
- **Background:** Three.js canvas fills the full viewport behind the layout. Scene: multiple invitation cards rendered as 3D planes, floating and slowly rotating in dark space with particle drift between them. WebGL fallback: static dark gradient.
- **Below the fold:** Three feature cards (Custom Templates, QR Check-In, Guest Analytics) with scroll-reveal entrance (scroll-animations skill). Accent number/stat animations on any metrics (accent-animations skill).

### Auth-aware routing

- Unauthenticated: see the landing page
- Authenticated (has `access_token` cookie): middleware check in `page.tsx` using `cookies()` (server component) redirects to `/dashboard`
- Add `/` to `PUBLIC_PATHS` in `web/src/middleware.ts`

### Files changed

- `web/src/app/page.tsx` — full rewrite
- `web/src/middleware.ts` — add `/` to PUBLIC_PATHS
- `web/package.json` — add `three`, `@types/three` if not present

---

## Workstream 2 — Route Cleanup (`web` app)

### Problems to fix

| Route | Problem | Fix |
|-------|---------|-----|
| `/admin` | Old single-tenant page, broken (missing `event` field on create), superseded by `/dashboard` + `/events/[id]` | Delete `web/src/app/admin/page.tsx`, add permanent redirect (`permanent: true`) `/admin` → `/dashboard` in `next.config.js` redirects array |
| `/logout` (route.ts) | Clears `site_auth` cookie (old pre-SaaS cookie name) instead of `access_token` | Update to clear `access_token` cookie. No refresh-token cookie exists — simplejwt refresh tokens are returned in response body only, not stored in a cookie, so no second cookie to clear. |

### Files changed

- `web/src/app/admin/page.tsx` — deleted
- `web/src/app/logout/route.ts` — fix cookie name `site_auth` → `access_token`
- `web/next.config.js` — add `{ source: '/admin', destination: '/dashboard', permanent: true }` to `redirects()`

---

## Workstream 3 — Super-Admin App (new `admin/` Next.js app)

### Architecture

A separate Next.js 14 app at `admin/` in the repo root (alongside `web/` and `backend/`). Deployed as a separate Vercel project. Calls the same Django backend with a shared secret header.

```
/
├── backend/        # Django (existing)
├── web/            # Organizer frontend (existing)
└── admin/          # NEW — platform super-admin
```

### Authentication

**Login flow (server-side only — secret never touches the browser):**

1. User enters password on the login page (`admin/src/app/page.tsx`, a Server Component or using a Server Action)
2. The form POST is handled by a Next.js API route: `admin/src/app/api/login/route.ts` (server-side)
3. The route handler reads `SUPER_ADMIN_SECRET` from `process.env` and compares it to the submitted password
4. On match: sets `admin_token` cookie (value = the secret, `httpOnly: false`, `sameSite: 'lax'`, `secure` in production, `maxAge: 86400` — 24-hour expiry)
5. On failure: returns 401

**Token forwarding on API calls:**

The `admin_token` cookie is non-httpOnly and readable by client-side JS. The Axios instance in `lib/api.ts` reads it directly via `js-cookie` and attaches it as the `X-Super-Admin-Token` header on all requests to the Django backend.

Alternatively (simpler for a v1 internal tool with low XSS risk): set `admin_token` as a non-httpOnly cookie so the Axios interceptor can read it directly. Given this is an internal admin tool with no public user input, this is acceptable. **Implementation decision: use non-httpOnly cookie for simplicity.** Document the tradeoff in code comments.

**Security notes (explicitly accepted risks for v1):**
- Single shared static secret — no per-session token rotation
- Invalidation requires changing `SUPER_ADMIN_SECRET` and redeploying both apps
- `maxAge: 86400` (24h) limits the exposure window if a cookie is leaked
- No CSRF token — mitigated by `sameSite: 'lax'` and the custom header requirement

**Django `SuperAdminTokenAuthentication`:**
- New DRF authentication class in `backend/invitations/superadmin_views.py`
- Reads `X-Super-Admin-Token` header from the request
- Compares to `settings.SUPER_ADMIN_SECRET` (empty string default → auth always fails if unset)
- Returns a synthetic anonymous user on success (no real User object required for admin endpoints)
- All superadmin views use `authentication_classes = [SuperAdminTokenAuthentication]` and `permission_classes = [IsAuthenticated]`

### Backend additions (`backend/`)

**CORS and CSRF updates** in `backend/api/settings.py`:
- `CORS_ALLOWED_ORIGINS` must include the admin Vercel deployment URL (add `SUPER_ADMIN_ORIGIN` env var)
- `CSRF_TRUSTED_ORIGINS` same
- `CORS_ALLOW_HEADERS` must include `x-super-admin-token` (add to the list)

New file: `backend/invitations/superadmin_views.py`

All views use `SuperAdminTokenAuthentication`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/superadmin/stats/` | GET | `{ total_users, total_events, total_invitations, checkins_today, checkin_rate }` — `checkins_today` is UTC-based (midnight UTC to now UTC) |
| `/api/superadmin/growth/` | GET | Last 30 days of daily `{ date, new_users, new_events }` — UTC day boundaries; all 30 days included; days with zero activity have `new_users: 0, new_events: 0` (no gaps in time axis) |
| `/api/superadmin/users/` | GET | All users (no pagination — v1 admin tool; acceptable until user count grows large): `{ id, email, plan, watermark_override, event_count, invitation_count, created_at }` |
| `/api/superadmin/users/{id}/` | PATCH | Update `plan` and/or `watermark_override` |
| `/api/superadmin/users/{id}/` | DELETE | Delete user and all associated data (CASCADE on FK handles events/invitations) |
| `/api/superadmin/users/{id}/events/` | GET | All events for a specific user with invitation counts |

Backend files changed:
- `backend/invitations/superadmin_views.py` — new file (auth class + all 6 view functions)
- `backend/api/urls.py` — register superadmin routes under `/api/superadmin/`
- `backend/api/settings.py` — add `SUPER_ADMIN_SECRET`, `SUPER_ADMIN_ORIGIN`, `CORS_ALLOW_HEADERS` with custom header
- `backend/tests/test_superadmin.py` — new tests (auth rejection, stats, growth, user CRUD)

### Admin frontend pages

**Tech stack:** Next.js 14, TypeScript, Tailwind CSS, Three.js, Recharts

**Pages:**

#### `/` — Login
- Three.js full-viewport hero: floating invitation cards (3D planes) slowly rotating, particle trails between them, camera drift
- Centered login card overlaid on the scene: brand logo + "Platform Admin" label + password input + "Sign In" button
- Form submits to `POST /api/login` (Next.js API route, server-side comparison)
- On success: cookie set by API route, client redirects to `/dashboard`
- WebGL fallback: dark gradient background

#### `/dashboard` — Platform overview
- Sidebar navigation (persistent, dark theme)
- Top KPI row (kpi-dashboard-design skill): Total Users · Total Events · Total Invitations · Check-Ins Today
- Secondary row: Check-In Rate + platform uptime note
- Charts (Recharts, dark theme):
  - "New Signups — last 30 days" (area chart, `#e94560` fill)
  - "Events Created — last 30 days" (bar chart, `#a8dadc` fill)

#### `/users` — User management
- Searchable, sortable table: Email · Plan badge (Free/Pro) · Watermark override toggle · Events · Invitations · Joined date · Actions
- Watermark toggle: inline switch, sends `PATCH /api/superadmin/users/{id}/` immediately
- Plan badge: click to cycle free ↔ pro
- Actions column: "View" → `/users/[id]`, "Delete" (confirm modal)
- Search: client-side filter on email

#### `/users/[id]` — User detail
- Header: email, joined date, plan badge
- Edit section: plan selector + watermark override toggle with "Save" button
- Events table: event name, date, invitation count, template status
- Danger zone: "Delete Account" button → confirm modal (type email to confirm — frontend-only guard, intentional; backend DELETE requires no additional confirmation beyond the `X-Super-Admin-Token` header)

### Admin frontend file structure

```
admin/
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── .env.example               # SUPER_ADMIN_SECRET, BACKEND_URL, NEXT_PUBLIC_BACKEND_URL
├── src/
│   ├── middleware.ts           # admin_token cookie check; '/' is PUBLIC (login page exempt)
│   ├── lib/
│   │   ├── api.ts              # Axios instance; reads admin_token cookie (non-httpOnly) and sets X-Super-Admin-Token header
│   │   └── auth.ts             # cookie helpers: getAdminToken, setAdminToken, clearAdminToken (js-cookie)
│   ├── components/
│   │   ├── ThreeHero.tsx       # Three.js invitation card scene (dynamic import, no SSR)
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   ├── KpiCard.tsx         # Stat card with accent animation
│   │   └── ConfirmModal.tsx    # Reusable delete confirmation modal
│   └── app/
│       ├── layout.tsx          # Root layout (Tailwind, dark background)
│       ├── page.tsx            # Login page (public)
│       ├── api/
│       │   └── login/
│       │       └── route.ts    # POST: compare password → set admin_token cookie
│       ├── dashboard/
│       │   └── page.tsx        # KPI overview + charts
│       └── users/
│           ├── page.tsx        # User table
│           └── [id]/
│               └── page.tsx    # User detail
```

### Admin middleware

`admin/src/middleware.ts` — checks `admin_token` cookie on all routes **except `/`** (login page). `/` is the only public path. All others redirect to `/` if cookie is absent.

```typescript
const PUBLIC_PATHS = new Set(['/']);
// Also exclude /api/login from auth check
const PUBLIC_PREFIXES = ['/api/login', '/_next/', '/favicon.ico'];
```

### Design system

Matches the main app:
- Background `#1a1a2e`, card `#16213e`, accent `#e94560`, secondary text `#a8dadc`, blue `#0f3460`
- Inter font
- Recharts with custom dark theme (`#16213e` tooltip background, `#e94560` primary series, `#a8dadc` secondary)
- Skills applied: `threejs` (hero scene on login + homepage), `kpi-dashboard-design` (dashboard layout and metric selection), `accent-animations` (KPI number entrance), `scroll-animations` (below-fold sections on homepage), `text-animations` (hero headline entrance on homepage)

---

## Out of scope

- Payments / billing integration (deferred)
- Email notifications
- Audit log / admin action history
- Multi-admin accounts (single shared secret for now)
- Mobile-optimised admin (desktop-first)
- Pagination on user list (acceptable until user count exceeds ~500)
- Server-side CSRF token for admin login form (mitigated by `sameSite: lax`)
