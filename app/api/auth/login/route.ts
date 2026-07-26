import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';
import bcrypt from 'bcrypt';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return new TextEncoder().encode(secret);
}

export async function POST(req: Request) {
  try {
    const { phone, password } = await req.json();
    if (!phone || !password) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف وكلمة المرور مطلوبان' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { phone } });
    if (!targetUser || !(await bcrypt.compare(password, targetUser.password))) {
      return NextResponse.json({ success: false, error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    const token = await new SignJWT({
      userId: targetUser.id,
      name: targetUser.name,
      role: targetUser.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(getJwtSecret());

    const res = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        role: targetUser.role,
      },
    });

    res.cookies.set('auth-token', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
