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
    <div className="min-w-0">
      <h1 className="mb-5 text-xl font-bold text-gray-900 sm:mb-6 sm:text-2xl">Platform Overview</h1>

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

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mb-8 lg:grid-cols-4 lg:gap-4">
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
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
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

        <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
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
