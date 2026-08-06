import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';
import bcrypt from 'bcrypt';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'almaestro-secret-key-2026');

export async function POST(req: Request) {
  try {
    const { phone, studentName, password, role } = await req.json();

    let userRole = role || 'TEACHER';
    let targetUser: any = null;

    if (userRole === 'STUDENT') {
      // Find student by Name, Phone, or Code
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

        const isPasswordCorrect = targetUser && targetUser.password
          ? await bcrypt.compare(password, targetUser.password)
          : false;

        if (targetUser && targetUser.password && !isPasswordCorrect) {
          return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة' }, { status: 401 });
        }
      }

      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'لم يتم العثور على الطالب' }, { status: 404 });
      }
    } else if (userRole === 'PARENT') {
      targetUser = await prisma.parent.findFirst({
        where: { phone },
      });

      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'لم يتم العثور على ولي الأمر' }, { status: 404 });
      }

      const isPasswordCorrect = targetUser.password
        ? await bcrypt.compare(password, targetUser.password)
        : false;

      if (targetUser.password && !isPasswordCorrect) {
        return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة' }, { status: 401 });
      }
    } else {
      const normalizeArabic = (text: string) => {
        return text
          .replace(/[أإآ]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/ى/g, 'ي')
          .trim();
      };

      const allUsers = await prisma.user.findMany();
      const normalizedQuery = normalizeArabic(phone);

      targetUser = allUsers.find(user => 
        user.phone === phone || 
        normalizeArabic(user.name).includes(normalizedQuery)
      ) || null;

      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'لم يتم العثور على المعلم/المساعد' }, { status: 404 });
      }

      const isPasswordCorrect = await bcrypt.compare(password, targetUser.password);
      if (!isPasswordCorrect) {
        return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة' }, { status: 401 });
      }

      userRole = targetUser.role;
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
