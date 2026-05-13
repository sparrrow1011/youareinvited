import axios from 'axios';
import { clearAdminToken, getAdminToken } from './auth';

const api = axios.create({
  baseURL: '/api',
});

let hasRedirectedForAuthFailure = false;

// Attach JWT as Bearer token on every request
api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (typeof window !== 'undefined' && (status === 401 || status === 403)) {
      clearAdminToken();

      if (!hasRedirectedForAuthFailure) {
        hasRedirectedForAuthFailure = true;
        const reason = status === 403 ? 'access-denied' : 'session-expired';
        const next = encodeURIComponent(window.location.pathname);
        window.location.href = `/?reason=${reason}&next=${next}`;
      }
    }

    return Promise.reject(error);
  },
);

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
  features: Record<string, boolean>;
}

// ── API helpers ───────────────────────────────────────────────────────────────

export const statsApi = {
  getStats: () => api.get<PlatformStats>('/superadmin/stats/').then((r) => r.data),
  getGrowth: () => api.get<GrowthPoint[]>('/superadmin/growth/').then((r) => r.data),
};

export const usersApi = {
  getAll: () => api.get<AdminUser[]>('/superadmin/users/').then((r) => r.data),
  update: (id: number, data: Partial<Pick<AdminUser, 'plan' | 'watermark_override'>>) =>
    api.patch<AdminUser>(`/superadmin/users/${id}/`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/superadmin/users/${id}/`),
  getEvents: (id: number) =>
    api.get<UserEvent[]>(`/superadmin/users/${id}/events/`).then((r) => r.data),
};

export const eventsApi = {
  updateFeatures: (eventId: string, features: Record<string, boolean>) =>
    api
      .patch<{ id: string; features: Record<string, boolean> }>(
        `/superadmin/events/${eventId}/`,
        { features },
      )
      .then((r) => r.data),
};

export default api;
