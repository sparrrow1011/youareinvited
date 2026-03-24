# Per-Event Security Gateway Design

## Goal

Replace the single global `SECURITY_PASSWORD` with a per-event PIN system. Each organizer sets a PIN for each event; security staff receive a scoped URL and PIN. The backend `check_in` endpoint is properly authenticated — no more open-API check-in.

## Architecture

**Scoping:** Per-organizer default with per-event override.
- `UserProfile.security_pin` — organizer-level fallback (future; out of scope for this iteration)
- `Event.security_pin` — event-specific PIN (hashed); null = no PIN set, check-in portal disabled

**Credential type:** 4–6 digit numeric PIN, stored hashed via Django's `make_password` / `check_password`.

**Staff entry point:** Organizer copies `/security/event/{event-id}` from the event dashboard and shares it along with the PIN. No separate account needed for security staff.

**Token:** On PIN validation, the backend issues a Django-signed token (`django.core.signing`) scoped to `{event_id, organizer_id}`, expiring in 12 hours. Stored as an `httpOnly` cookie set **server-side** via a Next.js API route (see Section: Cookie Handling).

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

Update `get_security_checkin_url()`:
```python
def get_security_checkin_url(self):
    base = "https://invitation-system-psi.vercel.app"
    return f"{base}/security/event/{self.event_id}/checkin?invitation={self.id}"
```
All QR codes must be regenerated after this change (organizer can trigger via the existing "Regenerate Images" admin action, or the migration can include a management command).

### `UserProfile` model

No changes in this iteration. Organizer-level default PIN is a future enhancement (YAGNI).

### Migration

New migration: `0008_event_security_pin.py`

---

## API Changes

### New actions on `EventViewSet`

**`GET /api/events/{id}/public_info/`**
- No authentication required
- Uses `get_object_or_404(Event, pk=pk)` directly — **bypasses** `get_queryset()` which filters by owner. This action overrides queryset via `self.get_object()` with `Event.objects.all()` (see implementation note below).
- Returns: `{ "id": "<uuid>", "name": "...", "date": "..." }`
- Returns 404 for unknown event IDs — does not reveal whether event exists vs other errors

**`POST /api/events/{id}/verify_security_pin/`**
- No authentication required
- Rate-throttled (`AnonRateThrottle`, 10 requests/min per IP)
- Body: `{ "pin": "1234" }`
- Logic:
  1. Look up event with `Event.objects.get(pk=pk)` — returns **404** if not found (do not distinguish "not found" from "wrong PIN" to avoid event enumeration)
  2. If `event.security_pin` is null → **403** `{ "detail": "No security PIN configured for this event" }`
  3. If `check_password(pin, event.security_pin)` fails → **401** `{ "detail": "Invalid PIN" }`
  4. On success → **200** `{ "token": "<django-signed-token>" }`
- Token: `signing.dumps({"event_id": str(event.id), "organizer_id": event.owner_id}, salt="security-checkin")` — no `max_age` baked in here; expiry enforced at validation time (12 h)

**`POST /api/events/{id}/set_security_pin/`**
- Requires `IsAuthenticated`
- Ownership enforced implicitly: `EventViewSet.get_queryset()` already filters `owner=request.user`, so any other organizer's event ID returns 404 (not 403). This is intentional — no information leaked about other organizers' events.
- Body: `{ "pin": "1234" }` or `{ "pin": null }` to clear
- Serializer: new `SetSecurityPinSerializer`:
  ```python
  class SetSecurityPinSerializer(serializers.Serializer):
      pin = serializers.RegexField(r'^\d{4,6}$', allow_null=True)
  ```
- Hashes pin with `make_password` and saves; `null` clears the field
- **200:** `{ "security_pin_set": true }` or `{ "security_pin_set": false }` (cleared)

