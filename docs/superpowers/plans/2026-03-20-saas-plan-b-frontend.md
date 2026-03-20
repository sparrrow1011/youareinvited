# SaaS Conversion — Plan B: Frontend Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-password frontend auth with JWT-based email/password accounts, add dashboard and per-event pages, and retire the old `/admin` route.

**Architecture:** Axios instance reads a JWT cookie and attaches it as an Authorization header. Next.js middleware is updated to validate JWT presence (not content — that's the backend's job). New pages: `/signup`, `/dashboard`, `/events/[id]`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Axios, js-cookie

**Prerequisite:** Plan A must be complete. Backend JWT endpoints must be running.

**Spec:** `docs/superpowers/specs/2026-03-20-saas-conversion-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `web/package.json` | Modify | Add js-cookie |
| `web/src/lib/api.ts` | Modify | Add JWT header, auth methods, event API methods |
| `web/src/lib/auth.ts` | Create | Cookie helpers: getToken, setToken, clearToken |
| `web/src/middleware.ts` | Modify | Check for JWT cookie instead of site_auth cookie; keep security portal unchanged |
| `web/src/app/login/page.tsx` | Modify | Replace password form with email + password form |
| `web/src/app/signup/page.tsx` | Create | New account registration form |
| `web/src/app/api/auth/login/route.ts` | Delete | Old password-only route no longer needed |
| `web/src/app/api/auth/logout/route.ts` | Modify | Clear JWT cookie on logout |
| `web/src/app/dashboard/page.tsx` | Create | Events list for logged-in organizer |
| `web/src/app/events/new/page.tsx` | Create | Create event form |
| `web/src/app/events/[id]/page.tsx` | Create | Event management — invitations table + stats |
| `web/.env.example` | Modify | Document JWT cookie name |

---

### Task 1: Add js-cookie and update api.ts with JWT + auth methods

**Files:**
- Modify: `web/package.json`
- Modify: `web/src/lib/api.ts`
- Create: `web/src/lib/auth.ts`

- [ ] **Step 1: Install js-cookie**

```bash
cd web && npm install js-cookie@3.0.5
npm install --save-dev @types/js-cookie@3.0.6
```

- [ ] **Step 2: Create `web/src/lib/auth.ts`**

```typescript
import Cookies from 'js-cookie';

const COOKIE_NAME = 'access_token';
const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  expires: 1, // 1 day
};

export const getToken = (): string | undefined => Cookies.get(COOKIE_NAME);

export const setToken = (token: string): void => {
  Cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
};

export const clearToken = (): void => {
  Cookies.remove(COOKIE_NAME);
};

export const isAuthenticated = (): boolean => !!getToken();
```

- [ ] **Step 3: Update `web/src/lib/api.ts` — add JWT interceptor and auth/event methods**

Add to the existing `api.ts` (after the axios instance creation). **Do not remove or rename the existing `invitationService` export** — it is used by the event management page (Task 7) and the guest invitation page.

```typescript
import { getToken, setToken, clearToken } from './auth';

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth service
export interface AuthTokens {
  access: string;
  refresh: string;
}

export const authService = {
  register: async (email: string, password: string): Promise<void> => {
    const response = await api.post<AuthTokens>('/auth/register/', { email, password });
    setToken(response.data.access);
  },

  login: async (email: string, password: string): Promise<void> => {
    const response = await api.post<AuthTokens>('/auth/login/', { email, password });
    setToken(response.data.access);
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout/');
    } catch {
      // ignore errors on logout
    } finally {
      clearToken();
    }
  },
};

// Event types
export interface Event {
  id: string;
  owner: number;
  name: string;
  date: string;
  description: string;
  background_image: string | null;
  qr_zone: Record<string, number> | null;
  name_zone: Record<string, number | string> | null;
  tag_zone: Record<string, number | string> | null;
  created_at: string;
}

export interface EventCreate {
  name: string;
  date: string;
  description?: string;
}

