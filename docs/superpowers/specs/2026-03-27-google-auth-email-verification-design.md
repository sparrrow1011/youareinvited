# Google Auth + Email Verification Design

**Date:** 2026-03-27
**Status:** Approved

## Goal

Add Google OAuth ("Sign in with Google") and email verification to the existing JWT-based Django + Next.js auth system without replacing any existing functionality.

## Decisions

- Keep existing Django custom auth (`auth_views.py`, SimpleJWT). No new auth libraries except `google-auth`.
- Auto-link Google accounts to existing accounts by matching email address.
- Email verification is required for new email/password signups only. Google signups skip it (Google already verified the email).
- Unverified users can log in and navigate the app but all action buttons are disabled and a banner prompts them to verify.
- Existing users are unaffected (`email_verified` defaults to `True` in migration).

---

## Backend

### Model Change

Add to `UserProfile`:
```python
email_verified = models.BooleanField(default=True)
```
Migration sets `default=True` so all existing users remain verified. The `register` view sets it to `False` on new email/password signups.

### New Endpoints

| Method | URL | Auth | Purpose |
|--------|-----|------|---------|
| POST | `/auth/google/` | None | Google ID token → JWT |
| GET | `/auth/verify-email/` | None | `?token=<signed>` → verify + return JWT |
| POST | `/auth/resend-verification/` | Required | Resend verification email (60s rate limit) |

### `/auth/google/` Logic

1. Receive `{ "id_token": "..." }`
2. Verify with `google.oauth2.id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)`
3. Extract `email`, `name` from payload
4. `User.objects.get_or_create(email=email)` — auto-link by email
5. If new user: set `username=email`, set `profile.email_verified=True`
6. If existing user: leave `email_verified` as-is, just return JWT
7. Return `{ access, refresh }` (same shape as `/auth/login/`)

### `/auth/verify-email/` Logic

1. Receive `?token=<signed_token>`
2. `signing.loads(token, max_age=86400)` → get `user_id`
3. Set `profile.email_verified = True`
4. Return new JWT so user is immediately logged in after verifying

### Verification Email Content

- Subject: *"Verify your YouAreInvited email"*
- Body: Link to `{FRONTEND_URL}/auth/verify-email?token={signed_token}`
- Link points to: `{FRONTEND_URL}/verify-email?token={signed_token}`
- Sent via `django.core.mail.send_mail`
- Token signed with `django.core.signing.dumps({'user_id': user.id})`

### `_user_payload()` Change

Add `email_verified` field to the response of `/auth/me/` and `/auth/register/`.

### New Dependency

```
google-auth
```

### New Env Vars

```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
EMAIL_HOST=...
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
EMAIL_PORT=587
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@youare-invited.com
```

---

## Frontend

### New Dependency

```
@react-oauth/google
```

### New Env Var

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same as backend>
```

### `web/src/app/layout.tsx`

Wrap with `<GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>`.

### `web/src/lib/api.ts`

Add to `authService`:
```ts
google: async (idToken: string): Promise<void> => {
  const response = await api.post<AuthTokens>('/auth/google/', { id_token: idToken });
  setToken(response.data.access);
},
resendVerification: async (): Promise<void> => {
  await api.post('/auth/resend-verification/');
},
```

Update `AuthUser` type:
```ts
email_verified: boolean;
```

### `/login` and `/signup` Pages

Add "Continue with Google" button using the `<GoogleLogin>` component from `@react-oauth/google`:
- `onSuccess` callback receives `{ credential }` (ID token string) → call `authService.google(credential)` → redirect to `/dashboard`
- On error: show inline error message
- Visually: styled divider ("or") between email form and Google button

### `web/src/components/VerificationBanner.tsx`

New shared component:
- Props: `{ onResend: () => void, resendState: 'idle' | 'sent' | 'cooldown' }`
- Renders: warning banner at the top of the page content area
- Copy: *"Please verify your email address. Check your inbox for a link."* + **[Resend email]** button
- Resend button shows "Sent!" for 5s then returns to idle; shows cooldown message if 429 returned

### `web/src/app/dashboard/page.tsx` (and other auth'd pages)

- Read `user.email_verified` from the existing `authService.me()` call
- Render `<VerificationBanner>` when `!user.email_verified`
- Pass `disabled={!user?.email_verified}` to all action buttons (New Event, Manage, Delete)

**Affected authenticated pages:** `/dashboard`, `/events/new`, `/events/[id]`, `/settings`, `/analytics`

### New Frontend Route

`/verify-email` — a simple page that:
1. Reads `?token=` from URL on mount
2. Calls `GET /auth/verify-email/?token=...`
3. On success: stores JWT, redirects to `/dashboard`
4. On error: shows "Link expired or invalid" with a button to resend

---

## What Does NOT Change

- Existing `/auth/login/`, `/auth/register/`, `/auth/logout/`, `/auth/me/` endpoints — unchanged
- `middleware.ts` — no changes needed
- `UserProfile` all other fields — unchanged
- Security staff flow (`/security/`) — unaffected
- Guest invitation pages — unaffected
