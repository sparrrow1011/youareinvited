import { NextRequest, NextResponse } from 'next/server';

const SECURITY_PASSWORD = (process.env.SECURITY_PASSWORD || '').trim();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password.trim() : '';

  if (!SECURITY_PASSWORD) {
    return NextResponse.json(
      { ok: false, message: 'Server auth is not configured (SECURITY_PASSWORD missing)' },
      { status: 500 }
    );
  }

  if (password !== SECURITY_PASSWORD) {
    return NextResponse.json({ ok: false, message: 'Invalid security password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('security_auth', '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/security',
  });

  return res;
}