// Event service
export const eventService = {
  getAll: async (): Promise<Event[]> => {
    const response = await api.get<Event[]>('/events/');
    return response.data;
  },

  getById: async (id: string): Promise<Event> => {
    const response = await api.get<Event>(`/events/${id}/`);
    return response.data;
  },

  create: async (data: EventCreate): Promise<Event> => {
    const response = await api.post<Event>('/events/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<EventCreate>): Promise<Event> => {
    const response = await api.patch<Event>(`/events/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}/`);
  },
};
```

- [ ] **Step 4: Start dev server and verify no TypeScript errors**

```bash
cd web && npm run dev
```
Expected: server starts, no TS errors in terminal.

- [ ] **Step 5: Commit**

```bash
git add web/package.json web/package-lock.json web/src/lib/auth.ts web/src/lib/api.ts
git commit -m "feat: add JWT interceptor to Axios and auth/event service methods"
```

---

### Task 2: Update middleware to check JWT cookie

**Files:**
- Modify: `web/src/middleware.ts`

- [ ] **Step 1: Update `web/src/middleware.ts`**

Replace the entire file:
```typescript
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set([
  '/login', '/logout', '/signup',
  '/security/login', '/security/logout',
]);

const PUBLIC_PREFIXES = ['/invitation/'];

const isPublicAsset = (pathname: string): boolean => {
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname === '/favicon.ico') return true;
  return /\.[a-zA-Z0-9]+$/.test(pathname);
};

