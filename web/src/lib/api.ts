import axios from 'axios';
import { getToken, setToken, clearToken } from './auth';
import { isExpiredJwt } from './jwt';

const LOCAL_BACKEND_URL = 'http://127.0.0.1:8000';
const PRODUCTION_DIRECT_API_BASE_URL = 'https://backend.v0.youare-invited.com/api';
const DIRECT_BROWSER_API_HOSTS = new Set(['youare-invited.com', 'www.youare-invited.com']);
const LOCAL_BROWSER_HOSTS = new Set(['localhost', '127.0.0.1']);

const getDefaultApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return `${(process.env.BACKEND_URL || LOCAL_BACKEND_URL).replace(/\/$/, '')}/api`;
  }

  if (LOCAL_BROWSER_HOSTS.has(window.location.hostname)) {
    return `${LOCAL_BACKEND_URL}/api`;
  }

  if (DIRECT_BROWSER_API_HOSTS.has(window.location.hostname)) {
    return PRODUCTION_DIRECT_API_BASE_URL;
  }

  return '/api';
};

const normalizeApiBaseUrl = (rawUrl?: string): string => {
  const candidate = (rawUrl || getDefaultApiBaseUrl()).trim();

  if (candidate.startsWith('/')) {
    return candidate.replace(/\/$/, '');
  }

  try {
    const parsed = new URL(candidate);
    const isLocalHttp =
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');

    if (!isLocalHttp && parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      return parsed.toString().replace(/\/$/, '');
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return getDefaultApiBaseUrl();
  }
};

const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
const API_ORIGIN = (() => {
  if (API_BASE_URL.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return (process.env.BACKEND_URL || LOCAL_BACKEND_URL).replace(/\/$/, '');
  }

  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return (process.env.BACKEND_URL || LOCAL_BACKEND_URL).replace(/\/$/, '');
  }
})();

export const resolveMediaUrl = (pathOrUrl?: string | null): string => {
  if (!pathOrUrl) return '';
  const value = pathOrUrl.trim();

  if (/^https?:\/\//i.test(value)) return value;

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  if (API_BASE_URL.startsWith('/')) return normalizedPath;
  return `${API_ORIGIN}${normalizedPath}`;
};

export const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_FREE_PATHS = ['/auth/login/', '/auth/register/', '/auth/refresh/'];
let hasRedirectedForExpiredSession = false;

const isAuthFreePath = (url?: string): boolean => {
  if (!url) return false;
  return AUTH_FREE_PATHS.some((path) => url.includes(path));
};

const redirectToSessionExpiredLogin = (): void => {
  if (typeof window === 'undefined' || hasRedirectedForExpiredSession) {
    return;
  }

  hasRedirectedForExpiredSession = true;
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.href = `/login?reason=session-expired&next=${next}`;
};

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (!token || isAuthFreePath(config.url)) {
    return config;
  }

  if (isExpiredJwt(token)) {
    clearToken();
    redirectToSessionExpiredLogin();
    return Promise.reject(new axios.CanceledError('Session expired.'));
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isAuthFreePath(error.config?.url)
    ) {
      clearToken();
      redirectToSessionExpiredLogin();
    }
    return Promise.reject(error);
  }
);

// Auth service
export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  display_name: string;
  avatar_initial: string;
  plan: 'free' | 'pro';
  brand_name: string;
  brand_logo_url: string | null;
  show_event_branding: boolean;
}

export interface AccountSettings extends AuthUser {
  watermark_override: boolean;
  default_whatsapp_message_template: string;
  total_events: number;
  protected_events: number;
  frontend_url: string;
  backend_url: string;
  media_storage: 'local' | 's3' | 'unconfigured';
  can_upload_brand_logo: boolean;
  team_access_mode: 'security_pin_links';
}

export interface AccountSettingsUpdate {
  display_name?: string;
  email?: string;
  brand_name?: string;
  show_event_branding?: boolean;
  default_whatsapp_message_template?: string;
  current_password?: string;
  new_password?: string;
  clear_brand_logo?: boolean;
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

  me: async (): Promise<AuthUser> => {
    const response = await api.get<AuthUser>('/auth/me/');
    return response.data;
  },

  getSettings: async (): Promise<AccountSettings> => {
    const response = await api.get<AccountSettings>('/auth/settings/');
    return response.data;
  },

  updateSettings: async (data: AccountSettingsUpdate | FormData): Promise<AccountSettings> => {
    const isMultipart = typeof FormData !== 'undefined' && data instanceof FormData;
    const response = await api.patch<AccountSettings>(
      '/auth/settings/',
      data,
      isMultipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    );
    return response.data;
  },

