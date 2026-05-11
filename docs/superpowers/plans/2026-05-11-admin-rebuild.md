# Admin Dashboard Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/admin` Next.js app with shadcn/ui, a clean light theme, and proper UX — login, dashboard stats, and user management.

**Architecture:** shadcn/ui primitives compose every page. Next.js route group `(admin)` wraps all protected pages in a shared sidebar layout. Existing `lib/api.ts`, `lib/auth.ts`, `middleware.ts`, and `api/login/route.ts` are untouched. The Next.js proxy in `next.config.js` forwards `/api/*` to the Django backend.

**Tech Stack:** Next.js 14 (App Router), shadcn/ui (Radix UI + Tailwind), recharts, axios, lucide-react

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| **Create** | `src/app/(admin)/layout.tsx` | Route group wrapper — renders Sidebar + `<main>` |
| **Create** | `src/app/(admin)/dashboard/page.tsx` | KPI cards + growth charts |
| **Create** | `src/app/(admin)/users/page.tsx` | Users table page — renders UserTable |
| **Create** | `src/app/(admin)/users/[id]/page.tsx` | User detail: edit, events list, delete |
| **Create** | `src/components/Sidebar.tsx` | Left nav with active-link highlighting + logout |
| **Create** | `src/components/KpiCard.tsx` | Stat card (label + large number) |
| **Create** | `src/components/UserTable.tsx` | Table, search, edit dialog |
| **Create** | `src/components/ui/` | shadcn/ui auto-generated primitives |
| **Modify** | `src/app/layout.tsx` | Remove dark body class, add `<Toaster />` |
| **Modify** | `src/app/page.tsx` | Rebuilt login page — light card, no Three.js |
| **Modify** | `tailwind.config.js` | shadcn theme tokens (added by init) |
| **Modify** | `src/app/globals.css` | shadcn CSS variables (added by init) |
| **Delete** | `src/app/dashboard/page.tsx` | Replaced by `(admin)/dashboard/page.tsx` |
| **Delete** | `src/app/users/page.tsx` | Replaced by `(admin)/users/page.tsx` |
| **Delete** | `src/app/users/[id]/page.tsx` | Replaced by `(admin)/users/[id]/page.tsx` |
| **Delete** | `src/components/ThreeHero.tsx` | Login has no 3D animation |
| **Delete** | `src/components/ConfirmModal.tsx` | Replaced by shadcn Dialog |
| **Keep** | `src/lib/api.ts` | Unchanged |
| **Keep** | `src/lib/auth.ts` | Unchanged |
| **Keep** | `src/middleware.ts` | Unchanged |
| **Keep** | `src/app/api/login/route.ts` | Unchanged |
| **Keep** | `next.config.js` | Unchanged |

---

## Task 1: Install shadcn/ui and add components

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/app/globals.css`
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/` (auto-generated)

