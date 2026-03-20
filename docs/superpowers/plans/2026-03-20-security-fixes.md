# Security & Code Quality Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 25 security and quality issues found in the audit across the Django backend and Next.js frontend.

**Architecture:** Backend fixes isolate secrets into environment variables and tighten permissions. Frontend fixes remove hardcoded credentials, fix config, and add security headers. A custom DRF permission class enables guest access to invitation detail while locking down admin actions.

**Tech Stack:** Django 5 / DRF 3.14, Next.js 14 / TypeScript, Vercel deployment

---

## Files Modified

### Backend
- `backend/api/settings.py` — secrets via env vars, debug, CORS, DRF permissions, dedup
- `backend/invitations/views.py` — per-action permissions, POST for regenerate_images
- `backend/invitations/permissions.py` — NEW: custom permission class
- `backend/invitations/models.py` — HTTPS URLs, proper logging
- `backend/.env.example` — NEW: documents all required env vars

### Frontend
- `web/src/app/api/auth/login/route.ts` — remove default password fallback
- `web/src/app/api/auth/security/login/route.ts` — remove default password fallback
- `web/next.config.js` — env-based rewrite URL
- `web/src/middleware.ts` — add security headers, make `/invitation/[id]` public
- `web/.env.example` — NEW: documents all required env vars

---

### Task 1: Clean up `settings.py` — secrets, DEBUG, duplicates, CORS, DRF

**Files:** `backend/api/settings.py`

- [ ] Replace hardcoded `SECRET_KEY` with `config('SECRET_KEY')`
- [ ] Remove line 38 `DEBUG = True` override (keep line 24's env-based version)
- [ ] Remove duplicate `ALLOWED_HOSTS` — keep only line 40's version, use `config()`
- [ ] Remove duplicate `STATIC_URL`, `STATIC_ROOT`, `DEFAULT_AUTO_FIELD` blocks
- [ ] Set `CORS_ALLOW_ALL_ORIGINS = False` and rely on `CORS_ALLOWED_ORIGINS` list
- [ ] Add `CORS_ALLOWED_ORIGINS` via env var with comma-split fallback
- [ ] Change DRF default permission to `IsAuthenticated`
- [ ] Move Cloudinary credentials to `config()` env var calls
- [ ] Add `CSRF_TRUSTED_ORIGINS` from env var
- [ ] Add `DATABASE_URL` with SQLite fallback for local dev

---

### Task 2: Custom permission class + fix endpoint permissions

**Files:** `backend/invitations/permissions.py` (new), `backend/invitations/views.py`

- [ ] Create `IsAdminOrReadOnlyDetail` permission: allows GET on detail (retrieve) for any, requires auth for everything else
- [ ] Update `InvitationViewSet.get_permissions()`:
  - `retrieve`, `check_in`: public (guests need these)
  - all others: `IsAuthenticated`
  - `admin_undo_check_in`, `regenerate_images`: `IsAdminUser`
- [ ] Change `regenerate_images` from `methods=['get']` to `methods=['post']`
- [ ] Update `api.ts` frontend to use `api.post` for `regenerateImages`

---

### Task 3: Fix model — HTTPS URLs, logging

**Files:** `backend/invitations/models.py`

- [ ] Change `get_invitation_url()` `http://` → `https://`
- [ ] Change `get_security_checkin_url()` `http://` → `https://`
- [ ] Add `import logging; logger = logging.getLogger(__name__)` at top
- [ ] Replace `print(f"Error adding QR code: {e}")` with `logger.error(...)`

---

### Task 4: Fix frontend auth routes — remove insecure password defaults

**Files:** `web/src/app/api/auth/login/route.ts`, `web/src/app/api/auth/security/login/route.ts`

- [ ] Remove `|| 'thisisgeneral'` fallback; if `SITE_PASSWORD` is empty, return 500
- [ ] Remove `|| 'security'` fallback; if `SECURITY_PASSWORD` is empty, return 500

---

### Task 5: Fix `next.config.js` — env-based rewrite destination

**Files:** `web/next.config.js`

- [ ] Replace `http://localhost:8000` with `process.env.BACKEND_URL || 'http://localhost:8000'`

---

### Task 6: Add security headers to frontend middleware + make invitation page public

**Files:** `web/src/middleware.ts`

- [ ] Add `/invitation` prefix to `PUBLIC_PATHS` (or handle via path check) so guests don't need site_auth to view their invitation
- [ ] Add security headers to all responses:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

### Task 7: Create `.env.example` files

**Files:** `backend/.env.example`, `web/.env.example`

- [ ] Create `backend/.env.example` with all required vars documented
- [ ] Create `web/.env.example` with all required vars documented
