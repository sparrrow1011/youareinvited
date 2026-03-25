import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { eventId } = await req.json();

  if (!eventId) {
    return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('security_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: `/security/event/${eventId}`,
    maxAge: 0,
  });
  return res;
}
