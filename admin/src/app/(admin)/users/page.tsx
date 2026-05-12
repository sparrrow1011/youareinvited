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
    <div className="min-w-0">
      <h1 className="mb-5 text-xl font-bold text-gray-900 sm:mb-6 sm:text-2xl">Users</h1>

      {error && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-wrap items-center gap-4">
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
