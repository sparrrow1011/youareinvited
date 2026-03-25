# Super-Admin App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Next.js 14 super-admin app (`admin/`) and the Django backend endpoints it consumes — giving platform operators a secure dashboard to view platform KPIs, manage users (plan, watermark, delete), and inspect user events.

**Architecture:** A separate Next.js 14 app at `admin/` (alongside `web/` and `backend/`). All admin API calls go directly from the browser to the Django backend, authenticated via `X-Super-Admin-Token` header carrying a shared secret read from a non-httpOnly cookie (`admin_token`). A new Django auth class (`SuperAdminTokenAuthentication`) validates the header server-side. The Next.js middleware protects all routes except `/` (login) and `/api/login`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Three.js (login hero), Recharts (dashboard charts), Axios + js-cookie (API client), Django REST Framework (backend). Skills: `@threejs`, `@kpi-dashboard-design`, `@accent-animations`.

**Spec:** `docs/superpowers/specs/2026-03-22-homepage-admin-redesign.md` — Workstream 3.

**Design tokens** (same as `web/`): background `#1a1a2e`, card `#16213e`, accent `#e94560`, secondary text `#a8dadc`, blue `#0f3460`.

---

## File Map

### Backend (`backend/`)

| File | Action | Purpose |
|------|--------|---------|
| `backend/api/settings.py` | Modify | Add `SUPER_ADMIN_SECRET`, `SUPER_ADMIN_ORIGIN`, `CORS_ALLOW_HEADERS` with `x-super-admin-token` |
| `backend/invitations/superadmin_views.py` | Create | `SuperAdminTokenAuthentication` class + 5 view functions |
| `backend/api/urls.py` | Modify | Register 5 superadmin routes under `/api/superadmin/` |
| `backend/tests/test_superadmin.py` | Create | Auth rejection, stats, growth, user CRUD tests |

### Admin frontend (`admin/`)

| File | Action | Purpose |
|------|--------|---------|
| `admin/package.json` | Create | Dependencies: next, react, axios, js-cookie, recharts, three, tailwind |
| `admin/next.config.js` | Create | Minimal config — no backend proxy (Axios calls Django directly) |
| `admin/tailwind.config.js` | Create | Same dark design tokens as `web/` |
| `admin/tsconfig.json` | Create | Standard Next.js 14 TypeScript config with `@/*` path alias |
| `admin/.env.example` | Create | `SUPER_ADMIN_SECRET`, `NEXT_PUBLIC_BACKEND_URL` (no `BACKEND_URL` — Axios uses the public env var directly) |
| `admin/src/middleware.ts` | Create | Cookie guard: all routes except `/` and `/api/login` require `admin_token` |
| `admin/src/app/globals.css` | Create | Tailwind directives |
| `admin/src/app/layout.tsx` | Create | Root layout: dark background, Inter font |
| `admin/src/lib/auth.ts` | Create | Cookie helpers: `getAdminToken`, `clearAdminToken` |
| `admin/src/lib/api.ts` | Create | Axios instance with `X-Super-Admin-Token` interceptor + typed API helpers |
| `admin/src/components/ThreeHero.tsx` | Create | Three.js floating invitation cards scene (same scene as web app) |
| `admin/src/components/Sidebar.tsx` | Create | Fixed left nav with Overview/Users links + Sign Out |
| `admin/src/components/KpiCard.tsx` | Create | Stat card with count-up entrance animation (`@accent-animations`) |
| `admin/src/components/ConfirmModal.tsx` | Create | Reusable delete confirmation modal |
| `admin/src/app/page.tsx` | Create | Login page (client component, Three.js background) |
| `admin/src/app/api/login/route.ts` | Create | POST: compare password → set `admin_token` cookie |
| `admin/src/app/dashboard/page.tsx` | Create | KPI row + two Recharts charts |
| `admin/src/app/users/page.tsx` | Create | Searchable user table with plan/watermark inline edits |
| `admin/src/app/users/[id]/page.tsx` | Create | User detail: edit form, events table, danger zone |

---

## Task 1: Backend — settings additions

**What:** Add three new settings to `backend/api/settings.py`: the super-admin secret, the admin Vercel origin (for CORS/CSRF), and extend `CORS_ALLOW_HEADERS` to include `x-super-admin-token`. No migrations needed.

**Files:**
- Modify: `backend/api/settings.py`

- [ ] **Step 1: Add settings**

Open `backend/api/settings.py`. After the `CSRF_TRUSTED_ORIGINS` block, add:

```python
# Super-admin
SUPER_ADMIN_SECRET = config('SUPER_ADMIN_SECRET', default='')
SUPER_ADMIN_ORIGIN = config('SUPER_ADMIN_ORIGIN', default='')

# Extend CORS/CSRF to include the admin Vercel deployment if set
if SUPER_ADMIN_ORIGIN and SUPER_ADMIN_ORIGIN not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS + [SUPER_ADMIN_ORIGIN]
if SUPER_ADMIN_ORIGIN and SUPER_ADMIN_ORIGIN not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = CSRF_TRUSTED_ORIGINS + [SUPER_ADMIN_ORIGIN]

# CORS headers — add custom super-admin token header
from corsheaders.defaults import default_headers  # noqa: E402
CORS_ALLOW_HEADERS = list(default_headers) + ['x-super-admin-token']
```

The `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` variables are already defined above this block via `config()`. These two `if` lines append the admin origin at runtime only if it's set.

- [ ] **Step 2: Verify Django starts**

```bash
cd backend && python manage.py check
```