**Implementation note for `public_info` and `verify_security_pin`:**
Both actions need to look up events without owner-scoping. Use `get_object_or_404(Event, pk=self.kwargs['pk'])` inside the action body directly rather than `self.get_object()`, to bypass the scoped queryset.

### Modified action on `InvitationViewSet`

**`POST /api/invitations/{id}/check_in/`**

Previously: no authentication (completely open).
Now: requires **one of**:
1. `IsAuthenticated` — organizer checking in their own guest from the dashboard
2. Valid `X-Security-Token` header — signed token scoped to the invitation's event

Token validation logic:
```python
def check_in(self, request, pk=None):
    token = request.headers.get('X-Security-Token')
    invitation = get_object_or_404(Invitation, pk=pk)

    if token:
        try:
            payload = signing.loads(token, salt='security-checkin', max_age=43200)
        except signing.SignatureExpired:
            return Response({'detail': 'Security session expired. Please re-enter PIN.'}, status=401)
        except signing.BadSignature:
            return Response({'detail': 'Invalid security token.'}, status=401)
        if str(payload['event_id']) != str(invitation.event_id):
            return Response({'detail': 'Token scoped to wrong event.'}, status=403)
    elif not (request.user and request.user.is_authenticated):
        return Response({'detail': 'Authentication required.'}, status=401)
    elif request.user.is_authenticated:
        # Organizer path: verify they own the invitation's event
        if invitation.event.owner != request.user:
            return Response({'detail': 'Not your event.'}, status=403)

    if invitation.checked_in:
        return Response({'detail': 'Already checked in'}, status=400)

    invitation.checked_in = True
    invitation.checked_in_at = timezone.now()
    invitation.save()
    return Response(InvitationSerializer(invitation).data)
```

`retrieve` remains open (guests can still view their own invitation).

---

## Cookie Handling

The signed token is sensitive and must be set as an `httpOnly` cookie — meaning it **cannot** be set by client-side JavaScript. The flow uses a Next.js API route:

**`POST /api/auth/security/token` (new Next.js route)**
- Receives `{ eventId, token }` from the client-side PIN form (after backend validates PIN)
- Sets `security_token` as an `httpOnly`, `SameSite=Lax` cookie scoped to `/security/event/{eventId}`
- Returns `{ ok: true }`

**`POST /api/auth/security/logout` (new Next.js route, replaces old `/security/logout`)**
- Clears the `security_token` cookie by setting it with `maxAge=0`
- Returns `{ ok: true }`

The old `/api/auth/security/login` route is removed.

---

## Frontend Changes

### Event page (`web/src/app/events/[id]/page.tsx`)

Add a **"Security" card** in the right-column sidebar (below the template card):
- PIN input (numeric, 4–6 digits) with **Save PIN** button
- If PIN is already set: show masked display `••••` + **Clear PIN** button
- **Copy Staff Link** button — copies `/security/event/{event-id}` to clipboard with a toast confirmation
- Helper text: "Share this link + PIN with your security team"
- Calls `POST /api/events/{id}/set_security_pin/` on save/clear
- Note: the page does not display the existing PIN value (only whether one is set)

### New page: `web/src/app/security/event/[id]/page.tsx`

Public page (no cookie or JWT required):
1. Fetches event name from `GET /api/events/{id}/public_info/`
2. Displays event name so staff confirm the correct event
3. 4–6 digit PIN input + **Unlock Check-In** button
4. On submit:
   a. Calls `POST /api/events/{id}/verify_security_pin/` with `{ pin }`
   b. On success: POSTs `{ eventId, token }` to `/api/auth/security/token` (Next.js route)
   c. Redirects to `/security/event/{id}/checkin`
5. On 401/403: shows inline error message

### New page: `web/src/app/security/event/[id]/checkin/page.tsx`

