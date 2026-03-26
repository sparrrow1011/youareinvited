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
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([statsApi.getStats(), statsApi.getGrowth()])
      .then(([s, g]) => {
        setStats(s);
        setGrowth(g);
      })
      .catch(() => setError('Could not load platform stats. Check the admin backend URL and staff authentication.'))
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
            {error && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            {stats && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <KpiCard label="Total Users" value={stats.total_users} />
                  <KpiCard label="Total Events" value={stats.total_events} />
                  <KpiCard label="Total Invitations" value={stats.total_invitations} />
                  <KpiCard label="Check-Ins Today" value={stats.checkins_today} />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <KpiCard label="Check-In Rate" value={`${stats.checkin_rate.toFixed(1)}%`} />
                </div>
              </>
            )}

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