Expected: `System check identified no issues`.

- [ ] **Step 3: Commit**

```bash
cd backend
git add api/settings.py
git commit -m "feat: add SUPER_ADMIN_SECRET, SUPER_ADMIN_ORIGIN, x-super-admin-token CORS header"
```

---

## Task 2: Backend — superadmin views

**What:** Create `backend/invitations/superadmin_views.py` with the custom DRF authentication class and all 5 view functions covering stats, growth, user list, user PATCH/DELETE, and user events.

**Files:**
- Create: `backend/invitations/superadmin_views.py`

- [ ] **Step 1: Create the file**

```python
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta

from rest_framework.authentication import BaseAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from invitations.models import Invitation, Event


class SuperAdminTokenAuthentication(BaseAuthentication):
    """
    Validates the X-Super-Admin-Token request header against SUPER_ADMIN_SECRET.
    Returns a synthetic user object on success — no real User row required.
    If the header is absent, returns None (passes to next auth backend).
    If the header is present but wrong, raises AuthenticationFailed.
    """

    def authenticate(self, request):
        token = request.META.get('HTTP_X_SUPER_ADMIN_TOKEN', '')
        if not token:
            return None  # Header absent — not our request

        secret = getattr(settings, 'SUPER_ADMIN_SECRET', '')
        if not secret or token != secret:
            raise AuthenticationFailed('Invalid super-admin token.')

        # Synthetic user — is_authenticated=True satisfies IsAuthenticated permission
        user = type('SuperAdminUser', (), {
            'is_authenticated': True,
            'is_anonymous': False,
            'pk': None,
        })()
        return (user, None)


def _user_dict(user):
    """Serialize a User + UserProfile into the response shape."""
    profile = getattr(user, 'profile', None)
    return {
        'id': user.id,
        'email': user.email,
        'plan': profile.plan if profile else 'free',
        'watermark_override': profile.watermark_override if profile else False,
        'event_count': getattr(user, 'event_count', 0),
        'invitation_count': getattr(user, 'invitation_count', 0),
        'created_at': user.date_joined.isoformat(),
    }


_auth = [SuperAdminTokenAuthentication]
_perms = [IsAuthenticated]


@api_view(['GET'])
@authentication_classes(_auth)
@permission_classes(_perms)
def superadmin_stats(request):
    """
    GET /api/superadmin/stats/
    Returns platform-wide counts. checkins_today uses UTC day boundaries.
    """
    today = timezone.now().date()
    checkins_today = Invitation.objects.filter(
        checked_in=True,
        checked_in_at__date=today,
    ).count()

    total_invitations = Invitation.objects.count()
    total_events = Event.objects.count()
    total_users = User.objects.count()
    checkin_rate = (checkins_today / total_invitations * 100) if total_invitations > 0 else 0

    return Response({
        'total_users': total_users,
        'total_events': total_events,
        'total_invitations': total_invitations,
        'checkins_today': checkins_today,
        'checkin_rate': round(checkin_rate, 1),
    })


@api_view(['GET'])
@authentication_classes(_auth)
@permission_classes(_perms)
def superadmin_growth(request):
    """
    GET /api/superadmin/growth/
    Last 30 days of daily { date, new_users, new_events }. UTC day boundaries.
    All 30 days included — days with zero activity have counts of 0.
    """
    today = timezone.now().date()
    start = today - timedelta(days=29)

    user_counts = dict(
        User.objects.filter(date_joined__date__gte=start)
        .annotate(day=TruncDate('date_joined'))
        .values('day')
        .annotate(count=Count('id'))
        .values_list('day', 'count')
    )
    event_counts = dict(
        Event.objects.filter(created_at__date__gte=start)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(count=Count('id'))
        .values_list('day', 'count')
    )

    growth = [
        {
            'date': (start + timedelta(days=i)).isoformat(),
            'new_users': user_counts.get(start + timedelta(days=i), 0),
            'new_events': event_counts.get(start + timedelta(days=i), 0),
        }
        for i in range(30)
    ]
    return Response(growth)


@api_view(['GET'])
@authentication_classes(_auth)
@permission_classes(_perms)
def superadmin_users(request):
    """
    GET /api/superadmin/users/
    All users with plan, watermark_override, event/invitation counts.
    No pagination — acceptable for v1 until user count exceeds ~500.
    """
    users = (
        User.objects.select_related('profile')
        .annotate(
            event_count=Count('events', distinct=True),
            invitation_count=Count('events__invitations', distinct=True),
        )
        .order_by('-date_joined')
    )
    return Response([_user_dict(u) for u in users])


@api_view(['PATCH', 'DELETE'])
@authentication_classes(_auth)
@permission_classes(_perms)
def superadmin_user_detail(request, user_id):
    """
    PATCH /api/superadmin/users/{id}/ — update plan and/or watermark_override
    DELETE /api/superadmin/users/{id}/ — delete user and all associated data
    """
    try:
        user = User.objects.select_related('profile').get(pk=user_id)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        user.delete()  # CASCADE on FK removes events and invitations
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH
    profile = user.profile
    if 'plan' in request.data:
        if request.data['plan'] not in ('free', 'pro'):
            return Response(
                {'plan': 'Must be "free" or "pro".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile.plan = request.data['plan']
    if 'watermark_override' in request.data:
        profile.watermark_override = bool(request.data['watermark_override'])
    profile.save()

    # Re-fetch with annotations for the response
    user = (
        User.objects.select_related('profile')
        .annotate(
            event_count=Count('events', distinct=True),
            invitation_count=Count('events__invitations', distinct=True),
        )
        .get(pk=user_id)
    )
    return Response(_user_dict(user))


@api_view(['GET'])
@authentication_classes(_auth)
@permission_classes(_perms)
def superadmin_user_events(request, user_id):
    """
    GET /api/superadmin/users/{id}/events/
    All events for a specific user with invitation counts.
    """
    if not User.objects.filter(pk=user_id).exists():
        return Response(status=status.HTTP_404_NOT_FOUND)

    events = (
        Event.objects.filter(owner_id=user_id)
        .annotate(invitation_count=Count('invitations'))
        .order_by('-created_at')
    )
    data = [
        {
            'id': str(e.id),
            'name': e.name,
            'date': e.date.isoformat(),
            'invitation_count': e.invitation_count,
            'has_template': bool(e.background_image),
        }
        for e in events
    ]
    return Response(data)
```

