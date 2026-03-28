import { NextRequest, NextResponse } from 'next/server';
import { isExpiredJwt } from '@/lib/jwt';

const PUBLIC_PATHS = new Set([
  '/', '/login', '/logout', '/signup', '/verify-email',
]);

const PUBLIC_PREFIXES = ['/invite/', '/invitation/', '/security/event/'];
const PUBLIC_API_PATTERNS = [
  /^\/api\/events\/[^/]+\/public_info\/?$/,
  /^\/api\/events\/[^/]+\/verify_security_pin\/?$/,
];

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
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  return res;
};

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const jwt = req.cookies.get('access_token')?.value;
  const hasExpiredJwt = !!jwt && isExpiredJwt(jwt);

  const buildExpiredSessionRedirect = (): NextResponse => {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('reason', 'session-expired');
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete('access_token');
    return addSecurityHeaders(res);
  };

  if (PUBLIC_PATHS.has(pathname) || isPublicAsset(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (PUBLIC_API_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Per-event checkin guard: must run before the public-prefix early return
  const isCheckinPath = /^\/security\/event\/[^/]+\/checkin/.test(pathname);
  if (isCheckinPath) {
    const hasToken = !!req.cookies.get('security_token')?.value;
    if (!hasToken) {
      // redirect to PIN page — strip /checkin suffix
      const pinPage = pathname.replace(/\/checkin.*$/, '');
      return NextResponse.redirect(new URL(pinPage, req.url));
    }
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (!pathname.startsWith('/security/')) {
    // JWT auth — check for access_token cookie
    if (hasExpiredJwt) {
      return buildExpiredSessionRedirect();
    }

    if (!jwt) {
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
