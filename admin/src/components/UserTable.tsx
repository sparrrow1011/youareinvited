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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </p>
        <input
          type="search"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-[#e94560] focus:outline-none focus:ring-2 focus:ring-[#e94560]/30 sm:w-72"
        />
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
            No users found.
          </div>
        ) : (
          filtered.map((user) => (
            <div key={user.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{user.email}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Joined{' '}
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                {user.plan === 'pro' ? (
                  <Badge className="shrink-0 bg-[#e94560] text-white hover:bg-[#e94560]">Pro</Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0">Free</Badge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Events</p>
                  <p className="font-semibold text-gray-900">{user.event_count}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Invitations</p>
                  <p className="font-semibold text-gray-900">{user.invitation_count}</p>
                </div>
                <div className="col-span-2">
                  <p className="mb-1 text-xs text-gray-500">Watermark</p>
                  {user.watermark_override ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Override
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(user)}
                  className="flex-1 text-xs"
                >
                  Edit
                </Button>
                <Link href={`/users/${user.id}`} className="flex-1">
                  <Button size="sm" variant="ghost" className="w-full text-xs text-gray-500">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
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
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-lg sm:max-w-md">
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
                <p className="text-xs text-gray-500">Remove watermark from this user&apos;s invitations</p>
              </div>
              <Switch checked={watermark} onCheckedChange={setWatermark} />
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
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
