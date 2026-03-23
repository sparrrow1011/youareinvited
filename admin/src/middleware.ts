import { NextRequest, NextResponse } from 'next/server';

// Only the login page is public. The /api/login route is also exempt.
const PUBLIC_PATHS = new Set(['/']);
const PUBLIC_PREFIXES = ['/api/login', '/_next/', '/favicon.ico'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const hasToken = !!req.cookies.get('admin_access_token')?.value;
  if (!hasToken) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
