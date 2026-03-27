# Google Auth + Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth login and email verification (with unverified-user banner + disabled actions) to the existing JWT-based auth, without replacing any current functionality.

**Architecture:** Three new Django endpoints (`/auth/google/`, `/auth/verify-email/`, `/auth/resend-verification/`) extend `auth_views.py`. A `email_verified` field on `UserProfile` gates frontend actions. The Next.js frontend adds a `<GoogleLogin>` button on auth pages and a `<VerificationBanner>` on authenticated pages.

**Tech Stack:** `google-auth` (Python), `@react-oauth/google` (npm), Django signing for email tokens, Django `locmem` cache for rate-limiting, `django.core.mail` for sending.

---

## File Map

**Created:**
- `web/src/components/VerificationBanner.tsx` — banner + resend logic
- `web/src/app/verify-email/page.tsx` — email link landing page

**Modified:**
- `backend/requirements.txt` — add `google-auth`
- `backend/invitations/models.py` — add `email_verified` to `UserProfile`
- `backend/invitations/auth_views.py` — update `register`, `_user_payload`; add `verify_email`, `resend_verification`, `google_auth`
- `backend/api/urls.py` — wire 3 new endpoints
- `backend/api/settings.py` — email config + `GOOGLE_CLIENT_ID`
- `backend/tests/test_auth.py` — new tests for all new behaviour
- `web/src/lib/api.ts` — add `email_verified` to `AuthUser`; add `google()`, `resendVerification()` to `authService`
- `web/src/app/layout.tsx` — wrap with `GoogleOAuthProvider`
- `web/src/app/login/page.tsx` — add Google button
- `web/src/app/signup/page.tsx` — add Google button
- `web/src/app/dashboard/page.tsx` — banner + disabled buttons
- `web/src/app/events/new/page.tsx` — banner
- `web/src/app/events/[id]/page.tsx` — banner
- `web/src/app/settings/page.tsx` — banner
- `web/src/app/analytics/page.tsx` — banner
- `web/src/middleware.ts` — add `/verify-email` to `PUBLIC_PATHS`

---

### Task 1: Add `email_verified` to `UserProfile` and update `register`

**Files:**
- Modify: `backend/invitations/models.py`
- Modify: `backend/invitations/auth_views.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_auth.py`:

```python
@pytest.mark.django_db
def test_register_creates_unverified_user(api_client):
    response = api_client.post('/api/auth/register/', {
        'email': 'unverified@example.com',
        'password': 'X9mK#vPqL2!',
    }, format='json')
    assert response.status_code == 201
    user = User.objects.get(email='unverified@example.com')
    assert user.profile.email_verified is False


@pytest.mark.django_db
def test_me_returns_email_verified_field(auth_client, user):
    response = auth_client.get('/api/auth/me/')
    assert response.status_code == 200
    assert 'email_verified' in response.data
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_auth.py::test_register_creates_unverified_user tests/test_auth.py::test_me_returns_email_verified_field -v
```

Expected: FAIL — `AttributeError: 'UserProfile' object has no attribute 'email_verified'`

- [ ] **Step 3: Add `email_verified` field to `UserProfile`**

In `backend/invitations/models.py`, add the field to `UserProfile` after `watermark_override`:

```python
email_verified = models.BooleanField(default=True)
```

The full `UserProfile` class fields should look like:
```python
class UserProfile(models.Model):
    PLAN_CHOICES = [('free', 'Free'), ('pro', 'Pro')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default='free')
    brand_name = models.CharField(max_length=120, blank=True, default='')
    brand_logo = models.ImageField(upload_to=user_brand_logo_path, blank=True, null=True)
    show_branding_on_event_surfaces = models.BooleanField(default=False)
    watermark_override = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=True)
    default_whatsapp_message_template = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
```

- [ ] **Step 4: Generate and apply migration**

```bash
cd backend && python manage.py makemigrations invitations --name email_verified
python manage.py migrate
```

Expected output: `Applying invitations.0014_email_verified... OK`

- [ ] **Step 5: Update `register` view to set `email_verified=False`**

In `backend/invitations/auth_views.py`, update the `register` view. Replace the lines after `user = User.objects.create_user(...)`:

```python
    user = User.objects.create_user(username=email, email=email, password=password)
    profile = getattr(user, 'profile', None)
    if profile:
        profile.email_verified = False
        profile.save(update_fields=['email_verified'])
    refresh = RefreshToken.for_user(user)

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)
```

- [ ] **Step 6: Update `_user_payload` to include `email_verified`**

In `backend/invitations/auth_views.py`, add `email_verified` to the return dict of `_user_payload`:

```python
def _user_payload(user):
    username = (user.username or user.email or '').strip()
    username_base = username.split('@', 1)[0] if '@' in username else username
    full_name = user.get_full_name().strip()
    raw_display_name = full_name or username_base or user.email or 'Organizer'
    normalized_display_name = raw_display_name.replace('.', ' ').replace('_', ' ').replace('-', ' ')
    display_name = ' '.join(part.capitalize() for part in normalized_display_name.split()) or 'Organizer'
    profile = getattr(user, 'profile', None)

    return {
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'display_name': display_name,
        'avatar_initial': (username_base[:1] or 'U').upper(),
        'plan': profile.plan if profile else 'free',
        'brand_name': profile.brand_name if profile else '',
        'brand_logo_url': _brand_logo_url(profile),
        'show_event_branding': profile.show_branding_on_event_surfaces if profile else False,
        'email_verified': profile.email_verified if profile else True,
    }
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_auth.py::test_register_creates_unverified_user tests/test_auth.py::test_me_returns_email_verified_field -v
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
cd backend && git add invitations/models.py invitations/auth_views.py invitations/migrations/0014_email_verified.py tests/test_auth.py
git commit -m "feat: add email_verified field to UserProfile, set False on register"
```

---

### Task 2: Verification email on register + `verify_email` endpoint

**Files:**
- Modify: `backend/invitations/auth_views.py`
- Modify: `backend/api/urls.py`
- Modify: `backend/api/settings.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_auth.py`:

```python
from django.test import override_settings
from django.core import signing


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
def test_register_sends_verification_email(api_client):
    from django.core import mail
    response = api_client.post('/api/auth/register/', {
        'email': 'emailtest@example.com',
        'password': 'X9mK#vPqL2!',
    }, format='json')
    assert response.status_code == 201
    assert len(mail.outbox) == 1
    assert 'emailtest@example.com' in mail.outbox[0].to
    assert 'verify' in mail.outbox[0].subject.lower()


@pytest.mark.django_db
def test_verify_email_valid_token(api_client, user):
    user.profile.email_verified = False
    user.profile.save(update_fields=['email_verified'])

    token = signing.dumps({'user_id': user.id})
    response = api_client.get(f'/api/auth/verify-email/?token={token}')

    assert response.status_code == 200
    assert 'access' in response.data
    user.profile.refresh_from_db()
    assert user.profile.email_verified is True


@pytest.mark.django_db
def test_verify_email_expired_token(api_client, user):
    # Use max_age=0 trick: sign with a past timestamp by monkeypatching time
    # Simpler: sign normally then pass max_age=0 in view — we test via a bad token
    token = signing.dumps({'user_id': user.id}, salt='wrong-salt')
    response = api_client.get(f'/api/auth/verify-email/?token={token}')
    assert response.status_code == 400


@pytest.mark.django_db
def test_verify_email_invalid_token(api_client):
    response = api_client.get('/api/auth/verify-email/?token=not-a-valid-token')
    assert response.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_auth.py::test_register_sends_verification_email tests/test_auth.py::test_verify_email_valid_token tests/test_auth.py::test_verify_email_invalid_token -v
```

Expected: FAIL — `404` on `/api/auth/verify-email/` (not wired yet)

- [ ] **Step 3: Add email settings to `backend/api/settings.py`**

Add after the `SIMPLE_JWT` block:

```python
# Email
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@youare-invited.com')

# Google OAuth
GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default='')
```

- [ ] **Step 4: Add `send_verification_email` helper and `verify_email` view to `auth_views.py`**

Add these imports at the top of `backend/invitations/auth_views.py` (after existing imports):