Protected by middleware (see Middleware section):
- Sends `X-Security-Token: {cookie value}` header on all check-in API calls
- Guest lookup: accepts an `?invitation={uuid}` query param (set by QR scan) or manual UUID entry
- QR codes now encode `/security/event/{event-id}/checkin?invitation={invitation-id}` — the checkin page reads `?invitation=` and auto-loads the guest
- If token is expired (backend returns 401 with "Security session expired"): show message "Your session has expired. Please re-enter the PIN." with a link back to the PIN page — no silent redirect, to avoid confusion mid-check-in
- **Logout** button: calls `POST /api/auth/security/logout`, then redirects to `/security/event/{id}`

### Middleware (`web/src/middleware.ts`)

Replace the old `security_auth` cookie check with:

```typescript
// /security/event/[id]/checkin/* requires security_token cookie
const isCheckinPath = /^\/security\/event\/[^/]+\/checkin/.test(pathname);
if (isCheckinPath) {
  const hasToken = !!req.cookies.get('security_token')?.value;
  if (!hasToken) {
    // redirect to PIN page — strip /checkin suffix
    const pinPage = pathname.replace(/\/checkin.*$/, '');
    return NextResponse.redirect(new URL(pinPage, req.url));
  }
}

// /security/event/[id] (PIN login page) — public, no redirect needed
```

**Note:** The middleware only checks cookie *presence*, not validity. An attacker can set a `security_token` cookie with an arbitrary value to pass the middleware check, but every API call will fail with 401 on the backend. This is defense-in-depth: the middleware prevents accidental exposure; the backend enforces real security. This is intentional.

Remove: `security_auth` cookie check, `SECURITY_PASSWORD` env var, `/security/login` from `PUBLIC_PATHS`.

### Removed files

| File | Reason |
|---|---|
| `web/src/app/security/page.tsx` | Old generic dashboard — replaced by event-scoped flow |
| `web/src/app/security/login/page.tsx` | Global password login — removed |
| `web/src/app/security/check-in/[id]/page.tsx` | Replaced by `/security/event/[id]/checkin` |
| `web/src/app/api/auth/security/login/route.ts` | Global password route — removed |
| `web/src/app/security/logout/route.ts` | Replaced by `/api/auth/security/logout` |

---

## `invitationService` / `api.ts` changes

Add:
```typescript
// Modified checkIn — accepts token passed via React state (not cookie read)
checkIn: (id: string, securityToken?: string) =>
  api.post(`/invitations/${id}/check_in/`, {}, {
    headers: securityToken ? { 'X-Security-Token': securityToken } : {},
  }),
```

Note: `security_token` is `httpOnly` — it **cannot** be read by `document.cookie`. Do NOT add a `getSecurityToken()` cookie-reader helper. The token is passed via React state from the PIN form (or session storage), not by reading the cookie. The checkin page must pass the token from its own state (received after PIN validation and stored in React state) rather than reading from cookie. The cookie is only used for middleware gate-keeping. The token value is passed as a prop/state from the PIN form to the checkin UI.

This means the checkin page flow is:
1. PIN form validates → receives token string from backend → stores in React state
2. Redirects to checkin page passing token via URL param or session storage (not cookie read)
3. Checkin page reads token from URL param / session storage for API calls

---

## Security Properties

| Property | Before | After |
|---|---|---|
| Backend check_in auth | None — fully open | Token or organizer JWT required |
| Cross-organizer access | Possible (shared password) | Impossible — token scoped to event |
| PIN storage | Plaintext env var | Hashed with Django make_password |
| Token expiry | Never (cookie persists) | 12 hours, enforced server-side |
| Brute-force protection | None | Rate-throttled (10/min per IP) |
| QR code routing | `/security/check-in/{invitation-id}` | `/security/event/{event-id}/checkin?invitation={id}` |

---

## Out of Scope (Future)

- Organizer-level default PIN (`UserProfile.security_pin`)
- Per-event PIN rotation / revocation UI
- Audit log of check-ins by security staff
- Multiple concurrent security sessions per event
- Automatic QR code regeneration on PIN setup (organizer must manually trigger regeneration)
