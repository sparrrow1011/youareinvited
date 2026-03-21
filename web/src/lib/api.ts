import axios from 'axios';
import { getToken, setToken, clearToken } from './auth';

const DEFAULT_API_BASE_URL = 'https://event-invitation-backend.vercel.app/api';

const normalizeApiBaseUrl = (rawUrl?: string): string => {
  const candidate = (rawUrl || DEFAULT_API_BASE_URL).trim();

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
    return DEFAULT_API_BASE_URL;
  }
};

const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return 'https://event-invitation-backend.vercel.app';
  }
})();

export const resolveMediaUrl = (pathOrUrl?: string | null): string => {
  if (!pathOrUrl) return '';
  const value = pathOrUrl.trim();

  if (/^https?:\/\//i.test(value)) return value;

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${API_ORIGIN}${normalizedPath}`;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export interface Invitation {
  id: string;
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

export const invitationService = {
  // Get all invitations
  getAll: async (): Promise<Invitation[]> => {
    const response = await api.get<Invitation[]>('/invitations/');
    return response.data;
  },

  // Get single invitation
  getById: async (id: string): Promise<Invitation> => {
    const response = await api.get<Invitation>(`/invitations/${id}/`);
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
  checkIn: async (id: string): Promise<Invitation> => {
    const response = await api.post<Invitation>(`/invitations/${id}/check_in/`);
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
};

export default invitationService;