const addSecurityHeaders = (res: NextResponse): NextResponse => {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
};

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || isPublicAsset(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return addSecurityHeaders(NextResponse.next());
  }

  const hasSecurityAuth = req.cookies.get('security_auth')?.value === '1';
  const isSecurityPath = pathname.startsWith('/security');

  if (isSecurityPath && !hasSecurityAuth) {
    const securityLoginUrl = new URL('/security/login', req.url);
    securityLoginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(securityLoginUrl);
  }

  if (!isSecurityPath) {
    // JWT auth — check for access_token cookie
    const hasJwt = !!req.cookies.get('access_token')?.value;
    if (!hasJwt) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('Vary', 'Cookie');
  addSecurityHeaders(res);

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Verify middleware compiles**

```bash
cd web && npm run build 2>&1 | head -30
```
Expected: no TypeScript errors in middleware.ts

- [ ] **Step 3: Commit**

```bash
git add web/src/middleware.ts
git commit -m "feat: update middleware to check JWT access_token cookie instead of site_auth"
```

---

### Task 3: Update login page to email + password

**Files:**
- Modify: `web/src/app/login/page.tsx`

- [ ] **Step 1: Read the existing login page**

```bash
cat web/src/app/login/page.tsx
```

- [ ] **Step 2: Replace login page with email + password form**

Replace the entire file content with:
```tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
      <div className="bg-[#16213e] p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Sign In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-[#e94560] text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#e94560] text-white rounded font-semibold hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-[#a8dadc] mt-4">
          No account?{' '}
          <a href="/signup" className="text-[#e94560] hover:underline">Create one</a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Delete the old organizer password login API route**

Only the organizer login API route is replaced. The security portal's API route (`web/src/app/api/auth/security/login/route.ts`) checks `SECURITY_PASSWORD` and sets the `security_auth` cookie — it is still used by the security portal and **must be kept**.

```bash
rm web/src/app/api/auth/login/route.ts
```

> Do NOT delete `web/src/app/api/auth/security/login/route.ts` (security portal auth) or `web/src/app/security/login/page.tsx` (security portal page). Both stay.

- [ ] **Step 4: Manual test**

```bash
cd web && npm run dev
```
- Open `http://localhost:3000/login`
- Verify email + password form renders
- Try logging in with the admin credentials set in Plan A's data migration

- [ ] **Step 5: Commit**

```bash
git add web/src/app/login/page.tsx
git rm web/src/app/api/auth/login/route.ts
git commit -m "feat: replace password-only login with email/password JWT login; remove old organizer auth route"
```

> **Known limitation — JWT auto-refresh:** The Axios instance does not attempt to refresh on 401. After 1 hour, API calls will fail and users are redirected to login. Add a response interceptor in a future iteration.

---

### Task 4: Add signup page

**Files:**
- Create: `web/src/app/signup/page.tsx`

- [ ] **Step 1: Create `web/src/app/signup/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/api';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
      <div className="bg-[#16213e] p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-[#e94560] text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#e94560] text-white rounded font-semibold hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-[#a8dadc] mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-[#e94560] hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

- Open `http://localhost:3000/signup`
- Register a new account
- Verify redirect to `/dashboard` (will 404 until Task 5)
- Try duplicate email — verify error message

- [ ] **Step 3: Commit**

```bash
git add web/src/app/signup/page.tsx
git commit -m "feat: add signup page with email/password registration"
```

---

### Task 5: Dashboard page — events list

**Files:**
- Create: `web/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create `web/src/app/dashboard/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { eventService, authService, Event } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    eventService.getAll()
      .then(setEvents)
      .catch(() => setError('Failed to load events.'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event and all its invitations?')) return;
    await eventService.delete(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Events</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/events/new')}
              className="px-4 py-2 bg-[#e94560] rounded font-semibold hover:bg-opacity-90"
            >
              + New Event
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#0f3460] rounded hover:bg-opacity-80"
            >
              Log out
            </button>
          </div>
        </div>

        {loading && <p className="text-[#a8dadc]">Loading…</p>}
        {error && <p className="text-[#e94560]">{error}</p>}

        {!loading && events.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#a8dadc] mb-4">No events yet.</p>
            <button
              onClick={() => router.push('/events/new')}
              className="px-6 py-3 bg-[#e94560] rounded font-semibold"
            >
              Create Your First Event
            </button>
          </div>
        )}

        <div className="grid gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-[#16213e] rounded-lg p-6 flex justify-between items-center"
            >
              <div>
                <h2 className="text-xl font-semibold">{event.name}</h2>
                <p className="text-[#a8dadc] text-sm mt-1">{event.date}</p>
                {event.description && (
                  <p className="text-gray-400 text-sm mt-1">{event.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="px-4 py-2 bg-[#0f3460] rounded hover:bg-opacity-80 text-sm"
                >
                  Manage
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="px-4 py-2 bg-[#e94560] bg-opacity-20 rounded hover:bg-opacity-40 text-sm text-[#e94560]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

- Log in → confirm redirect to `/dashboard`
- Confirm event list renders (will show "Default Event" from data migration)
- Click "Manage" → confirm routing to `/events/[id]` (404 until Task 7)

- [ ] **Step 3: Commit**

```bash
git add web/src/app/dashboard/page.tsx
git commit -m "feat: add dashboard page with events list and logout"
```

---

### Task 6: Create event page

**Files:**
- Create: `web/src/app/events/new/page.tsx`

- [ ] **Step 1: Create `web/src/app/events/new/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { eventService } from '@/lib/api';

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const event = await eventService.create({ name, date, description });
      router.push(`/events/${event.id}`);
    } catch {
      setError('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-[#a8dadc] mb-6 hover:underline text-sm"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-[#16213e] p-6 rounded-lg">
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="Sarah & James Wedding"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Event Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#a8dadc] mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none focus:border-[#e94560]"
              placeholder="A brief description of the event"
            />
          </div>
          {error && <p className="text-[#e94560] text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#e94560] text-white rounded font-semibold hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

- Click "+ New Event" on dashboard
- Fill form and submit
- Confirm redirect to `/events/[new-event-id]` (404 until Task 7)

- [ ] **Step 3: Commit**

```bash
git add web/src/app/events/new/page.tsx
git commit -m "feat: add create event page"
```

---

### Task 7: Event management page — invitations table + stats

**Files:**
- Create: `web/src/app/events/[id]/page.tsx`

- [ ] **Step 1: Create `web/src/app/events/[id]/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { eventService, invitationService, Event, Invitation, InvitationStats } from '@/lib/api';

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', seat_number: '', tag: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [ev, invs] = await Promise.all([
        eventService.getById(id),
        invitationService.getAll(),
      ]);
      setEvent(ev);
      // Filter invitations to this event only
      const eventInvs = invs.filter((inv: any) => inv.event === id);
      setInvitations(eventInvs);
      // Compute per-event stats from the filtered list
      const total = eventInvs.length;
      const checkedIn = eventInvs.filter((inv: any) => inv.checked_in).length;
      setStats({
        total_invitations: total,
        checked_in: checkedIn,
        pending: total - checkedIn,
        check_in_rate: total > 0 ? (checkedIn / total) * 100 : 0,
      });
    } catch {
      setError('Failed to load event.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await invitationService.update(editingId, formData);
      } else {
        await invitationService.create({ ...formData, event: id } as any);
      }
      setShowForm(false);
      setFormData({ name: '', seat_number: '', tag: '' });
      setEditingId(null);
      await loadData();
    } catch {
      setError('Failed to save invitation.');
    }
  };

  const handleDelete = async (invId: string) => {
    if (!confirm('Delete this invitation?')) return;
    await invitationService.delete(invId);
    await loadData();
  };

  const handleUndoCheckIn = async (invId: string) => {
    await invitationService.undoCheckIn(invId);
    await loadData();
  };

  if (loading) return <div className="min-h-screen bg-[#1a1a2e] text-white p-8">Loading…</div>;
  if (error) return <div className="min-h-screen bg-[#1a1a2e] text-[#e94560] p-8">{error}</div>;

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-[#a8dadc] mb-4 hover:underline text-sm">
          ← Dashboard
        </button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">{event?.name}</h1>
            <p className="text-[#a8dadc] text-sm mt-1">{event?.date}</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', seat_number: '', tag: '' }); }}
            className="px-4 py-2 bg-[#e94560] rounded font-semibold hover:bg-opacity-90"
          >
            + Add Guest
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total', value: stats.total_invitations },
              { label: 'Checked In', value: stats.checked_in },
              { label: 'Pending', value: stats.pending },
              { label: 'Rate', value: `${stats.check_in_rate.toFixed(0)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#16213e] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#e94560]">{value}</div>
                <div className="text-[#a8dadc] text-sm">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-[#16213e] p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Guest' : 'Add Guest'}</h2>
              <form onSubmit={handleSave} className="space-y-3">
                {[
                  { label: 'Name', key: 'name', placeholder: 'John Doe' },
                  { label: 'Seat Number', key: 'seat_number', placeholder: 'A1' },
                  { label: 'Tag', key: 'tag', placeholder: 'VIP, Family, Friend…' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm text-[#a8dadc] mb-1">{label}</label>
                    <input
                      value={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      required
                      placeholder={placeholder}
                      className="w-full px-3 py-2 rounded bg-[#0f3460] text-white border border-[#0f3460] focus:outline-none"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 py-2 bg-[#e94560] rounded font-semibold">
                    Save
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-[#0f3460] rounded">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invitations table */}
        <div className="bg-[#16213e] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#0f3460]">
                {['Name', 'Seat', 'Tag', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left p-4 text-[#a8dadc]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-[#0f3460] hover:bg-[#0f3460] transition-colors">
                  <td className="p-4">{inv.name}</td>
                  <td className="p-4">{inv.seat_number}</td>
                  <td className="p-4">{inv.tag}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      inv.checked_in ? 'bg-green-800 text-green-200' : 'bg-yellow-800 text-yellow-200'
                    }`}>
                      {inv.checked_in ? 'Checked In' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => router.push(`/invitation/${inv.id}`)}
                      className="px-2 py-1 bg-[#0f3460] rounded text-xs hover:bg-opacity-80"
                    >
                      View
                    </button>
                    <button
                      onClick={() => { setEditingId(inv.id); setFormData({ name: inv.name, seat_number: inv.seat_number, tag: inv.tag }); setShowForm(true); }}
                      className="px-2 py-1 bg-[#0f3460] rounded text-xs hover:bg-opacity-80"
                    >
                      Edit
                    </button>
                    {inv.checked_in && (
                      <button
                        onClick={() => handleUndoCheckIn(inv.id)}
                        className="px-2 py-1 bg-yellow-900 rounded text-xs hover:bg-opacity-80"
                      >
                        Undo
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="px-2 py-1 bg-red-900 rounded text-xs hover:bg-opacity-80"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#a8dadc]">
                    No guests yet. Click "+ Add Guest" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update InvitationCreateSerializer in backend to accept event field**

In `backend/invitations/serializers.py`, ensure `InvitationCreateSerializer` includes `event`:
```python
class InvitationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ['name', 'seat_number', 'tag', 'event']
```

- [ ] **Step 3: Manual end-to-end test**

- Login → dashboard → create event → manage event
- Add a guest → confirm invitation appears in table
- Click "View" → confirm guest invitation page opens

- [ ] **Step 4: Commit**

```bash
git add web/src/app/events/ backend/invitations/serializers.py
git commit -m "feat: add event management page with invitations table and stats"
```

---

### Task 8: Update logout route to clear JWT cookie

**Files:**
- Modify: `web/src/app/api/auth/logout/route.ts` (or create if missing)

- [ ] **Step 1: Check if logout route exists**

```bash
ls web/src/app/api/auth/logout/
```

- [ ] **Step 2: Create/update logout route**

Create `web/src/app/api/auth/logout/route.ts`:
```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('access_token');
  return res;
}
```

Note: The client-side `authService.logout()` calls the backend JWT logout (blacklist) AND `clearToken()` (removes cookie from JS). This server-side route is available for server-side redirects if needed.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/auth/logout/
git commit -m "feat: add server-side logout route to clear JWT cookie"
```
