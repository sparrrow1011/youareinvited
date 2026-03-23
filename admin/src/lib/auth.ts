import Cookies from 'js-cookie';

const COOKIE_NAME = 'admin_access_token';

export function getAdminToken(): string | undefined {
  return Cookies.get(COOKIE_NAME);
}

export function clearAdminToken(): void {
  Cookies.remove(COOKIE_NAME);
}

export function isAuthenticated(): boolean {
  return !!getAdminToken();
}
