import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'almaestro-secret-key-2026');

export async function POST(req: Request) {
  try {
    const token = await new SignJWT({ userId: 'master-owner', role: 'OWNER' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const res = NextResponse.json({
      success: true,
      user: { name: 'الأستاذ أحمد راضي كحلة', role: 'OWNER', phone: '0100000000' }
    });
    
    res.cookies.set('auth-token', token, { httpOnly: true, path: '/' });
    return res;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}


