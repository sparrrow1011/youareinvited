import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { eventId, token } = await req.json();

  if (!eventId || !token) {
    return NextResponse.json({ error: 'eventId and token are required' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('security_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: `/security/event/${eventId}`,
    maxAge: 43200, // 12 hours
  });
  return res;
}