- [ ] **Step 2: Verify the module imports cleanly**

```bash
cd backend && python -c "from invitations.superadmin_views import superadmin_stats; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd backend
git add invitations/superadmin_views.py
git commit -m "feat: add SuperAdminTokenAuthentication and superadmin views (stats, growth, users)"
```

---

## Task 3: Backend — register superadmin URLs

**What:** Add 5 URL patterns to `backend/api/urls.py` under `/api/superadmin/`.

**Files:**
- Modify: `backend/api/urls.py`

- [ ] **Step 1: Add import and URL patterns**

At the top of `backend/api/urls.py`, add the import alongside the existing auth imports:

```python
from invitations.superadmin_views import (
    superadmin_stats,
    superadmin_growth,
    superadmin_users,
    superadmin_user_detail,
    superadmin_user_events,
)
```

Add these 5 patterns to `urlpatterns`:

```python
path('api/superadmin/stats/', superadmin_stats),
path('api/superadmin/growth/', superadmin_growth),
path('api/superadmin/users/', superadmin_users),
path('api/superadmin/users/<int:user_id>/', superadmin_user_detail),
path('api/superadmin/users/<int:user_id>/events/', superadmin_user_events),
```

- [ ] **Step 2: Verify routes are registered**

```bash
cd backend && python manage.py check
```

Expected: `System check identified no issues`. The URL patterns have no `name=` argument, so `reverse()` won't work — rely on `manage.py check` and a manual curl test once the server is running.

- [ ] **Step 3: Commit**

```bash
cd backend
git add api/urls.py
git commit -m "feat: register /api/superadmin/ routes"
```

---

## Task 4: Backend — superadmin tests

**What:** Write tests covering auth rejection, stats response shape, growth time series, user list, user PATCH, user DELETE, and user events.

**Files:**
- Create: `backend/tests/test_superadmin.py`

- [ ] **Step 1: Write the tests**

```python
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from invitations.models import Event, Invitation, UserProfile


SECRET = 'sup3r-s3cret-t0k3n'
HEADERS = {'HTTP_X_SUPER_ADMIN_TOKEN': SECRET}


def make_user(email, password='X9mK#vPqL2!'):
    user = User.objects.create_user(username=email, email=email, password=password)
    # Ensure profile exists (signal creates it, but explicit is clearer in tests)
    UserProfile.objects.get_or_create(user=user)
    return user


@override_settings(SUPER_ADMIN_SECRET=SECRET)
class SuperAdminAuthTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_no_token_returns_403(self):
        res = self.client.get('/api/superadmin/stats/')
        self.assertEqual(res.status_code, 403)

    def test_wrong_token_returns_403(self):
        res = self.client.get('/api/superadmin/stats/', HTTP_X_SUPER_ADMIN_TOKEN='wrong')
        self.assertEqual(res.status_code, 403)

    def test_correct_token_returns_200(self):
        res = self.client.get('/api/superadmin/stats/', **HEADERS)
        self.assertEqual(res.status_code, 200)

    def test_missing_secret_config_returns_403(self):
        # If SUPER_ADMIN_SECRET is empty string, all requests should fail
        with self.settings(SUPER_ADMIN_SECRET=''):
            res = self.client.get('/api/superadmin/stats/', **HEADERS)
            self.assertEqual(res.status_code, 403)


@override_settings(SUPER_ADMIN_SECRET=SECRET)
class SuperAdminStatsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user('organizer@test.com')
        self.event = Event.objects.create(
            owner=self.user, name='Test Event', date='2026-06-01'
        )

    def test_stats_response_shape(self):
        res = self.client.get('/api/superadmin/stats/', **HEADERS)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        for key in ('total_users', 'total_events', 'total_invitations', 'checkins_today', 'checkin_rate'):
            self.assertIn(key, data, f"Missing key: {key}")

    def test_stats_counts_are_correct(self):
        Invitation.objects.create(
            event=self.event, name='Guest A', seat_number='A1', tag='VIP',
            checked_in=True, checked_in_at=timezone.now(),
        )
        res = self.client.get('/api/superadmin/stats/', **HEADERS)
        data = res.json()
        self.assertEqual(data['total_users'], 1)
        self.assertEqual(data['total_events'], 1)
        self.assertEqual(data['total_invitations'], 1)
        self.assertEqual(data['checkins_today'], 1)


@override_settings(SUPER_ADMIN_SECRET=SECRET)
class SuperAdminGrowthTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_growth_returns_30_days(self):
        res = self.client.get('/api/superadmin/growth/', **HEADERS)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 30)

    def test_growth_has_required_keys(self):
        res = self.client.get('/api/superadmin/growth/', **HEADERS)
        first = res.json()[0]
        for key in ('date', 'new_users', 'new_events'):
            self.assertIn(key, first)

    def test_growth_no_gaps_for_inactive_days(self):
        # Even with no data, all 30 entries should be present with zeros
        res = self.client.get('/api/superadmin/growth/', **HEADERS)
        data = res.json()
        for entry in data:
            self.assertGreaterEqual(entry['new_users'], 0)
            self.assertGreaterEqual(entry['new_events'], 0)


@override_settings(SUPER_ADMIN_SECRET=SECRET)
class SuperAdminUsersTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user('user@test.com')

    def test_users_list_returns_all_users(self):
        res = self.client.get('/api/superadmin/users/', **HEADERS)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        user_data = res.json()[0]
        for key in ('id', 'email', 'plan', 'watermark_override', 'event_count', 'invitation_count', 'created_at'):
            self.assertIn(key, user_data)

    def test_patch_plan(self):
        res = self.client.patch(
            f'/api/superadmin/users/{self.user.id}/',
            {'plan': 'pro'},
            format='json',
            **HEADERS,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['plan'], 'pro')
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.plan, 'pro')

    def test_patch_watermark_override(self):
        res = self.client.patch(
            f'/api/superadmin/users/{self.user.id}/',
            {'watermark_override': True},
            format='json',
            **HEADERS,
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['watermark_override'])

    def test_patch_invalid_plan_returns_400(self):
        res = self.client.patch(
            f'/api/superadmin/users/{self.user.id}/',
            {'plan': 'enterprise'},
            format='json',
            **HEADERS,
        )
        self.assertEqual(res.status_code, 400)

    def test_delete_user(self):
        res = self.client.delete(f'/api/superadmin/users/{self.user.id}/', **HEADERS)
        self.assertEqual(res.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.id).exists())

    def test_delete_cascades_events_and_invitations(self):
        event = Event.objects.create(owner=self.user, name='Cascade Test', date='2026-07-01')
        Invitation.objects.create(event=event, name='Guest', seat_number='B1', tag='Gen')
        self.client.delete(f'/api/superadmin/users/{self.user.id}/', **HEADERS)
        self.assertEqual(Event.objects.filter(pk=event.pk).count(), 0)

    def test_user_events(self):
        event = Event.objects.create(owner=self.user, name='My Event', date='2026-08-01')
        Invitation.objects.create(event=event, name='Guest', seat_number='C3', tag='VIP')
        res = self.client.get(f'/api/superadmin/users/{self.user.id}/events/', **HEADERS)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['invitation_count'], 1)
        self.assertIn('has_template', data[0])
```

