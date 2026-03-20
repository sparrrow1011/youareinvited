# YouAreInvited — SaaS Conversion Design

**Date:** 2026-03-20
**Status:** Approved by product owner

---

## Overview

Convert the existing single-tenant event invitation system into a multi-tenant SaaS product targeting individual event organizers (weddings, parties, graduations). Each organizer gets their own account, creates events, and manages invitations under each event.

**Monetisation:** Freemium — free accounts get a "Made with YouAreInvited.com" watermark on generated e-invite images. Pro accounts have no watermark. Upgrade path is manual for now (billing to be added later). Super admins can waive the watermark per account without upgrading plan.

**Payments:** Deferred — not in scope for this version.

**Accounts:** Solo only — no collaborators in this version.

---

## Data Model

### UserProfile
Extends Django's built-in `auth.User` via OneToOneField.

| Field | Type | Notes |
|-------|------|-------|
| `user` | OneToOneField → User | `on_delete=CASCADE` |
| `plan` | CharField | `"free"` (default) or `"pro"` |
| `watermark_override` | BooleanField | Default `False`. Super admin sets to waive watermark without upgrading plan |
| `created_at` | DateTimeField | auto |

### Event (new model)
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUIDField | primary key |
| `owner` | FK → User | `on_delete=CASCADE` |
| `name` | CharField(200) | e.g. "Sarah & James Wedding" |
| `date` | DateField | |
| `description` | CharField(500) | optional, blank=True |
| `background_image` | ImageField | optional — uploaded invite graphic |
| `qr_zone` | JSONField | `{x_pct, y_pct, w_pct, h_pct}` as percentages of image dimensions. Null if no template |
| `name_zone` | JSONField | `{x_pct, y_pct, w_pct, h_pct, font_size, color}`. Null if no template |
| `tag_zone` | JSONField | `{x_pct, y_pct, w_pct, h_pct, font_size, color}`. Null if no template |
| `created_at` | DateTimeField | auto |

**Zone coordinates** are stored as percentages (0.0–1.0) of the original image dimensions to avoid scaling issues between the canvas editor display size and the full-resolution image. The frontend converts canvas pixel coordinates to percentages before POSTing. `generate_e_invite()` multiplies percentages by the actual image pixel dimensions at render time.

### Invitation (modified)
- Add `event`: FK → Event, `on_delete=CASCADE` (deleting an event deletes all its invitations)
- Nullable during migration step 1–2 only; made non-nullable in step 3
- All other existing fields unchanged

### Watermark Logic
```python
def should_show_watermark(invitation):
    user = invitation.event.owner
    if user.profile.watermark_override:
        return False
    return user.profile.plan == "free"
```

This traverses `invitation → event → owner → profile`. Called once per invite generation — one DB query with `select_related('event__owner__profile')` to avoid N+1.

`generate_e_invite()` signature updated to:
```python
def generate_e_invite(self, show_watermark: bool = True):
```

The caller resolves `show_watermark` before calling:
```python
invitation.generate_e_invite(show_watermark=should_show_watermark(invitation))
```

**Cached images on plan change:** When a user's plan changes (or `watermark_override` is toggled), existing e-invite images are **not** automatically regenerated — they were generated under the previous plan. The super admin or organizer must manually trigger `regenerate_images` per event to apply the change. This is acceptable for now and avoids a potentially expensive background job.

### Template / Zone Editor
When an event has `background_image` and **all three zones** set, `generate_e_invite()` composites content onto the uploaded graphic:
1. Load `background_image` from Cloudinary
2. Compute pixel coordinates from zone percentages × image dimensions
3. Paste name text at `name_zone`
4. Paste tag text at `tag_zone`
5. Paste QR code image at `qr_zone`
6. Optionally stamp watermark footer

When no template is uploaded (or zones are incomplete), falls back to the existing hardcoded dark-theme card generator.

**Partial zone state:** All three zones must be defined for template mode to activate. The zone editor UI enforces this: the "Save Template" button is disabled until all three zones have been drawn. Clearing the background image resets all three zone JSONFields to null.

**Opting out of a zone:** If an organizer does not want a name or tag zone, they can place it in an off-screen or non-visible area. A future version may support optional zones.

---

## Authentication

