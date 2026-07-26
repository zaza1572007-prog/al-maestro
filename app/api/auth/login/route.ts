import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'almaestro-secret-key-2026');

export async function POST(req: Request) {
  try {
    const { phone, studentName, password, role } = await req.json();

    let userRole = role || 'TEACHER';
    let targetUser: any = null;

    if (userRole === 'STUDENT') {
      // Find student by Name or Phone or Code
      if (studentName || phone) {
        targetUser = await prisma.student.findFirst({
          where: {
            OR: [
              { name: { contains: studentName || phone } },
              { phone: phone || studentName },
              { code: phone || studentName },
            ],
          },
          include: { academicStage: true, group: true },
        });
      }

      if (!targetUser) {
        // Fallback or create student session
        targetUser = {
          id: 'stu-default',
          name: studentName || phone || 'طالب المايسترو',
          role: 'STUDENT',
        };
      }
    } else {
      targetUser = {
        id: 'master-owner',
        name: 'الأستاذ أحمد راضي كحلة',
        role: 'OWNER',
        phone: '0100000000',
      };
    }

    const token = await new SignJWT({
      userId: targetUser.id,
      name: targetUser.name,
      role: userRole,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const res = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        role: userRole,
      },
    });

    res.cookies.set('auth-token', token, { httpOnly: true, path: '/' });
    return res;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