- [ ] **Step 2: Run the tests**

```bash
cd backend && python manage.py test tests.test_superadmin -v 2
```

Expected: All tests pass. Common failure modes:
- `403` instead of `200` on `test_correct_token_returns_200`: verify `SUPER_ADMIN_SECRET` is being read with `getattr(settings, 'SUPER_ADMIN_SECRET', '')` (not `config()`), since `@override_settings` only patches the `settings` object.
- `KeyError: 'profile'` in user tests: the `post_save` signal creates the profile — if tests run in a transaction that doesn't fire signals, add `UserProfile.objects.get_or_create(user=self.user)` in setUp (already done in `make_user`).

- [ ] **Step 3: Commit**

```bash
cd backend
git add tests/test_superadmin.py
git commit -m "test: superadmin auth, stats, growth, user CRUD, cascade delete"
```

---

## Task 5: Admin app — scaffold

**What:** Create all the config files for the new `admin/` Next.js app. No code logic yet — just the project scaffolding.

**Files:**
- Create: `admin/package.json`
- Create: `admin/next.config.js`
- Create: `admin/tailwind.config.js`
- Create: `admin/tsconfig.json`
- Create: `admin/.env.example`
- Create: `admin/postcss.config.js`

- [ ] **Step 0: Create the directory structure**

The `admin/` directory does not exist yet. Create it with all required subdirectories before writing any files:

```bash
mkdir -p admin/src/app/api/login admin/src/app/dashboard admin/src/app/users admin/src/components admin/src/lib
```

- [ ] **Step 1: Create package.json**

```json
{
  "name": "youareinvited-admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "autoprefixer": "^10.4.17",
    "axios": "^1.6.5",
    "js-cookie": "^3.0.5",
    "next": "14.1.0",
    "postcss": "^8.4.33",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.4",
    "tailwindcss": "^3.4.1",
    "three": "^0.163.0"
  },
  "devDependencies": {
    "@types/js-cookie": "^3.0.6",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/three": "^0.163.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create next.config.js**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```

- [ ] **Step 3: Create tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#e94560',
        light: '#a8dadc',
        blue: { 900: '#0f3460' },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Create postcss.config.js**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Create .env.example**

```
# Shared secret for super-admin login (same value set in Django SUPER_ADMIN_SECRET)
SUPER_ADMIN_SECRET=change-me-to-a-long-random-string

# Django backend URL (no trailing slash)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

- [ ] **Step 7: Install dependencies**

```bash
cd admin && npm install
```

- [ ] **Step 8: Commit**

```bash
cd admin
git add package.json package-lock.json next.config.js tailwind.config.js tsconfig.json postcss.config.js .env.example
git commit -m "feat: scaffold admin/ Next.js app"
```

---

## Task 6: Admin app — layout, globals, middleware

**What:** Root layout, global CSS, and the middleware that protects all routes except the login page.

**Files:**
- Create: `admin/src/app/globals.css`
- Create: `admin/src/app/layout.tsx`
- Create: `admin/src/middleware.ts`

- [ ] **Step 1: Create globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Create root layout**

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YouAreInvited Admin',
  description: 'Platform super-admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-primary text-white antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create middleware**

```typescript
import { NextRequest, NextResponse } from 'next/server';

