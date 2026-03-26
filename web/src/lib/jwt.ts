const decodeBase64Url = (value: string): string | null => {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '='
    );

    if (typeof atob === 'function') {
      return atob(padded);
    }

    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch {
    return null;
  }
};

export const getJwtExpiry = (token?: string | null): number | null => {
  if (!token) return null;

  const [, payload] = token.split('.');
  if (!payload) return null;

  const decoded = decodeBase64Url(payload);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as { exp?: number };
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const isExpiredJwt = (token?: string | null, nowMs: number = Date.now()): boolean => {
  const expiry = getJwtExpiry(token);
  return expiry === null || expiry <= nowMs;
};
