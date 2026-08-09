import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
  res.cookies.set('auth-token', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
  return res;
}

export async function GET(req: Request) {
  const url = new URL('/select-role', req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set('auth-token', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
  return res;
}
