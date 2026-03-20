import { NextRequest, NextResponse } from 'next/server';

const SITE_PASSWORD = (process.env.SITE_PASSWORD || '').trim();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password.trim() : '';

  if (!SITE_PASSWORD) {
    return NextResponse.json(
      { ok: false, message: 'Server auth is not configured (SITE_PASSWORD missing)' },
      { status: 500 }
    );
  }

  if (password !== SITE_PASSWORD) {
    return NextResponse.json({ ok: false, message: 'Invalid password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('site_auth', '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  return res;
}
