import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };

  const secret = process.env.SUPER_ADMIN_SECRET;

  if (!secret || !password || password !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // Non-httpOnly intentionally: Axios reads admin_token client-side to set
  // X-Super-Admin-Token header. Accepted risk for v1 internal tool.
  res.cookies.set('admin_token', secret, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400, // 24 hours
    path: '/',
  });
  return res;
}
