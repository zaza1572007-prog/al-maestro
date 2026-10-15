import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { verifyStudentQR } from '@/lib/qr-signer';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(clientIp, 'auth_qr_login', 'STRICT');
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: `تجاوزت عدد محاولات الدخول المسموحة. يرجى الانتظار ${rateLimit.resetSeconds} ثانية.` },
        { status: 429 }
      );
    }

    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'رمز QR غير صالح' }, { status: 400 });
    }

    // 1. In-memory HMAC cryptographic verification (O(1) - Zero database overhead)
    const qrVerification = verifyStudentQR(token);
    if (!qrVerification.valid || qrVerification.isLegacy || !qrVerification.studentId) {
      return NextResponse.json(
        { success: false, error: qrVerification.reason || 'رمز QR غير صالح أو غير موثق بتوقيع رقمي' },
        { status: 401 }
      );
    }

    const targetId = qrVerification.studentId;

    // 2. Direct indexed lookup for Student by primary key (id)
    const student = await prisma.student.findUnique({
      where: { id: targetId },
      include: { academicStage: true, group: true },
    });

    if (student) {
      if (student.isDeleted) {
        return NextResponse.json(
          { success: false, error: 'هذا الحساب معطل، يرجى مراجعة إدارة السنتر.' },
          { status: 403 }
        );
      }

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

      // Session Cookie — expires when browser closes
      res.cookies.set('auth-token', jwtToken, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });

      return res;
    }

    // 3. Direct indexed lookup for Parent by primary key (id)
    const parent = await prisma.parent.findUnique({
      where: { id: targetId },
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

      // Session Cookie — expires when browser closes
      res.cookies.set('auth-token', jwtToken, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });

      return res;
    }

    // 4. User ID signed in QR token does not exist in the database
    return NextResponse.json(
      { success: false, error: 'الحساب المرتبط برمز QR غير موجود أو تم حذفه' },
      { status: 404 }
    );
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
