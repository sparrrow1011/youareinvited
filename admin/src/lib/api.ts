import axios from 'axios';
import { getAdminToken } from './auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
});

// Attach JWT as Bearer token on every request
api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
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