  exportData: async (): Promise<Blob> => {
    const response = await api.get('/auth/export/', {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteAccount: async (password: string): Promise<void> => {
    await api.delete('/auth/delete/', {
      data: { password },
    });
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
  has_security_pin: boolean;
  whatsapp_message_template: string;
  theme: string;
  theme_data: Record<string, unknown>;
  created_at: string;
}

export interface EventCreate {
  name: string;
  date: string;
  description?: string;
  theme?: string;
  theme_data?: Record<string, unknown>;
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

  setSecurityPin: (id: string, pin: string | null) =>
    api.post(`/events/${id}/set_security_pin/`, { pin }),
};

export interface Invitation {
  id: string;
  event: string;
  event_name: string;
  event_date: string;
  event_theme: string;
  event_theme_data: Record<string, unknown>;
  name: string;
  seat_number: string;
  tag: string;
  qr_code: string;
  e_invite_image: string;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
  invitation_url: string;
  whatsapp_share_url: string;
  brand_name: string;
  brand_logo_url: string | null;
  show_event_branding: boolean;
}

export interface InvitationCreate {
  name: string;
  seat_number: string;
  tag: string;
}

export interface InvitationStats {
  total_invitations: number;
  checked_in: number;
  pending: number;
  check_in_rate: number;
}

export interface AnalyticsTotals {
  total_events: number;
  invitations_sent: number;
  invitation_opens: number;
  viewed_invitations: number;
  whatsapp_shares: number;
  link_shares: number;
  total_shares: number;
  checked_in: number;
  pending: number;
  check_in_rate: number;
  view_rate: number;
}

export interface AnalyticsFunnel {
  created: number;
  viewed: number;
  arrived: number;
}

export interface AnalyticsGuestStatus {
  checked_in: number;
  pending: number;
}

export interface AnalyticsTagBreakdown {
  tag: string;
  count: number;
  checked_in: number;
  pending: number;
  check_in_rate: number;
}

export interface AnalyticsEventComparison {
  event_id: string;
  event_name: string;
  event_date: string;
  invitations_sent: number;
  viewed_invitations: number;
  invitation_opens: number;
  whatsapp_shares: number;
  link_shares: number;
  total_shares: number;
  checked_in: number;
  pending: number;
  view_rate: number;
  check_in_rate: number;
}

export interface AnalyticsCheckInHour {
  hour: number;
  label: string;
  count: number;
}

export interface InvitationAnalytics {
  totals: AnalyticsTotals;
  funnel: AnalyticsFunnel;
  guest_status: AnalyticsGuestStatus;
  tag_breakdown: AnalyticsTagBreakdown[];
  event_comparison: AnalyticsEventComparison[];
  peak_check_in_times: AnalyticsCheckInHour[];
  check_in_by_hour: AnalyticsCheckInHour[];
  warning?: string;
}

export const invitationService = {
  // Get all invitations
  getAll: async (): Promise<Invitation[]> => {
    const response = await api.get<Invitation[]>('/invitations/');
    return response.data;
  },

  // Get single invitation
  getById: async (id: string, options?: { trackView?: boolean }): Promise<Invitation> => {
    const response = await api.get<Invitation>(`/invitations/${id}/`, {
      params: options?.trackView ? { track_view: '1' } : undefined,
    });
    return response.data;
  },

  // Create new invitation
  create: async (data: InvitationCreate): Promise<Invitation> => {
    const response = await api.post<Invitation>('/invitations/', data);
    return response.data;
  },

  // Update invitation
  update: async (id: string, data: Partial<InvitationCreate>): Promise<Invitation> => {
    const response = await api.patch<Invitation>(`/invitations/${id}/`, data);
    return response.data;
  },

  // Delete invitation
  delete: async (id: string): Promise<void> => {
    await api.delete(`/invitations/${id}/`);
  },

  // Check in guest
  checkIn: async (id: string, securityToken?: string): Promise<Invitation> => {
    const response = await api.post<Invitation>(`/invitations/${id}/check_in/`, {}, {
      headers: securityToken ? { 'X-Security-Token': securityToken } : {},
    });
    return response.data;
  },

  // Admin undo check-in
  undoCheckIn: async (id: string): Promise<Invitation> => {
    const response = await api.post<Invitation>(`/invitations/${id}/admin_undo_check_in/`);
    return response.data;
  },

  // Regenerate images
  regenerateImages: async (id: string): Promise<Invitation> => {
    const response = await api.post<Invitation>(`/invitations/${id}/regenerate_images/`);
    return response.data;
  },

  // Get stats
  getStats: async (): Promise<InvitationStats> => {
    const response = await api.get<InvitationStats>('/invitations/stats/');
    return response.data;
  },

  getAnalytics: async (): Promise<InvitationAnalytics> => {
    const response = await api.get<InvitationAnalytics>('/invitations/analytics/');
    return response.data;
  },

  exportAnalytics: async (): Promise<Blob> => {
    const response = await api.get('/invitations/analytics/export/', {
      responseType: 'blob',
    });
    return response.data;
  },

  trackShare: async (id: string, channel: 'whatsapp' | 'link'): Promise<void> => {
    await api.post(`/invitations/${id}/track_share/`, { channel });
  },

  // Bulk import from CSV
  bulkImport: async (eventId: string, file: File): Promise<{ created: number; errors: string[] }> => {
    const form = new FormData();
    form.append('event', eventId);
    form.append('file', file);
    const response = await api.post('/invitations/bulk_import/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default invitationService;
