import { NextRequest, NextResponse } from 'next/server';

// Paths that don't require authentication
const PUBLIC_PATHS = new Set(['/login', '/logout', '/security/login', '/security/logout']);

// Path prefixes accessible without auth (guests viewing their invitation)
const PUBLIC_PREFIXES = ['/invitation/'];

// Check if path is a public asset (images, fonts, etc.)
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

  // Allow public paths and assets
  if (PUBLIC_PATHS.has(pathname) || isPublicAsset(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow public path prefixes (e.g. guest invitation pages)
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return addSecurityHeaders(NextResponse.next());
  }

  const isAuthed = req.cookies.get('site_auth')?.value === '1';
  const hasSecurityAuth = req.cookies.get('security_auth')?.value === '1';
  const isSecurityPath = pathname.startsWith('/security');

  // Security area has its own independent login flow.
  if (isSecurityPath && !hasSecurityAuth) {
    const securityLoginUrl = new URL('/security/login', req.url);
    securityLoginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(securityLoginUrl);
  }

  // Non-security pages use general site login.
  if (!isSecurityPath && !isAuthed) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated — apply cache and security headers
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
