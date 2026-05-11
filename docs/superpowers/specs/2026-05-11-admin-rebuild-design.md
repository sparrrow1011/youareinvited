# Admin Dashboard Rebuild — Design Spec
**Date:** 2026-05-11  
**Status:** Approved  
**Scope:** Full rebuild of the `/admin` Next.js app using shadcn/ui, light theme, focused on stats + user management.

---

## 1. Goals

- Replace the current dark-themed admin with a clean, light, professional UI (Stripe/Shopify aesthetic)
- Fix the broken proxy/env issue that prevented the dashboard from loading data
- Use shadcn/ui for accessible, consistent components
- Keep the feature scope tight: platform stats + user management only

---

## 2. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 14 (App Router) | Existing — no change |
| UI Components | shadcn/ui (Radix UI + Tailwind) | New — replaces hand-rolled components |
| Charts | recharts | Existing — keep as-is |
| HTTP | axios + existing `lib/api.ts` | Existing — keep as-is |
| Auth | Cookie-based JWT, existing middleware | Existing — keep as-is |
| Toasts | shadcn Sonner | New |
| Skeletons | shadcn Skeleton | New |

---

## 3. File Structure

```
admin/src/
├── app/
│   ├── layout.tsx                  ← Root layout (fonts, global styles)
│   ├── page.tsx                    ← Login page (rebuilt, light theme)
│   ├── api/
│   │   └── login/route.ts          ← Keep unchanged
│   └── (admin)/                    ← Route group (all protected pages)
│       ├── layout.tsx              ← Sidebar + auth guard wrapper
│       ├── dashboard/
│       │   └── page.tsx            ← KPI cards + growth charts
│       └── users/
│           ├── page.tsx            ← Users table with search + edit dialog
│           └── [id]/
│               └── page.tsx        ← User detail: edit + events + delete
├── components/
│   ├── ui/                         ← shadcn/ui auto-generated primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── table.tsx
│   │   ├── select.tsx
│   │   ├── switch.tsx
│   │   ├── skeleton.tsx
│   │   └── sonner.tsx
│   ├── Sidebar.tsx                 ← Left nav, logo, logout
│   ├── KpiCard.tsx                 ← Stat card with label + value
│   └── UserTable.tsx               ← Table + search + edit dialog
├── lib/
│   ├── api.ts                      ← Keep unchanged
│   └── auth.ts                     ← Keep unchanged
└── middleware.ts                   ← Keep unchanged
```

---

## 4. Routes

| Path | Page | Access |
|------|------|--------|
| `/` | Login | Public |
| `/dashboard` | Platform stats overview | Staff only |
| `/users` | All users table | Staff only |
| `/users/[id]` | User detail + edit + delete | Staff only |

---

## 5. Design Language

**Theme:** Light, neutral, professional.

| Token | Value |
|-------|-------|
| Background | `white` |
| Sidebar background | `gray-50` |
| Borders | `gray-200` |
| Primary text | `gray-900` |
| Muted text | `gray-500` |
| Brand accent | `#e94560` (coral) |
| Pro badge | coral bg, white text |
| Free badge | `gray-100` bg, `gray-600` text |
| Danger | `red-600` |

**Accent usage:** Active sidebar nav item (left border + text), primary buttons, Pro plan badge. Used sparingly everywhere else.

---

## 6. Page Designs

### 6.1 Login (`/`)
- `gray-50` full-page background
- Centered white card, subtle shadow
- YouAreInvited logo + "Platform Admin" heading
- Email input, password input (shadcn `Input`)
- "Sign In" button (coral)
- Error message rendered inline below the form
- No 3D animation — fast, clean load

### 6.2 Sidebar
- Fixed left, 240px wide, white background with `gray-200` right border
- Logo at top
- Nav items: **Dashboard**, **Users** — coral left border + text on active item
- Logout button at bottom (ghost button)

### 6.3 Dashboard (`/dashboard`)
**KPI row (4 cards):**
- Total Users
- Total Events
- Total Invitations
- Check-Ins Today

Each card: shadcn `Card` with large bold number, muted label below.

