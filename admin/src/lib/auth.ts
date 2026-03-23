import Cookies from 'js-cookie';

const COOKIE_NAME = 'admin_token';

/**
 * Read the admin session token.
 * Cookie is non-httpOnly so JS can read it directly.
 * See spec: accepted tradeoff for v1 internal tool.
 */
export function getAdminToken(): string | undefined {
  return Cookies.get(COOKIE_NAME);
}

export function clearAdminToken(): void {
  Cookies.remove(COOKIE_NAME);
}

export function isAuthenticated(): boolean {
  return !!getAdminToken();
}