- [ ] **Step 1: Run shadcn init**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/admin
npx shadcn@latest init
```

Answer the prompts:
- Which style? → **Default**
- Which color? → **Slate**
- Do you want to use CSS variables? → **Yes**

This creates `components.json`, `src/lib/utils.ts`, updates `tailwind.config.js` and `src/app/globals.css`.

- [ ] **Step 2: Add all required shadcn components**

```bash
npx shadcn@latest add button card dialog input badge table select switch skeleton sonner
```

This installs `lucide-react`, `clsx`, `tailwind-merge`, `@radix-ui/*` packages and generates files under `src/components/ui/`.

- [ ] **Step 3: Verify**

```bash
ls src/components/ui/
```

Expected output includes: `button.tsx  card.tsx  dialog.tsx  input.tsx  badge.tsx  table.tsx  select.tsx  switch.tsx  skeleton.tsx  sonner.tsx`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: install shadcn/ui and add core components"
```

---

## Task 2: Delete old files

**Files:**
- Delete: `src/app/dashboard/page.tsx`
- Delete: `src/app/users/page.tsx`
- Delete: `src/app/users/[id]/page.tsx`
- Delete: `src/components/ThreeHero.tsx`
- Delete: `src/components/ConfirmModal.tsx`
- Delete: `src/components/KpiCard.tsx`
- Delete: `src/components/Sidebar.tsx`

- [ ] **Step 1: Delete old pages and components**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/admin
rm -rf src/app/dashboard
rm -rf src/app/users
rm -f src/components/ThreeHero.tsx
rm -f src/components/ConfirmModal.tsx
rm -f src/components/KpiCard.tsx
rm -f src/components/Sidebar.tsx
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old admin pages and components"
```

---

## Task 3: Root layout + login page

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite `src/app/layout.tsx`**

Remove the dark body class and add the shadcn Toaster:

```tsx
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'YouAreInvited Admin',
  description: 'Platform super-admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/page.tsx`** (login page)

```tsx
'use client';

// NOTE: We intentionally avoid useSearchParams() here to prevent the Next.js 14
// Suspense boundary requirement. We read query params from window.location instead.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    if (reason === 'session-expired') setError('Your session expired. Please sign in again.');
    else if (reason === 'access-denied') setError('Access denied — staff accounts only.');
  }, []);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid email or password.');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Could not reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1">
          <p className="text-xs font-bold tracking-widest text-[#e94560] uppercase">
            YouAreInvited
          </p>
          <CardTitle className="text-2xl font-bold text-gray-900">Platform Admin</CardTitle>
          <CardDescription>Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@youareinvited.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-[#e94560] hover:bg-[#d63d56] text-white"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Start the dev server: `npm run dev`

Open `http://localhost:3001`. Expected:
- Gray-50 background
- Centered white card
- "YOUAREINVITED" in coral uppercase, "Platform Admin" heading
- Email + Password inputs
- Coral "Sign In" button
- No 3D animation, no dark background

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat: rebuild login page with light theme, remove Three.js"
```

---

## Task 4: Sidebar component

**Files:**
- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create `src/components/Sidebar.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearAdminToken } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAdminToken();
    router.push('/');
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 flex flex-col z-10">
      <div className="px-6 py-5 border-b border-gray-200">
        <p className="text-xs font-bold tracking-widest text-[#e94560] uppercase">YouAreInvited</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">Admin</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#e94560]/10 text-[#e94560] border-l-2 border-[#e94560] pl-[10px]'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-600 hover:text-gray-900"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Sidebar component with light theme and active-link highlight"
```

---

## Task 5: Admin route group layout

**Files:**
- Create: `src/app/(admin)/layout.tsx`

- [ ] **Step 1: Create the directory and layout**

```bash
mkdir -p src/app/\(admin\)
```

Create `src/app/(admin)/layout.tsx`:

```tsx
import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-60 p-8 min-h-screen">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(admin\)/layout.tsx
git commit -m "feat: add admin route group layout with sidebar"
```

---

## Task 6: KpiCard component

**Files:**
- Create: `src/components/KpiCard.tsx`

- [ ] **Step 1: Create `src/components/KpiCard.tsx`**

```tsx
import { Card, CardContent } from '@/components/ui/card';

interface KpiCardProps {
  label: string;
  value: number | string;
}

export default function KpiCard({ label, value }: KpiCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{String(value)}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/KpiCard.tsx
git commit -m "feat: add KpiCard component"
```

---

## Task 7: Dashboard page

**Files:**
- Create: `src/app/(admin)/dashboard/page.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p "src/app/(admin)/dashboard"
```

- [ ] **Step 2: Create `src/app/(admin)/dashboard/page.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { statsApi, PlatformStats, GrowthPoint } from '@/lib/api';
import KpiCard from '@/components/KpiCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([statsApi.getStats(), statsApi.getGrowth()])
      .then(([s, g]) => {
        setStats(s);
        setGrowth(g);
      })
      .catch(() => setError('Failed to load platform stats.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Overview</h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={load}
            className="font-medium underline underline-offset-2 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))
        ) : stats ? (
          <>
            <KpiCard label="Total Users" value={stats.total_users} />
            <KpiCard label="Total Events" value={stats.total_events} />
            <KpiCard label="Total Invitations" value={stats.total_invitations} />
            <KpiCard label="Check-Ins Today" value={stats.checkins_today} />
          </>
        ) : null}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New Signups — last 30 days</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="new_users"
                  stroke="#e94560"
                  fill="#e94560"
                  fillOpacity={0.1}
                  name="New Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Events Created — last 30 days
          </h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="new_events"
                  fill="#e94560"
                  name="New Events"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Navigate to `http://localhost:3001/dashboard` (must be logged in). Expected:
- White background, sidebar visible on left
- 4 skeleton cards → then KPI numbers load
- Two charts (area + bar) → data loads from production backend
- "Retry" button appears if backend is unreachable

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/dashboard/page.tsx"
git commit -m "feat: add dashboard page with KPI cards and growth charts"
```

---

## Task 8: UserTable component

**Files:**
- Create: `src/components/UserTable.tsx`

- [ ] **Step 1: Create `src/components/UserTable.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminUser, usersApi } from '@/lib/api';

interface UserTableProps {
  users: AdminUser[];
  onUserUpdated: (updated: AdminUser) => void;
}

export default function UserTable({ users, onUserUpdated }: UserTableProps) {
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [watermark, setWatermark] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setPlan(user.plan);
    setWatermark(user.watermark_override);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await usersApi.update(editingUser.id, {
        plan,
        watermark_override: watermark,
      });
      onUserUpdated(updated);
      setEditingUser(null);
      toast.success('User updated successfully.');
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Search */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{filtered.length} users</p>
        <input
          type="search"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#e94560]/30 focus:border-[#e94560]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700">Email</TableHead>
              <TableHead className="font-semibold text-gray-700">Plan</TableHead>
              <TableHead className="font-semibold text-gray-700">Watermark</TableHead>
              <TableHead className="font-semibold text-gray-700">Events</TableHead>
              <TableHead className="font-semibold text-gray-700">Invitations</TableHead>
              <TableHead className="font-semibold text-gray-700">Joined</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">{user.email}</TableCell>
                  <TableCell>
                    {user.plan === 'pro' ? (
                      <Badge className="bg-[#e94560] text-white hover:bg-[#e94560]">Pro</Badge>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.watermark_override ? (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        Override
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">{user.event_count}</TableCell>
                  <TableCell className="text-gray-600">{user.invitation_count}</TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(user)}
                        className="text-xs"
                      >
                        Edit
                      </Button>
                      <Link href={`/users/${user.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs text-gray-500">
                          View
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            {editingUser && (
              <p className="text-sm text-gray-500 truncate">{editingUser.email}</p>
            )}
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Plan</label>
              <Select value={plan} onValueChange={(v) => setPlan(v as 'free' | 'pro')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Watermark Override</p>
                <p className="text-xs text-gray-500">Remove watermark from this user's invitations</p>
              </div>
              <Switch checked={watermark} onCheckedChange={setWatermark} />
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#e94560] hover:bg-[#d63d56] text-white"
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/UserTable.tsx
git commit -m "feat: add UserTable component with search, plan badges, and edit dialog"
```

---

## Task 9: Users page

**Files:**
- Create: `src/app/(admin)/users/page.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p "src/app/(admin)/users"
```

- [ ] **Step 2: Create `src/app/(admin)/users/page.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminUser, usersApi } from '@/lib/api';
import UserTable from '@/components/UserTable';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    usersApi
      .getAll()
      .then(setUsers)
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUserUpdated = (updated: AdminUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={load}
            className="font-medium underline underline-offset-2 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ))}
        </div>
      ) : (
        <UserTable users={users} onUserUpdated={handleUserUpdated} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Navigate to `http://localhost:3001/users`. Expected:
- Table skeleton while loading → then user rows
- Each row: email, plan badge (coral Pro / gray Free), watermark badge, counts, date
- "Edit" button → Dialog opens with plan dropdown + watermark switch
- Save → dialog closes, row updates inline, toast appears
- Search box filters rows in real time

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/users/page.tsx"
git commit -m "feat: add users page with table, search, and inline edit"
```

---

## Task 10: User detail page

**Files:**
- Create: `src/app/(admin)/users/[id]/page.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p "src/app/(admin)/users/[id]"
```

- [ ] **Step 2: Create `src/app/(admin)/users/[id]/page.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AdminUser, UserEvent, usersApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit state
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [watermark, setWatermark] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([usersApi.getAll(), usersApi.getEvents(Number(id))])
      .then(([allUsers, evs]) => {
        const found = allUsers.find((u) => u.id === Number(id));
        if (!found) {
          setError('User not found.');
          return;
        }
        setUser(found);
        setPlan(found.plan);
        setWatermark(found.watermark_override);
        setEvents(evs);
      })
      .catch(() => setError('Failed to load user.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await usersApi.update(user.id, { plan, watermark_override: watermark });
      setUser(updated);
      setPlan(updated.plan);
      setWatermark(updated.watermark_override);
      toast.success('User updated successfully.');
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await usersApi.delete(user.id);
      toast.success(`${user.email} deleted.`);
      router.push('/users');
    } catch {
      setDeleteError('Failed to delete. Please try again.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || 'User not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/users" className="hover:text-gray-900 transition-colors">
          Users
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{user.email}</span>
      </nav>

      {/* Profile card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Plan</p>
              {user.plan === 'pro' ? (
                <Badge className="bg-[#e94560] text-white hover:bg-[#e94560]">Pro</Badge>
              ) : (
                <Badge variant="secondary">Free</Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Events</p>
              <p className="text-sm font-medium text-gray-900">{user.event_count}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Joined</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(user.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Inline edit */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Edit</h3>
            <div className="flex flex-wrap gap-6 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Plan</label>
                <Select value={plan} onValueChange={(v) => setPlan(v as 'free' | 'pro')}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={watermark} onCheckedChange={setWatermark} />
                <span className="text-sm text-gray-700">Watermark override</span>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#e94560] hover:bg-[#d63d56] text-white"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Events table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-700">Name</TableHead>
                <TableHead className="font-semibold text-gray-700">Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Invitations</TableHead>
                <TableHead className="font-semibold text-gray-700">Has Template</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                    No events yet.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium text-gray-900">{ev.name}</TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {new Date(ev.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-gray-600">{ev.invitation_count}</TableCell>
                    <TableCell>
                      {ev.has_template ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="shadow-sm border-red-200">
        <CardHeader>
          <CardTitle className="text-lg text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete this account</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Permanently deletes the user, all their events, and invitations.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
              onClick={() => {
                setDeleteConfirm('');
                setDeleteError('');
                setDeleteOpen(true);
              }}
            >
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => !open && setDeleteOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700">Delete account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-700">
              This will permanently delete <strong>{user.email}</strong> and all their data. This
              cannot be undone.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Type <strong>{user.email}</strong> to confirm
              </label>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={user.email}
                className="font-mono text-sm"
              />
            </div>
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirm !== user.email || deleting}
            >
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Click "View" on any user in `/users`. Expected:
- Breadcrumb: Users → email
- Profile card with plan badge, event count, joined date
- Inline edit: plan dropdown + watermark switch + Save button → toast on success
- Events table below
- Danger zone card with red border
- "Delete account" → dialog opens, "Delete permanently" disabled until email typed correctly

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/users/[id]/page.tsx"
git commit -m "feat: add user detail page with inline edit, events table, and delete flow"
```

---

## Task 11: Final cleanup and verification

- [ ] **Step 1: Remove `three` from dependencies (no longer used)**

```bash
npm uninstall three @types/three
```

- [ ] **Step 2: Run the linter**

```bash
npm run lint
```

Fix any errors that appear. Common shadcn issues: unused imports from deleted components.

- [ ] **Step 3: Full end-to-end verification**

With `npm run dev` running at `localhost:3001`:

| Check | Expected |
|-------|----------|
| `/` (login) | White card, coral button, no dark background |
| Login with wrong password | Inline error message |
| Login with `admin@youareinvited.com` / `Admin1234!` | Redirects to `/dashboard` |
| `/dashboard` | Sidebar visible, KPI cards load, charts render |
| `/users` | User table loads, search filters, Edit dialog works, Save shows toast |
| `/users/[id]` | Profile card, events table, edit works, delete dialog requires email match |
| Logout | Redirects to `/` and cookie cleared |
| Direct `/dashboard` without login | Redirected to `/` by middleware |

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: remove three.js dependency, admin rebuild complete"
```
