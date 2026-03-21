import Cookies from 'js-cookie';

const COOKIE_NAME = 'access_token';
const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  expires: 1, // 1 day
};

export const getToken = (): string | undefined => Cookies.get(COOKIE_NAME);

export const setToken = (token: string): void => {
  Cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
};

export const clearToken = (): void => {
  Cookies.remove(COOKIE_NAME);
};

export const isAuthenticated = (): boolean => !!getToken();
