import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'رمز QR غير صالح' }, { status: 400 });
    }

    // 1. Search in Student by qrCode
    const student = await prisma.student.findFirst({
      where: { qrCode: token },
      include: { academicStage: true, group: true },
    });

    if (student) {
      const jwtToken = await signToken({
        userId: student.id,
        name: student.name,
        role: 'STUDENT',
        phone: student.phone || '',
      });

      const res = NextResponse.json({
        success: true,
        role: 'STUDENT',
        redirectTo: '/student-portal',
        user: { id: student.id, name: student.name, role: 'STUDENT' },
      });

      // Session Cookie — no maxAge so it expires when browser closes
      res.cookies.set('auth-token', jwtToken, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        // No maxAge → session cookie (deleted when browser closes)
      });

      return res;
    }

    // 2. Search in Parent by qrCode
    const parent = await prisma.parent.findFirst({
      where: { qrCode: token },
    });

    if (parent) {
      const jwtToken = await signToken({
        userId: parent.id,
        name: parent.name,
        role: 'PARENT',
        phone: parent.phone || '',
      });

      const res = NextResponse.json({
        success: true,
        role: 'PARENT',
        redirectTo: '/parent-portal',
        user: { id: parent.id, name: parent.name, role: 'PARENT' },
      });

      // Session Cookie — no maxAge so it expires when browser closes
      res.cookies.set('auth-token', jwtToken, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        // No maxAge → session cookie (deleted when browser closes)
      });

      return res;
    }

    // 3. Not found
    return NextResponse.json(
      { success: false, error: 'رمز QR غير معروف أو منتهي الصلاحية' },
      { status: 401 }
    );
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
