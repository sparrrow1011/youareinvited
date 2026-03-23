import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set([
  '/', '/login', '/logout', '/signup',
  '/security/login', '/security/logout',
]);

const PUBLIC_PREFIXES = ['/invitation/'];

const isPublicAsset = (pathname: string): boolean => {
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname === '/favicon.ico') return true;
  return /\.[a-zA-Z0-9]+$/.test(pathname);
};

const addSecurityHeaders = (res: NextResponse): NextResponse => {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
};

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || isPublicAsset(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return addSecurityHeaders(NextResponse.next());
  }

  const hasSecurityAuth = req.cookies.get('security_auth')?.value === '1';
  const isSecurityPath = pathname.startsWith('/security');

  if (isSecurityPath && !hasSecurityAuth) {
    const securityLoginUrl = new URL('/security/login', req.url);
    securityLoginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(securityLoginUrl);
  }

  if (!isSecurityPath) {
    // JWT auth — check for access_token cookie
    const hasJwt = !!req.cookies.get('access_token')?.value;
    if (!hasJwt) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('Vary', 'Cookie');
  addSecurityHeaders(res);

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
