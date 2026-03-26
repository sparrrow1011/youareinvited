import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:8000';

  let data: { access?: string; is_staff?: boolean; detail?: string };
  try {
    const djangoRes = await fetch(`${backendUrl}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    data = await djangoRes.json();
    if (!djangoRes.ok) {
      return NextResponse.json(
        { error: data.detail || 'Invalid email or password.' },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Could not reach backend.' }, { status: 502 });
  }

  if (!data.is_staff) {
    return NextResponse.json(
      { error: 'Access denied. Staff accounts only.' },
      { status: 403 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_access_token', data.access!, {
    httpOnly: false, // Axios reads it client-side for Authorization header
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600, // 1 hour — matches Django JWT ACCESS_TOKEN_LIFETIME
    path: '/',
  });
  return res;
}