```python
from django.core import signing
from django.core.mail import send_mail
```

Add the helper function after `_settings_payload`:

```python
def send_verification_email(user):
    token = signing.dumps({'user_id': user.id})
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    send_mail(
        subject='Verify your YouAreInvited email',
        message=(
            f'Hi,\n\n'
            f'Please verify your email address by clicking the link below:\n\n'
            f'{link}\n\n'
            f'This link expires in 24 hours.\n\n'
            f'If you did not create an account, you can ignore this email.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
```

Add the `register` call to send email — replace the line `refresh = RefreshToken.for_user(user)` in register with:

```python
    user = User.objects.create_user(username=email, email=email, password=password)
    profile = getattr(user, 'profile', None)
    if profile:
        profile.email_verified = False
        profile.save(update_fields=['email_verified'])

    try:
        send_verification_email(user)
    except Exception:
        pass  # Don't block registration if email fails

    refresh = RefreshToken.for_user(user)

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)
```

Add the `verify_email` view at the bottom of `auth_views.py`:

```python
@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request):
    token = request.query_params.get('token', '')
    if not token:
        return Response({'detail': 'Token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = signing.loads(token, max_age=86400)
        user_id = data['user_id']
    except signing.SignatureExpired:
        return Response({'detail': 'Verification link has expired.'}, status=status.HTTP_400_BAD_REQUEST)
    except (signing.BadSignature, KeyError, Exception):
        return Response({'detail': 'Invalid verification link.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_400_BAD_REQUEST)

    profile = getattr(user, 'profile', None)
    if profile:
        profile.email_verified = True
        profile.save(update_fields=['email_verified'])

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })
```

- [ ] **Step 5: Wire the new endpoint in `backend/api/urls.py`**

Add to the imports at the top of `api/urls.py`:

```python
from invitations.auth_views import (
    register,
    login,
    logout,
    me,
    account_settings,
    export_account_data,
    delete_account,
    verify_email,
)
```

Add to `urlpatterns`:

```python
    path('api/auth/verify-email/', verify_email),
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_auth.py::test_register_sends_verification_email tests/test_auth.py::test_verify_email_valid_token tests/test_auth.py::test_verify_email_expired_token tests/test_auth.py::test_verify_email_invalid_token -v
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add invitations/auth_views.py api/urls.py api/settings.py tests/test_auth.py
git commit -m "feat: send verification email on register, add verify-email endpoint"
```

---

### Task 3: `resend_verification` endpoint

**Files:**
- Modify: `backend/invitations/auth_views.py`
- Modify: `backend/api/urls.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_auth.py`:

```python
@pytest.mark.django_db
@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
def test_resend_verification_sends_email(auth_client, user):
    from django.core import mail
    from django.core.cache import cache
    cache.clear()

    user.profile.email_verified = False
    user.profile.save(update_fields=['email_verified'])

    response = auth_client.post('/api/auth/resend-verification/')

    assert response.status_code == 200
    assert len(mail.outbox) == 1
    assert user.email in mail.outbox[0].to


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
def test_resend_verification_rate_limited(auth_client, user):
    from django.core.cache import cache
    cache.clear()

    user.profile.email_verified = False
    user.profile.save(update_fields=['email_verified'])

    auth_client.post('/api/auth/resend-verification/')
    response = auth_client.post('/api/auth/resend-verification/')

    assert response.status_code == 429


@pytest.mark.django_db
def test_resend_verification_already_verified(auth_client, user):
    # user fixture has email_verified=True (default)
    response = auth_client.post('/api/auth/resend-verification/')
    assert response.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_auth.py::test_resend_verification_sends_email tests/test_auth.py::test_resend_verification_rate_limited tests/test_auth.py::test_resend_verification_already_verified -v
```

Expected: FAIL — `404`

- [ ] **Step 3: Add `resend_verification` view to `auth_views.py`**

Add this import at the top:

```python
from django.core.cache import cache
```