// Only the login page is public. The /api/login route is also exempt.
const PUBLIC_PATHS = new Set(['/']);
const PUBLIC_PREFIXES = ['/api/login', '/_next/', '/favicon.ico'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const hasToken = !!req.cookies.get('admin_token')?.value;
  if (!hasToken) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 4: Verify build**

Create a minimal placeholder `admin/src/app/page.tsx` to satisfy the build:

```typescript
export default function Page() {
  return <div>placeholder</div>;
}
```

```bash
cd admin && npm run build
```

- [ ] **Step 5: Commit**

```bash
cd admin
git add src/app/globals.css src/app/layout.tsx src/middleware.ts src/app/page.tsx
git commit -m "feat: admin app layout, global styles, and auth middleware"
```

---

## Task 7: Admin app — lib/auth.ts and lib/api.ts

**What:** Cookie helpers and the Axios API client. The Axios interceptor reads the `admin_token` cookie (non-httpOnly, JS-readable) and attaches it as `X-Super-Admin-Token` on every request to the Django backend.

> **Note on `js-cookie` and SSR:** `js-cookie` is browser-only. Importing it at module level is safe here because `lib/auth.ts` and `lib/api.ts` are only imported by client components (`'use client'`). Never import `lib/api.ts` from a Server Component or middleware — those run server-side where `document.cookie` is unavailable. The Axios interceptor only executes in the browser at request time, not during Next.js SSR of the initial HTML.

**Files:**
- Create: `admin/src/lib/auth.ts`
- Create: `admin/src/lib/api.ts`

- [ ] **Step 1: Create lib/auth.ts**

```typescript
import Cookies from 'js-cookie';

const COOKIE_NAME = 'admin_token';

/**
 * Read the admin session token.
 * Cookie is non-httpOnly so JS can read it directly.
 * See spec: accepted tradeoff for v1 internal tool.
 */
export function getAdminToken(): string | undefined {
  return Cookies.get(COOKIE_NAME);
}

export function clearAdminToken(): void {
  Cookies.remove(COOKIE_NAME);
}

export function isAuthenticated(): boolean {
  return !!getAdminToken();
}
```

- [ ] **Step 2: Create lib/api.ts**

```typescript
import axios from 'axios';
import { getAdminToken } from './auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
});

// Attach the admin token to every request
api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers['X-Super-Admin-Token'] = token;
  }
  return config;
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlatformStats {
  total_users: number;
  total_events: number;
  total_invitations: number;
  checkins_today: number;
  checkin_rate: number;
}

export interface GrowthPoint {
  date: string;
  new_users: number;
  new_events: number;
}

export interface AdminUser {
  id: number;
  email: string;
  plan: 'free' | 'pro';
  watermark_override: boolean;
  event_count: number;
  invitation_count: number;
  created_at: string;
}

export interface UserEvent {
  id: string;
  name: string;
  date: string;
  invitation_count: number;
  has_template: boolean;
}

// ── API helpers ───────────────────────────────────────────────────────────────

export const statsApi = {
  getStats: () => api.get<PlatformStats>('/api/superadmin/stats/').then((r) => r.data),
  getGrowth: () => api.get<GrowthPoint[]>('/api/superadmin/growth/').then((r) => r.data),
};

export const usersApi = {
  getAll: () => api.get<AdminUser[]>('/api/superadmin/users/').then((r) => r.data),
  update: (id: number, data: Partial<Pick<AdminUser, 'plan' | 'watermark_override'>>) =>
    api.patch<AdminUser>(`/api/superadmin/users/${id}/`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/api/superadmin/users/${id}/`),
  getEvents: (id: number) =>
    api.get<UserEvent[]>(`/api/superadmin/users/${id}/events/`).then((r) => r.data),
};

export default api;
```

- [ ] **Step 3: Commit**

```bash
cd admin
git add src/lib/auth.ts src/lib/api.ts
git commit -m "feat: admin lib/auth.ts (cookie helpers) and lib/api.ts (Axios + typed helpers)"
```

---

## Task 8: Admin app — shared components

**What:** Four reusable UI components: `ThreeHero` (Three.js scene — same as web app), `Sidebar` (fixed left nav), `KpiCard` (stat with count-up animation), `ConfirmModal` (delete confirmation dialog).

**Files:**
- Create: `admin/src/components/ThreeHero.tsx`
- Create: `admin/src/components/Sidebar.tsx`
- Create: `admin/src/components/KpiCard.tsx`
- Create: `admin/src/components/ConfirmModal.tsx`

> **Reference skill:** `@accent-animations` — KpiCard uses a count-up entrance animation.

- [ ] **Step 1: Create ThreeHero.tsx**

Same Three.js scene as the `web/` app. Copy the component and change the import path prefix — the logic is identical.

```typescript
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeHero() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a2e');

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 8);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      return;
    }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const cardGeo = new THREE.PlaneGeometry(1.4, 2.0);
    const cards: THREE.Mesh[] = [];
    const vels: { rx: number; ry: number; vx: number; vy: number }[] = [];

    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: '#16213e',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(cardGeo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      scene.add(mesh);
      cards.push(mesh);
      vels.push({
        rx: (Math.random() - 0.5) * 0.004,
        ry: (Math.random() - 0.5) * 0.004,
        vx: (Math.random() - 0.5) * 0.006,
        vy: (Math.random() - 0.5) * 0.004,
      });
    }

    const particleCount = 200;
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 20;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: '#e94560', size: 0.06, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Points(pGeo, pMat));

    let frameId: number;
    let t = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      t += 0.005;
      cards.forEach((card, i) => {
        card.rotation.x += vels[i].rx;
        card.rotation.y += vels[i].ry;
        card.position.x += vels[i].vx;
        card.position.y += vels[i].vy;
        if (Math.abs(card.position.x) > 9) vels[i].vx *= -1;
        if (Math.abs(card.position.y) > 7) vels[i].vy *= -1;
      });
      camera.position.x = Math.sin(t * 0.12) * 0.6;
      camera.position.y = Math.cos(t * 0.09) * 0.4;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w2 = mount.clientWidth;
      const h2 = mount.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      cardGeo.dispose();
      pGeo.dispose();
      pMat.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}