**Charts (2 columns, below KPI row):**
- Left: New Signups — 30-day area chart (recharts)
- Right: Events Created — 30-day bar chart (recharts)
- Neutral color palette (no dark backgrounds on charts)
- Skeleton shown while loading

### 6.4 Users (`/users`)
**Header:** "Users" heading + email search input (right-aligned)

**Table columns:**
| Column | Content |
|--------|---------|
| Email | Plain text |
| Plan | Badge — "Pro" (coral) or "Free" (gray) |
| Watermark | Badge — "Override" (yellow) or "Default" (gray) |
| Events | Number |
| Invitations | Number |
| Joined | Formatted date |
| Actions | "Edit" button (opens dialog) + "View" link |

**Edit Dialog (plan + watermark):**
- shadcn `Dialog` with title "Edit User"
- `Select` for plan: Free / Pro
- `Switch` for watermark override
- "Save" button → loading state → success toast or inline error
- Dialog stays open on error; closes on success

**Skeleton:** Full table skeleton while loading.

### 6.5 User Detail (`/users/[id]`)
**Breadcrumb:** Users → user email

**Profile section:**
- Email, plan badge, watermark badge, joined date, event + invitation counts
- Inline edit: plan `Select` + watermark `Switch` + Save button
- Success/error feedback via toast + inline error

**Events table:**
| Column | Content |
|--------|---------|
| Name | Event name |
| Date | Formatted |
| Invitations | Count |
| Has Template | Badge — "Yes" (green) or "No" (gray) |

**Danger Zone:**
- Red-bordered card, "Delete Account" section
- "Delete" button → opens confirmation `Dialog`
- Dialog requires user to type the account email to confirm
- On confirm: DELETE request → redirect to `/users` with success toast
- On error: error shown inside dialog, dialog stays open

---

## 7. Data Flow

### Fetching
- All data fetched client-side on mount via axios (existing `lib/api.ts`)
- JWT Bearer token auto-attached via request interceptor
- Proxy: Next.js rewrites `/api/*` → `${BACKEND_URL}/api/*`

### Loading states
- shadcn `Skeleton` shown immediately while data loads
- No blank/empty flashes

### Error states
- Fetch errors → inline error banner with "Retry" button
- Not the current generic "please sign in again" for all errors

### Mutations (plan/watermark edits)
1. Save button enters loading state
2. PATCH to `/api/superadmin/users/{id}/`
3. Success → update state from server response, close dialog, success toast
4. Failure → inline error inside dialog, dialog stays open

### Delete
1. User types email in confirmation dialog
2. DELETE to `/api/superadmin/users/{id}/`
3. Success → redirect to `/users` + success toast
4. Failure → error message inside dialog

### Session expiry
- Existing axios interceptor: 401 → clear token + redirect to `/` with `?reason=session-expired`
- No change needed

---

## 8. shadcn/ui Components to Install

```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog input badge table select switch skeleton sonner
```

---

## 9. What Is Deleted

| File | Replacement |
|------|-------------|
| `components/ThreeHero.tsx` | Removed — login page uses no 3D animation |
| `components/ConfirmModal.tsx` | Replaced by shadcn `Dialog` |
| `components/Sidebar.tsx` | Rewritten (light theme) |
| `components/KpiCard.tsx` | Rewritten (uses shadcn `Card`) |
| All existing `app/dashboard/` | Rewritten |
| All existing `app/users/` | Rewritten |
| `app/page.tsx` (login) | Rewritten (light theme, no Three.js) |
| `app/globals.css` | Rewritten (shadcn base styles) |
| `tailwind.config.ts` | Rewritten (shadcn theme tokens) |

---

## 10. What Is Kept Unchanged

| File | Reason |
|------|--------|
| `lib/api.ts` | Types and axios client are correct |
| `lib/auth.ts` | Cookie management works |
| `middleware.ts` | Route protection works |
| `app/api/login/route.ts` | Login proxy works |
| `next.config.js` | Proxy rewrites are correct |
| `admin/.env.local` | BACKEND_URL correctly set |

---

## 10. Out of Scope (v1)

- Pagination (acceptable until ~500 users)
- Server-side search/filter
- Audit logging
- 2FA
- Role-based access beyond `is_staff`
- Events browser (platform-wide)
