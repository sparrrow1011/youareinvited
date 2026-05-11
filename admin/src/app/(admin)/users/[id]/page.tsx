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