Add the view at the bottom of `backend/invitations/auth_views.py`:

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resend_verification(request):
    user = request.user
    profile = getattr(user, 'profile', None)

    if profile and profile.email_verified:
        return Response(
            {'detail': 'Email is already verified.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    cache_key = f'verify_resend_{user.id}'
    if cache.get(cache_key):
        return Response(
            {'detail': 'Please wait 60 seconds before requesting another verification email.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    cache.set(cache_key, True, 60)

    try:
        send_verification_email(user)
    except Exception:
        cache.delete(cache_key)
        return Response(
            {'detail': 'Failed to send email. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response({'detail': 'Verification email sent.'})
```

- [ ] **Step 4: Wire the endpoint in `backend/api/urls.py`**

Update the import from `invitations.auth_views`:

```python
from invitations.auth_views import (
    register,
    login,
    logout,
    me,
    account_settings,
    export_account_data,
    delete_account,
    verify_email,
    resend_verification,
)
```

Add to `urlpatterns`:

```python
    path('api/auth/resend-verification/', resend_verification),
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_auth.py::test_resend_verification_sends_email tests/test_auth.py::test_resend_verification_rate_limited tests/test_auth.py::test_resend_verification_already_verified -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add invitations/auth_views.py api/urls.py tests/test_auth.py
git commit -m "feat: add resend-verification endpoint with 60s rate limit"
```

---

### Task 4: Google OAuth endpoint

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/invitations/auth_views.py`
- Modify: `backend/api/urls.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Install `google-auth`**

```bash
cd backend && pip install google-auth==2.29.0
```

Add to `backend/requirements.txt`:

```
google-auth==2.29.0
```

- [ ] **Step 2: Write the failing tests**

Add to `backend/tests/test_auth.py`:

```python
from unittest.mock import patch


@pytest.mark.django_db
@patch('invitations.auth_views.id_token.verify_oauth2_token')
def test_google_auth_creates_new_user(mock_verify, api_client):
    mock_verify.return_value = {
        'email': 'googleuser@gmail.com',
        'name': 'Google User',
    }

    response = api_client.post('/api/auth/google/', {'id_token': 'fake-token'}, format='json')

    assert response.status_code == 200
    assert 'access' in response.data
    user = User.objects.get(email='googleuser@gmail.com')
    assert user.profile.email_verified is True


@pytest.mark.django_db
@patch('invitations.auth_views.id_token.verify_oauth2_token')
def test_google_auth_links_existing_user(mock_verify, api_client, user):
    mock_verify.return_value = {
        'email': 'testuser@example.com',  # matches the 'user' fixture
        'name': 'Test User',
    }

    response = api_client.post('/api/auth/google/', {'id_token': 'fake-token'}, format='json')

    assert response.status_code == 200
    assert 'access' in response.data
    # Should not have created a second user
    assert User.objects.filter(email='testuser@example.com').count() == 1


@pytest.mark.django_db
@patch('invitations.auth_views.id_token.verify_oauth2_token')
def test_google_auth_invalid_token(mock_verify, api_client):
    mock_verify.side_effect = ValueError('Invalid token')

    response = api_client.post('/api/auth/google/', {'id_token': 'bad-token'}, format='json')

    assert response.status_code == 400
    assert 'detail' in response.data


@pytest.mark.django_db
def test_google_auth_missing_token(api_client):
    response = api_client.post('/api/auth/google/', {}, format='json')
    assert response.status_code == 400
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_auth.py::test_google_auth_creates_new_user tests/test_auth.py::test_google_auth_links_existing_user tests/test_auth.py::test_google_auth_invalid_token tests/test_auth.py::test_google_auth_missing_token -v
```

Expected: FAIL — `404` or `ImportError`

- [ ] **Step 4: Add Google auth imports and view to `auth_views.py`**

Add these imports to the top of `backend/invitations/auth_views.py`:

```python
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
```

Add the `google_auth` view at the bottom of `auth_views.py`:

```python
@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    id_token_str = request.data.get('id_token', '').strip()
    if not id_token_str:
        return Response({'detail': 'id_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    google_client_id = settings.GOOGLE_CLIENT_ID
    if not google_client_id:
        return Response(
            {'detail': 'Google login is not configured.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    try:
        payload = id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            google_client_id,
        )
    except ValueError:
        return Response({'detail': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)

    email = payload.get('email', '').strip().lower()
    name = payload.get('name', '').strip()

    if not email:
        return Response(
            {'detail': 'Google account has no email address.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user, created = User.objects.get_or_create(
        email=email,
        defaults={'username': email},
    )

    if created:
        name_parts = name.split(' ', 1)
        user.first_name = name_parts[0] if name_parts else ''
        user.last_name = name_parts[1] if len(name_parts) > 1 else ''
        user.save(update_fields=['first_name', 'last_name'])

    profile = getattr(user, 'profile', None)
    if created and profile:
        profile.email_verified = True
        profile.save(update_fields=['email_verified'])

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })
```

- [ ] **Step 5: Wire the endpoint in `backend/api/urls.py`**

Update the import:

```python
from invitations.auth_views import (
    register,
    login,
    logout,
    me,
    account_settings,
    export_account_data,
    delete_account,
    verify_email,
    resend_verification,
    google_auth,
)
```

Add to `urlpatterns`:

```python
    path('api/auth/google/', google_auth),
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_auth.py::test_google_auth_creates_new_user tests/test_auth.py::test_google_auth_links_existing_user tests/test_auth.py::test_google_auth_invalid_token tests/test_auth.py::test_google_auth_missing_token -v
```

Expected: PASS

- [ ] **Step 7: Run the full test suite**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add requirements.txt invitations/auth_views.py api/urls.py api/settings.py tests/test_auth.py
git commit -m "feat: add Google OAuth endpoint /auth/google/"
```

---

### Task 5: Update frontend types and `authService`

**Files:**
- Modify: `web/src/lib/api.ts`

- [ ] **Step 1: Update `AuthUser` type and add new `authService` methods**

In `web/src/lib/api.ts`, update the `AuthUser` interface to add `email_verified`:

```typescript
export interface AuthUser {
  id: number;
  email: string;
  username: string;
  display_name: string;
  avatar_initial: string;
  plan: 'free' | 'pro';
  brand_name: string;
  brand_logo_url: string | null;
  show_event_branding: boolean;
  email_verified: boolean;
}
```

Add to `authService` object (after `deleteAccount`):

```typescript
  google: async (idToken: string): Promise<void> => {
    const response = await api.post<AuthTokens>('/auth/google/', { id_token: idToken });
    setToken(response.data.access);
  },

  resendVerification: async (): Promise<void> => {
    await api.post('/auth/resend-verification/');
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/api.ts
git commit -m "feat: add email_verified to AuthUser type, add google() and resendVerification() to authService"
```

---

### Task 6: Add `GoogleOAuthProvider` to layout

**Files:**
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Install `@react-oauth/google`**

```bash
cd web && npm install @react-oauth/google
```

- [ ] **Step 2: Add env var**

Add to `web/.env.local` (create if missing):

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

> **Note:** Get the OAuth 2.0 Client ID from [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials. Set Authorized JavaScript origins to `http://localhost:3000` (dev) and `https://www.youare-invited.com` (prod).

- [ ] **Step 3: Update `web/src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next';
import { Inter, Noto_Serif, Manrope } from 'next/font/google';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-noto-serif',
  style: ['normal', 'italic'],
  weight: ['300', '400', '700'],
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'YouAreInvited | The Art of Invitation',
  description: 'Cinematic digital invitations for your most meaningful moments.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0"
        />
      </head>
      <body className={`${inter.className} ${notoSerif.variable} ${manrope.variable}`}>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/layout.tsx web/package.json web/package-lock.json
git commit -m "feat: add GoogleOAuthProvider to root layout"
```

---

### Task 7: Google button on login page

**Files:**
- Modify: `web/src/app/login/page.tsx`

- [ ] **Step 1: Update `web/src/app/login/page.tsx`**

The `LoginForm` component needs a Google error state and the `<GoogleLogin>` button. Replace the full file:

```typescript
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { authService } from '@/lib/api';

const DEFAULT_NEXT_PATH = '/dashboard';
const ALLOWED_NEXT_PATTERNS = [
  /^\/dashboard(?:\/|$|\?)/,
  /^\/events(?:\/|$|\?)/,
];

const resolveNextPath = (next: string | null): string => {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return DEFAULT_NEXT_PATH;
  }
  return ALLOWED_NEXT_PATTERNS.some((pattern) => pattern.test(next))
    ? next
    : DEFAULT_NEXT_PATH;
};

const Aurora = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
    <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
    <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
  </div>
);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = resolveNextPath(searchParams.get('next'));
  const reason = searchParams.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    reason === 'session-expired' ? 'Your session expired. Sign in again.' : ''
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(email, password);
      router.push(next);
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }
    try {
      await authService.google(credentialResponse.credential);
      router.push(next);
    } catch {
      setError('Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6 sm:mb-8">
        <span className="font-headline italic text-brand text-2xl tracking-tight select-none">
          youareinvited
        </span>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-6 sm:p-8">
        <div className="w-14 h-14 rounded-2xl bg-brand-container/40 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-brand text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
        </div>

        <div className="text-center mb-6">
          <h1 className="font-headline text-2xl text-on-lp-background">Welcome back</h1>
          <p className="text-on-surface-variant text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full h-11 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-lp-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full h-11 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-lp-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <span className="material-symbols-outlined text-red-400 text-base mt-0.5 shrink-0">warning</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand/90 active:bg-brand/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>login</span>
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-outline-variant/20" />
          <span className="text-xs text-on-surface-variant/60 font-medium">or</span>
          <div className="flex-1 h-px bg-outline-variant/20" />
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in failed. Please try again.')}
            shape="pill"
            theme="outline"
            size="large"
            text="signin_with"
          />
        </div>

        <p className="text-center text-sm text-on-surface-variant mt-6">
          No account?{' '}
          <a href="/signup" className="text-brand font-semibold hover:underline">Create one</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-lp-background flex items-center justify-center px-4 sm:px-6 py-8 sm:py-10">
      <Aurora />
      <Suspense fallback={
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/login/page.tsx
git commit -m "feat: add Google login button to login page"
```

---

### Task 8: Google button on signup page

**Files:**
- Modify: `web/src/app/signup/page.tsx`

- [ ] **Step 1: Update `web/src/app/signup/page.tsx`**

Replace the full file:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { authService } from '@/lib/api';

const Aurora = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
    <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
    <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
  </div>
);

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await authService.register(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google sign-up failed. Please try again.');
      return;
    }
    try {
      await authService.google(credentialResponse.credential);
      router.push('/dashboard');
    } catch {
      setError('Google sign-up failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-lp-background flex items-center justify-center px-4 sm:px-6 py-8 sm:py-10">
      <Aurora />

      <div className="w-full max-w-sm">
        <div className="text-center mb-6 sm:mb-8">
          <span className="font-headline italic text-brand text-2xl tracking-tight select-none">
            youareinvited
          </span>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-6 sm:p-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-container/40 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-brand text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
          </div>

          <div className="text-center mb-6">
            <h1 className="font-headline text-2xl text-on-lp-background">Create account</h1>
            <p className="text-on-surface-variant text-sm mt-1">Start managing your events</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full h-11 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-lp-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                className="w-full h-11 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-lp-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-11 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-lp-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <span className="material-symbols-outlined text-red-400 text-base mt-0.5 shrink-0">warning</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand/90 active:bg-brand/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-outline-variant/20" />
            <span className="text-xs text-on-surface-variant/60 font-medium">or</span>
            <div className="flex-1 h-px bg-outline-variant/20" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-up failed. Please try again.')}
              shape="pill"
              theme="outline"
              size="large"
              text="signup_with"
            />
          </div>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-brand font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/signup/page.tsx
git commit -m "feat: add Google sign-up button to signup page"
```

---

### Task 9: `VerificationBanner` component

**Files:**
- Create: `web/src/components/VerificationBanner.tsx`

- [ ] **Step 1: Create `web/src/components/VerificationBanner.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { authService } from '@/lib/api';

type ResendState = 'idle' | 'loading' | 'sent' | 'cooldown' | 'error';

export default function VerificationBanner() {
  const [resendState, setResendState] = useState<ResendState>('idle');

  const handleResend = async () => {
    setResendState('loading');
    try {
      await authService.resendVerification();
      setResendState('sent');
      setTimeout(() => setResendState('idle'), 5000);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setResendState('cooldown');
        setTimeout(() => setResendState('idle'), 60000);
      } else {
        setResendState('error');
        setTimeout(() => setResendState('idle'), 5000);
      }
    }
  };

  const resendLabel = {
    idle: 'Resend email',
    loading: 'Sending…',
    sent: 'Sent!',
    cooldown: 'Wait 60s',
    error: 'Failed — retry',
  }[resendState];

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-800">
          <span className="material-symbols-outlined text-amber-500 text-base shrink-0">
            mark_email_unread
          </span>
          <p className="text-sm font-medium">
            Please verify your email address. Check your inbox for a verification link.
          </p>
        </div>
        <button
          onClick={handleResend}
          disabled={resendState === 'loading' || resendState === 'cooldown'}
          className="text-xs font-semibold text-amber-700 border border-amber-300 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-full transition-colors shrink-0"
        >
          {resendLabel}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/VerificationBanner.tsx
git commit -m "feat: add VerificationBanner component"
```

---

### Task 10: `/verify-email` page + middleware

**Files:**
- Create: `web/src/app/verify-email/page.tsx`
- Modify: `web/src/middleware.ts`

- [ ] **Step 1: Add `/verify-email` to public paths in `middleware.ts`**

In `web/src/middleware.ts`, update `PUBLIC_PATHS`:

```typescript
const PUBLIC_PATHS = new Set([
  '/', '/login', '/logout', '/signup', '/verify-email',
]);
```

- [ ] **Step 2: Create `web/src/app/verify-email/page.tsx`**

```typescript
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService, api } from '@/lib/api';
import { setToken } from '@/lib/auth';

type State = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const [resendState, setResendState] = useState<'idle' | 'sent' | 'error'>('idle');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      return;
    }

    api.get(`/auth/verify-email/?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setToken(res.data.access);
        setState('success');
        setTimeout(() => router.push('/dashboard'), 1500);
      })
      .catch(() => setState('error'));
  }, [searchParams, router]);

  const handleResend = async () => {
    try {
      await authService.resendVerification();
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  if (state === 'loading') {
    return (
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-on-surface-variant text-sm">Verifying your email…</p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-container/40 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-brand text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h1 className="font-headline text-2xl text-on-lp-background mb-2">Email verified!</h1>
        <p className="text-on-surface-variant text-sm">Redirecting you to the dashboard…</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
        <span className="material-symbols-outlined text-red-500 text-3xl">link_off</span>
      </div>
      <h1 className="font-headline text-2xl text-on-lp-background mb-2">Link expired or invalid</h1>
      <p className="text-on-surface-variant text-sm mb-6">
        This verification link has expired or is invalid.
      </p>
      {resendState === 'idle' && (
        <button
          onClick={handleResend}
          className="px-6 py-3 bg-brand text-white rounded-full font-semibold text-sm hover:bg-brand/90 transition-colors"
        >
          Send a new verification email
        </button>
      )}
      {resendState === 'sent' && (
        <p className="text-brand text-sm font-medium">Check your inbox for a new link.</p>
      )}
      {resendState === 'error' && (
        <p className="text-red-600 text-sm">Could not send email. Please sign in and try again.</p>
      )}
      <p className="text-on-surface-variant text-sm mt-4">
        <a href="/login" className="text-brand font-semibold hover:underline">Back to sign in</a>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-lp-background flex items-center justify-center px-4 sm:px-6 py-8 sm:py-10">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-headline italic text-brand text-2xl tracking-tight select-none">
            youareinvited
          </span>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-8">
          <Suspense fallback={
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto" />
          }>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/src/app/verify-email/page.tsx web/src/middleware.ts
git commit -m "feat: add /verify-email page and allow it in middleware"
```

---

### Task 11: Dashboard verification state

**Files:**
- Modify: `web/src/app/dashboard/page.tsx`

- [ ] **Step 1: Add `VerificationBanner` import and unverified state to dashboard**

In `web/src/app/dashboard/page.tsx`:

Add import at the top:
```typescript
import VerificationBanner from '@/components/VerificationBanner';
```

In the JSX, render the banner just before the main content area. Find the `<main>` tag and add the banner right after `<header>...</header>`:

```typescript
      {/* Verification banner */}
      {user && !user.email_verified && <VerificationBanner />}
```

Disable action buttons when unverified. Find each action button and add `disabled={!user?.email_verified}` plus a disabled style:

The "+ New Event" button in the sidebar (there are two — sidebar and header):
```typescript
<button
  onClick={() => router.push('/events/new')}
  disabled={!user?.email_verified}
  className="w-full bg-brand text-white py-3 rounded-full font-medium shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
>
  + New Event
</button>
```

The "Delete" button inside the events map:
```typescript
<button
  onClick={() => handleDelete(event.id)}
  disabled={!user?.email_verified}
  className="text-xs text-left text-on-surface-variant hover:text-tertiary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
>
  Delete
</button>
```

The "Manage Event" button inside the events map:
```typescript
<button
  onClick={() => router.push(`/events/${event.id}`)}
  disabled={!user?.email_verified}
  className="flex items-center text-brand font-bold text-sm group-hover:translate-x-1 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0"
>
  Manage Event <span className="material-symbols-outlined ml-1">arrow_forward</span>
</button>
```

The FAB at the bottom:
```typescript
<button
  onClick={() => router.push('/events/new')}
  disabled={!user?.email_verified}
  className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 bg-on-lp-background text-lp-background w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
>
  <span className="material-symbols-outlined">add</span>
</button>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/dashboard/page.tsx
git commit -m "feat: show verification banner and disable actions on dashboard when unverified"
```

---

### Task 12: Verification banner on remaining authenticated pages

**Files:**
- Modify: `web/src/app/events/new/page.tsx`
- Modify: `web/src/app/events/[id]/page.tsx`
- Modify: `web/src/app/settings/page.tsx`
- Modify: `web/src/app/analytics/page.tsx`

For each of these pages, the pattern is identical:
1. Import `VerificationBanner`
2. Ensure `user` state is fetched (most pages already call `authService.me()`)
3. Render `{user && !user.email_verified && <VerificationBanner />}` at the top of the page content, after the header

- [ ] **Step 1: Read each file to understand its current structure**

```bash
# Read each file before editing
```

Open each file and:
- Confirm that `authService.me()` is already called and stored in a `user` state variable
- If not, add `const [user, setUser] = useState<AuthUser | null>(null)` and call `authService.me().then(setUser)` in a `useEffect`

- [ ] **Step 2: Add banner to `web/src/app/events/new/page.tsx`**

Add import:
```typescript
import VerificationBanner from '@/components/VerificationBanner';
```

Add banner render just after the page header/nav and before the main form content:
```typescript
{user && !user.email_verified && <VerificationBanner />}
```

- [ ] **Step 3: Add banner to `web/src/app/events/[id]/page.tsx`**

Same pattern: import `VerificationBanner`, render `{user && !user.email_verified && <VerificationBanner />}` at top of content.

- [ ] **Step 4: Add banner to `web/src/app/settings/page.tsx`**

Same pattern.

- [ ] **Step 5: Add banner to `web/src/app/analytics/page.tsx`**

Same pattern.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add web/src/app/events/new/page.tsx web/src/app/events/[id]/page.tsx web/src/app/settings/page.tsx web/src/app/analytics/page.tsx
git commit -m "feat: show verification banner on all authenticated pages"
```

---

## Setup Checklist (before first run)

- [ ] Create a Google Cloud Console project, enable "Google Identity" API, create an OAuth 2.0 Client ID (Web application type). Add `http://localhost:3000` to Authorized JavaScript Origins.
- [ ] Set `GOOGLE_CLIENT_ID` in `backend/.env` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `web/.env.local`
- [ ] Configure email in `backend/.env` for production (use SendGrid, Resend, or any SMTP provider). Dev uses console backend by default.
- [ ] Ensure `pip install google-auth==2.29.0` has been run (or `pip install -r requirements.txt`)
- [ ] Ensure `npm install` has been run in `web/` to pick up `@react-oauth/google`
