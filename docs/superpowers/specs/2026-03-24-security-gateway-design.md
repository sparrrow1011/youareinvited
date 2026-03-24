# Per-Event Security Gateway Design

## Goal

Replace the single global `SECURITY_PASSWORD` with a per-event PIN system. Each organizer sets a PIN for each event; security staff receive a scoped URL and PIN. The backend `check_in` endpoint is properly authenticated — no more open-API check-in.

## Architecture

**Scoping:** Per-organizer default with per-event override.
- `UserProfile.security_pin` — organizer-level fallback (future; out of scope for this iteration)
- `Event.security_pin` — event-specific PIN (hashed); null = no PIN set, check-in portal disabled

**Credential type:** 4–6 digit numeric PIN, stored hashed via Django's `make_password` / `check_password`.

**Staff entry point:** Organizer copies `/security/event/{event-id}` from the event dashboard and shares it along with the PIN. No separate account needed for security staff.

**Token:** On PIN validation, the backend issues a Django-signed token (`django.core.signing`) scoped to `{event_id, organizer_id}`, expiring in 12 hours. Stored as an `httpOnly` cookie on the frontend.

---

## Data Model Changes

### `Event` model (`backend/invitations/models.py`)

Add field:
```python
security_pin = models.CharField(max_length=128, null=True, blank=True)
```
- Stored as a Django password hash (not plaintext)
- `null` means no PIN configured for this event; staff portal is disabled
- Set/updated via the event settings API

### `UserProfile` model

No changes in this iteration. Organizer-level default PIN is a future enhancement (YAGNI).

### Migration

New migration: `0008_event_security_pin.py`

---

## API Changes

### New action on `EventViewSet`

**`POST /api/events/{id}/verify_security_pin/`**
- No authentication required
- Rate-throttled (Django REST Framework `AnonRateThrottle`, e.g. 10/min per IP)
- Body: `{ "pin": "1234" }`
- Validates: event exists → PIN is configured → `check_password(pin, event.security_pin)`
- **200:** `{ "token": "<django-signed-token>" }`
- **401:** `{ "detail": "Invalid PIN" }`
- **403:** `{ "detail": "No security PIN configured for this event" }`
- Token payload: `{ "event_id": "<uuid>", "organizer_id": <int> }`, salt `"security-checkin"`, `max_age=43200` (12 h)

**`GET /api/events/{id}/public_info/`**
- No authentication required
- Returns: `{ "id": "<uuid>", "name": "...", "date": "..." }`
- Used by the staff login page to confirm the correct event before entering PIN

**`POST /api/events/{id}/set_security_pin/`**
- Requires `IsAuthenticated` + must be event owner
- Body: `{ "pin": "1234" }` (4–6 digits, validated by serializer)
- Hashes the PIN with `make_password` and saves to `event.security_pin`
- Body `{ "pin": null }` clears the PIN (disables staff portal)
- **200:** `{ "security_pin_set": true }`

### Modified action on `InvitationViewSet`

**`POST /api/invitations/{id}/check_in/`**

Previously: no authentication (completely open).
Now: requires **one of**:
1. `IsAuthenticated` — organizer checking in their own guest from the dashboard
2. Valid `X-Security-Token` header — signed token scoped to the invitation's event

Token validation logic:
```python
token = request.headers.get('X-Security-Token')
if token:
    try:
        payload = signing.loads(token, salt='security-checkin', max_age=43200)
    except signing.BadSignature:
        return 401
    if str(payload['event_id']) != str(invitation.event_id):
        return 403  # token scoped to wrong event
else:
    # fall through to IsAuthenticated check
```

**401** if neither credential is present/valid.
**403** if token is valid but scoped to a different event.

`retrieve` remains open (guests can still view their own invitation).

---

## Frontend Changes

### Event page (`web/src/app/events/[id]/page.tsx`)

Add a **"Security" card** in the right-column sidebar (below the template card):
- PIN input (numeric, 4–6 digits) with **Save PIN** button
- If PIN is set: show masked display `••••` + **Clear PIN** button
- **Copy Staff Link** button — copies `/security/event/{event-id}` to clipboard
- Helper text: "Share this link + PIN with your security team"
- Calls `POST /api/events/{id}/set_security_pin/` on save

### New page: `/security/event/[id]/page.tsx`

Public page (no JWT required, no security cookie required to view):
1. Fetches event name from `GET /api/events/{id}/public_info/`
2. Displays event name so staff can confirm correct event
3. 4–6 digit PIN input + **Unlock Check-In** button
4. On submit: calls `POST /api/events/{id}/verify_security_pin/`
5. On success: stores signed token in `security_token` cookie (httpOnly, path `/security/event/{id}`, 12 h expiry)
6. Redirects to `/security/event/[id]/checkin`

### New page: `/security/event/[id]/checkin/page.tsx`

Protected — middleware checks `security_token` cookie:
- Same check-in UX as old `/security/check-in/[id]` but:
  - Sends `X-Security-Token` header on all `check_in` API calls
  - Guest lookup is scoped to this event (manual ID entry + QR scan URL)
  - **Logout** button clears the `security_token` cookie

### Removed

| File | Reason |
|---|---|
| `web/src/app/security/page.tsx` | Old generic dashboard — replaced by event-scoped flow |
| `web/src/app/security/login/page.tsx` | Global password login — removed |
| `web/src/app/security/check-in/[id]/page.tsx` | Replaced by scoped `/security/event/[id]/checkin` |
| `web/src/app/api/auth/security/login/route.ts` | Global password route — removed |

### Middleware (`web/src/middleware.ts`)

- Remove: `security_auth` cookie check
- Add: for paths matching `/security/event/[id]/checkin*`, verify `security_token` cookie is present (full token validation happens on the backend per-request, middleware just checks presence)
- `/security/event/[id]` (the PIN login page itself) remains public
- Remove `SECURITY_PASSWORD` from env

---

## `invitationService` changes (`web/src/lib/api.ts`)

Add helper to attach `X-Security-Token` header when present:

```typescript
// Reads token from cookie for a given event
export const getSecurityToken = (): string | null => {
  // reads `security_token` cookie value
};

// Modified checkIn call
checkIn: (id: string, securityToken?: string) =>
  api.post(`/invitations/${id}/check_in/`, {}, {
    headers: securityToken ? { 'X-Security-Token': securityToken } : {},
  }),
```

---

## Security Properties

| Property | Before | After |
|---|---|---|
| Backend check_in auth | None — fully open | Token or organizer JWT required |
| Cross-organizer access | Possible (shared password) | Impossible — token scoped to event |
| PIN storage | Plaintext env var | Hashed with Django make_password |
| Token expiry | Never (cookie persists) | 12 hours |
| Brute-force protection | None | Rate-throttled (10/min per IP) |

---

## Out of Scope (Future)

- Organizer-level default PIN (`UserProfile.security_pin`)
- Per-event PIN rotation / revocation UI
- Audit log of check-ins by security staff
- Multiple concurrent security sessions per event