```

- [ ] **Step 2: Create Sidebar.tsx**

```typescript
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminToken } from '@/lib/auth';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/users', label: 'Users' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAdminToken();
    router.push('/');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-secondary flex flex-col p-6 z-20">
      <div className="mb-8">
        <p className="text-accent font-bold tracking-widest text-xs uppercase">YouAreInvited</p>
        <p className="text-light text-xs mt-1">Platform Admin</p>
      </div>
      <nav className="flex-1 space-y-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
              pathname.startsWith(l.href)
                ? 'bg-accent text-white font-semibold'
                : 'text-light hover:bg-primary'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className="text-light text-sm hover:text-accent transition-colors text-left"
      >
        Sign Out
      </button>
    </aside>
  );
}
```

- [ ] **Step 3: Create KpiCard.tsx**

> Uses a requestAnimationFrame count-up for numeric values — the accent-animation pattern for KPI dashboards.

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';

interface KpiCardProps {
  label: string;
  value: number | string;
}

export default function KpiCard({ label, value }: KpiCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const isNumber = typeof value === 'number';
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!isNumber) return;
    const target = value as number;
    let current = 0;
    const duration = 800;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.round(eased * target);
      setDisplayed(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, isNumber]);

  return (
    <div className="bg-secondary rounded-xl p-6">
      <p className="text-light text-sm mb-2">{label}</p>
      <p className="text-white text-3xl font-bold">
        {isNumber ? displayed.toLocaleString() : value}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create ConfirmModal.tsx**

```typescript
'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-secondary rounded-xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-white text-lg font-bold mb-2">{title}</h3>
        <p className="text-light text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-accent text-white font-bold py-2 rounded-lg hover:bg-opacity-90 transition-all"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border text-light py-2 rounded-lg hover:border-light transition-all"
            style={{ borderColor: '#0f3460' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
cd admin && npm run build
```

- [ ] **Step 6: Commit**

```bash
cd admin
git add src/components/
git commit -m "feat: admin shared components — ThreeHero, Sidebar, KpiCard, ConfirmModal"
```

---

## Task 9: Admin app — login page + API route

**What:** The login page (`/`) shows a centered card over the Three.js hero. On submit, it POSTs to `/api/login` (Next.js server-side route) which compares the password against `SUPER_ADMIN_SECRET` and sets the `admin_token` cookie.

**Files:**
- Rewrite: `admin/src/app/page.tsx` (replace the placeholder from Task 6)
- Create: `admin/src/app/api/login/route.ts`

- [ ] **Step 1: Create the login API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };

  const secret = process.env.SUPER_ADMIN_SECRET;

  if (!secret || !password || password !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // Non-httpOnly intentionally: Axios reads admin_token client-side to set
  // X-Super-Admin-Token header. Accepted risk for v1 internal tool — see spec.
  res.cookies.set('admin_token', secret, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400, // 24 hours
    path: '/',
  });
  return res;
}
```

- [ ] **Step 2: Rewrite the login page**

Replace `admin/src/app/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const ThreeHero = dynamic(() => import('@/components/ThreeHero'), { ssr: false });

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError('Invalid password.');
      }
    } catch {
      setError('Connection error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Three.js background */}
      <div className="absolute inset-0 z-0">
        <ThreeHero />
      </div>

      {/* Login card */}
      <div className="relative z-10 bg-secondary rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <p className="text-accent font-bold tracking-widest text-xs uppercase mb-1">
          YouAreInvited
        </p>
        <h1 className="text-2xl font-bold text-white mb-6">Platform Admin</h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-light text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-primary border text-white rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition-colors"
              style={{ borderColor: '#0f3460' }}
              required
              autoFocus
            />
          </div>

          {error && <p className="text-accent text-sm mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd admin && npm run build
```

- [ ] **Step 4: Smoke test login**

```bash
# Terminal 1 — start Django backend
cd backend && python manage.py runserver

# Terminal 2 — start admin app (copy .env.example to .env.local first)
cp admin/.env.example admin/.env.local
# Edit admin/.env.local: set SUPER_ADMIN_SECRET and NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
cd admin && npm run dev
```

1. Visit `http://localhost:3001` — see Three.js hero + login card
2. Enter wrong password → "Invalid password." error
3. Enter the correct `SUPER_ADMIN_SECRET` → redirects to `/dashboard`
4. Visit `http://localhost:3001` while logged in → middleware redirects to `/dashboard`

- [ ] **Step 5: Commit**

```bash
cd admin
git add src/app/page.tsx src/app/api/login/route.ts
git commit -m "feat: admin login page and /api/login route with admin_token cookie"
```

---

## Task 10: Admin app — dashboard page

**What:** Platform KPI overview — 5 stat cards (Total Users, Total Events, Total Invitations, Check-Ins Today, Check-In Rate) with count-up animation, and two Recharts charts (area: new signups, bar: events created) for the last 30 days.

**Files:**
- Create: `admin/src/app/dashboard/page.tsx`

> **Reference skills:** `@kpi-dashboard-design` (metric selection and layout), `@accent-animations` (count-up in KpiCard — already implemented).

- [ ] **Step 1: Create dashboard page**

```typescript
'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import KpiCard from '@/components/KpiCard';
import { statsApi, PlatformStats, GrowthPoint } from '@/lib/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const tooltipStyle = {
  contentStyle: { background: '#16213e', border: 'none', color: '#fff', borderRadius: '8px' },
  labelStyle: { color: '#a8dadc' },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([statsApi.getStats(), statsApi.getGrowth()])
      .then(([s, g]) => {
        setStats(s);
        setGrowth(g);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex bg-primary">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Platform Overview</h1>

        {loading ? (
          <p className="text-light">Loading…</p>
        ) : (
          <>
            {/* KPI row */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <KpiCard label="Total Users" value={stats.total_users} />
                <KpiCard label="Total Events" value={stats.total_events} />
                <KpiCard label="Total Invitations" value={stats.total_invitations} />
                <KpiCard label="Check-Ins Today" value={stats.checkins_today} />
              </div>
            )}

            {/* Secondary row */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard label="Check-In Rate" value={`${stats.checkin_rate.toFixed(1)}%`} />
              </div>
            )}

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-secondary rounded-xl p-6">
                <h2 className="text-white font-semibold mb-4 text-sm">
                  New Signups — last 30 days
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f3460" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#a8dadc', fontSize: 10 }}
                      tickFormatter={(d: string) => d.slice(5)}
                    />
                    <YAxis tick={{ fill: '#a8dadc', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="new_users"
                      stroke="#e94560"
                      fill="#e94560"
                      fillOpacity={0.3}
                      name="New Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-secondary rounded-xl p-6">
                <h2 className="text-white font-semibold mb-4 text-sm">
                  Events Created — last 30 days
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f3460" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#a8dadc', fontSize: 10 }}
                      tickFormatter={(d: string) => d.slice(5)}
                    />
                    <YAxis tick={{ fill: '#a8dadc', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="new_events" fill="#a8dadc" name="New Events" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd admin && npm run build
```

If you see a TypeScript error from Recharts about `contentStyle` on `Tooltip` — wrap `tooltipStyle` content in the `content` prop or pass props individually. The pattern above matches Recharts v2.

- [ ] **Step 3: Commit**

```bash
cd admin
git add src/app/dashboard/page.tsx
git commit -m "feat: admin dashboard — KPI cards and 30-day growth charts"
```

---

## Task 11: Admin app — users table page

**What:** Searchable table of all users. Inline plan badge (click to toggle free ↔ pro), watermark toggle (click to toggle, sends PATCH immediately), View link, Delete button with confirmation modal.

**Files:**
- Create: `admin/src/app/users/page.tsx`

- [ ] **Step 1: Create users page**

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import ConfirmModal from '@/components/ConfirmModal';
import { usersApi, AdminUser } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.getAll().then(setUsers).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handlePlanToggle = async (user: AdminUser) => {
    const newPlan = user.plan === 'free' ? 'pro' : 'free';
    await usersApi.update(user.id, { plan: newPlan });
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, plan: newPlan } : u)));
  };

  const handleWatermarkToggle = async (user: AdminUser) => {
    const newVal = !user.watermark_override;
    await usersApi.update(user.id, { watermark_override: newVal });
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, watermark_override: newVal } : u)),
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await usersApi.delete(deleteTarget.id);
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen flex bg-primary">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Users</h1>

        <input
          type="text"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 bg-secondary border text-white rounded-lg px-4 py-2 w-full max-w-sm focus:outline-none focus:border-accent transition-colors"
          style={{ borderColor: '#0f3460' }}
        />

        {loading ? (
          <p className="text-light">Loading…</p>
        ) : (
          <div className="bg-secondary rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#0f3460' }}>
                  {['Email', 'Plan', 'Watermark off', 'Events', 'Invitations', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-light font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b hover:bg-primary transition-colors"
                    style={{ borderColor: '#0f3460' }}
                  >
                    <td className="px-4 py-3 text-white">{user.email}</td>

                    {/* Plan badge — click to toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handlePlanToggle(user)}
                        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                          user.plan === 'pro'
                            ? 'bg-accent text-white'
                            : 'text-light'
                        }`}
                        style={user.plan === 'free' ? { background: '#0f3460' } : {}}
                      >
                        {user.plan.toUpperCase()}
                      </button>
                    </td>

                    {/* Watermark toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleWatermarkToggle(user)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          user.watermark_override ? 'bg-accent' : ''
                        }`}
                        style={!user.watermark_override ? { background: '#0f3460' } : {}}
                        aria-label="Toggle watermark override"
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            user.watermark_override ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>

                    <td className="px-4 py-3 text-light">{user.event_count}</td>
                    <td className="px-4 py-3 text-light">{user.invitation_count}</td>
                    <td className="px-4 py-3 text-light">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/users/${user.id}`}
                          className="text-accent hover:underline text-xs"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="text-red-400 hover:underline text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-light">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Account"
        message={`Delete ${deleteTarget?.email} and all their data? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd admin && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd admin
git add src/app/users/page.tsx
git commit -m "feat: admin users table — search, plan toggle, watermark toggle, delete"
```

---

## Task 12: Admin app — user detail page

**What:** Shows a single user's details, an edit form (plan selector + watermark toggle + Save), their events table, and a danger zone where the operator types the user's email to confirm deletion.

**Files:**
- Create: `admin/src/app/users/[id]/page.tsx`

- [ ] **Step 1: Create user detail page**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ConfirmModal from '@/components/ConfirmModal';
import { usersApi, AdminUser, UserEvent } from '@/lib/api';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editPlan, setEditPlan] = useState<'free' | 'pro'>('free');
  const [editWatermark, setEditWatermark] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const userId = parseInt(id, 10);
    Promise.all([
      usersApi.getAll().then((users) => users.find((u) => u.id === userId) ?? null),
      usersApi.getEvents(userId),
    ])
      .then(([u, ev]) => {
        if (u) {
          setUser(u);
          setEditPlan(u.plan);
          setEditWatermark(u.watermark_override);
        }
        setEvents(ev);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await usersApi.update(user.id, { plan: editPlan, watermark_override: editWatermark });
    setUser((prev) => (prev ? { ...prev, plan: editPlan, watermark_override: editWatermark } : prev));
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user || confirmEmail !== user.email) return;
    await usersApi.delete(user.id);
    router.push('/users');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-primary">
        <Sidebar />
        <p className="ml-64 p-8 text-light">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex bg-primary">
        <Sidebar />
        <p className="ml-64 p-8 text-accent">User not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-primary">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-4xl">

        {/* Header */}
        <div className="mb-6">
          <p className="text-white text-xl font-bold">{user.email}</p>
          <p className="text-light text-sm mt-1">
            Joined {new Date(user.created_at).toLocaleDateString()}
          </p>
          <span
            className={`inline-block mt-2 px-3 py-1 rounded text-xs font-bold ${
              user.plan === 'pro' ? 'bg-accent text-white' : 'text-light'
            }`}
            style={user.plan === 'free' ? { background: '#0f3460' } : {}}
          >
            {user.plan.toUpperCase()}
          </span>
        </div>

        {/* Edit section */}
        <div className="bg-secondary rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Edit Account</h2>

          <div className="flex gap-4 items-center mb-4">
            <label className="text-light text-sm w-36">Plan</label>
            <select
              value={editPlan}
              onChange={(e) => setEditPlan(e.target.value as 'free' | 'pro')}
              className="bg-primary border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              style={{ borderColor: '#0f3460' }}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <div className="flex gap-4 items-center mb-6">
            <label className="text-light text-sm w-36">Watermark off</label>
            <button
              onClick={() => setEditWatermark(!editWatermark)}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                editWatermark ? 'bg-accent' : ''
              }`}
              style={!editWatermark ? { background: '#0f3460' } : {}}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  editWatermark ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent text-white font-bold px-6 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Events table */}
        <div className="bg-secondary rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Events ({events.length})</h2>
          {events.length === 0 ? (
            <p className="text-light text-sm">No events yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#0f3460' }}>
                  {['Name', 'Date', 'Invitations', 'Template'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-light font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-b" style={{ borderColor: '#0f3460' }}>
                    <td className="px-3 py-2 text-white">{ev.name}</td>
                    <td className="px-3 py-2 text-light">{ev.date}</td>
                    <td className="px-3 py-2 text-light">{ev.invitation_count}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${ev.has_template ? 'text-green-400' : 'text-light'}`}>
                        {ev.has_template ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Danger zone */}
        <div
          className="bg-secondary rounded-xl p-6"
          style={{ borderWidth: 1, borderStyle: 'solid', borderColor: '#7f1d1d' }}
        >
          <h2 className="text-accent font-semibold mb-2">Danger Zone</h2>
          <p className="text-light text-sm mb-4">
            Type <span className="text-white font-mono">{user.email}</span> to enable deletion.
            This permanently removes the account and all associated events and invitations.
          </p>
          <input
            type="text"
            placeholder={user.email}
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            className="mb-3 w-full bg-primary border text-white rounded-lg px-4 py-2 focus:outline-none transition-colors"
            style={{ borderColor: '#7f1d1d' }}
          />
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={confirmEmail !== user.email}
            className="bg-red-700 text-white font-bold px-6 py-2 rounded-lg hover:bg-red-600 disabled:opacity-40 transition-all"
          >
            Delete Account
          </button>
        </div>
      </main>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Final Confirmation"
        message={`Permanently delete ${user.email} and all their events and invitations?`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd admin && npm run build
```

- [ ] **Step 3: Full end-to-end smoke test**

With Django running locally and `admin/.env.local` configured:

1. `http://localhost:3001` → login page with Three.js background
2. Login → redirected to `/dashboard` → KPI cards animate up, charts render
3. Click Users → table shows all users, search filters by email
4. Toggle a plan badge → changes immediately (verify in Django admin or DB)
5. Toggle watermark → changes immediately
6. Click View on a user → detail page shows their events
7. Danger zone: type wrong email → Delete button disabled; type correct email → enabled → click → confirm modal → user deleted → redirected to `/users`
8. Log out (sidebar) → cookie cleared → redirected to login

- [ ] **Step 4: Commit**

```bash
cd admin
git add src/app/users/
git commit -m "feat: admin user detail page — edit form, events table, danger zone delete"
```