### Backend
- Add `djangorestframework-simplejwt`
- New endpoints:
  - `POST /api/auth/register/` — email + password signup, creates User + UserProfile (plan=free)
  - `POST /api/auth/login/` — returns JWT access + refresh tokens
  - `POST /api/auth/refresh/` — refreshes access token
  - `POST /api/auth/logout/` — clears the JWT cookie server-side
- JWT is set as a **non-httpOnly cookie** named `access_token` on login, so the Axios instance can read it and attach it as `Authorization: Bearer <token>`. The cookie is `Secure` in production and `SameSite=Lax`.
- All viewsets scope queries to `request.user` (e.g. `Event.objects.filter(owner=request.user)`)

**Session auth is retained for Django admin.** The `/admin/` panel requires Django's session middleware. Only the organizer-facing API layer (`/api/auth/`) switches to JWT. Both auth systems coexist — they serve different surfaces.

### Frontend
- Replace single-password `/login` with email + password form
- Store JWT in a `Secure`, `SameSite=Lax` cookie on login
- Axios instance reads JWT from the cookie and attaches `Authorization: Bearer <token>` header
- Add `/signup` page
- The `/security` portal retains its existing simple password auth — venue staff do not need accounts

### Super Admin
- Django's built-in `/admin/` panel
- `UserProfile` registered with `watermark_override` and `plan` fields editable by staff
- No custom super admin UI needed beyond this

---

## Frontend Routing

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Landing / marketing page |
| `/signup` | Public | Create account |
| `/login` | Public | Sign in |
| `/dashboard` | Auth required | List of user's events |
| `/events/new` | Auth required | Create a new event |
| `/events/[id]` | Auth required | Manage event — invitations table, stats, template upload, zone editor |
| `/invitation/[id]` | Public | Guest invitation view (unchanged) |
| `/security/...` | Security password | Unchanged |

The existing `/admin` organizer route is retired. `/dashboard` is the new home for authenticated organizers.

---

## API Changes

### Scoped queries (all viewsets)
Every list/stats query is filtered by owner:
- `Event.objects.filter(owner=request.user)`
- `Invitation.objects.filter(event__owner=request.user)`

The `stats` action is updated to filter by the requesting user:
```python
total = Invitation.objects.filter(event__owner=request.user).count()
checked_in = Invitation.objects.filter(event__owner=request.user, checked_in=True).count()
```

### New endpoints
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`
- `GET/POST /api/events/` — list and create events
- `GET/PATCH/DELETE /api/events/[id]/` — manage single event
- `POST /api/events/[id]/template/` — upload background image + save zone coordinates

### Admin action update
The Django admin `regenerate_images` action is updated to resolve `show_watermark` via the invitation's event owner before calling `generate_e_invite()`.

---

## Migration Strategy

Executed in five ordered steps to avoid data loss:

**Step 1 — Add models (nullable)**
Add `UserProfile` and `Event` models. Add nullable `event` FK on `Invitation` (with `on_delete=CASCADE`). Run schema migration. Nothing breaks — existing invitations have `event = null`.

**Step 2 — Data migration**
Django data migration that:
1. Creates one superuser account (credentials passed via env vars `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)
2. Creates one `Event` owned by that superuser named "Default Event" with today's date
3. Creates a `UserProfile` for the superuser with `plan="pro"`, `watermark_override=True`
4. Backfills all existing `Invitation` rows with `event = default_event`

**Step 3 — Make FK non-nullable**
Remove `null=True` from `Invitation.event`. Run schema migration. Safe because step 2 guarantees no null rows.

**Step 4 — Backend auth switch**
Add `simplejwt`. New `/api/auth/` endpoints go live. Django session auth is retained for `/admin/`. Old `SITE_PASSWORD`-based Next.js API routes are removed.

**Step 5 — Frontend**
Replace password-cookie auth with JWT. Rename `/admin` → `/dashboard`. Add `/signup`, `/events/[id]` routes. Remove `SITE_PASSWORD` env dependency. Update Axios to attach JWT header.

---

## Scope Boundaries

**In scope:**
- Multi-tenancy (User → Event → Invitation)
- JWT authentication (signup, login, refresh, logout)
- Freemium watermark logic with super admin override toggle
- Zone editor canvas + custom invite template per event
- Data migration from current flat structure

**Out of scope (future):**
- Payment / billing integration (Stripe or Paystack)
- Automatic e-invite regeneration on plan change
- Collaborator accounts
- Optional zones in template editor
- Email notifications / RSVP
- Analytics beyond the existing stats endpoint
