import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const { phone, studentName, password, role, rememberMe } = await req.json();
    let userRole = role || 'TEACHER';

    if (userRole === 'STUDENT') {
      if ((!phone && !studentName) || !password) {
        return NextResponse.json({ success: false, error: 'الاسم/الكود وكلمة المرور مطلوبان' }, { status: 400 });
      }
    } else {
      if (!phone || !password) {
        return NextResponse.json({ success: false, error: 'رقم الهاتف وكلمة المرور مطلوبان' }, { status: 400 });
      }
    }

    let targetUser: any = null;

    if (userRole === 'STUDENT') {
      const searchKey = (phone || studentName || '').trim();
      targetUser = await prisma.student.findFirst({
        where: {
          OR: [
            { code: searchKey },
            { phone: searchKey },
            { name: searchKey },
          ],
        },
        include: { academicStage: true, group: true },
      });

      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'لم يتم العثور على حساب الطالب. يرجى التأكد من الكود أو رقم الهاتف.' }, { status: 401 });
      }

      if (!targetUser.password) {
        return NextResponse.json({ success: false, error: 'لم يتم تفعيل كلمة المرور لهذا الحساب. يرجى مراجعة إدارة السنتر.' }, { status: 401 });
      }

      const isPasswordCorrect = await bcrypt.compare(password, targetUser.password);
      if (!isPasswordCorrect) {
        return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة' }, { status: 401 });
      }

      userRole = 'STUDENT';
    } else if (userRole === 'PARENT') {
      const parentPhone = phone.trim();
      targetUser = await prisma.parent.findFirst({
        where: { phone: parentPhone },
      });

      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'لم يتم العثور على حساب ولي الأمر بهذا الرقم.' }, { status: 401 });
      }

      if (!targetUser.password) {
        return NextResponse.json({ success: false, error: 'لم يتم تفعيل كلمة المرور لهذا الحساب. يرجى مراجعة إدارة السنتر.' }, { status: 401 });
      }

      const isPasswordCorrect = await bcrypt.compare(password, targetUser.password);
      if (!isPasswordCorrect) {
        return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة' }, { status: 401 });
      }

      userRole = 'PARENT';
    } else {
      const normalizeArabic = (text: string) => {
        return text
          .replace(/[أإآ]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/ى/g, 'ي')
          .trim();
      };

      const queryPhone = phone.trim();
      // First try exact phone match
      targetUser = await prisma.user.findFirst({
        where: { phone: queryPhone },
      });

      // If not found, try normalized name search
      if (!targetUser) {
        const allUsers = await prisma.user.findMany();
        const normalizedQuery = normalizeArabic(queryPhone);
        targetUser = allUsers.find(user => 
          normalizeArabic(user.name).includes(normalizedQuery)
        ) || null;
      }

      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'لم يتم العثور على حساب المعلم/المساعد' }, { status: 401 });
      }

      if (!targetUser.password) {
        return NextResponse.json({ success: false, error: 'الحساب غير مهيأ بكلمة مرور' }, { status: 401 });
      }

      const isPasswordCorrect = await bcrypt.compare(password, targetUser.password);
      if (!isPasswordCorrect) {
        return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة' }, { status: 401 });
      }

      userRole = targetUser.role;
    }

    const token = await signToken({
      userId: targetUser.id,
      name: targetUser.name,
      role: userRole as any,
      phone: targetUser.phone || '',
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        role: userRole,
      },
    });

    const cookieOptions: any = {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    };

    // If rememberMe is explicitly true, persist for 7 days.
    // Otherwise, omit maxAge to make it a Session Cookie (cleared on browser close).
    if (rememberMe === true) {
      cookieOptions.maxAge = 60 * 60 * 24 * 7;
    }

    res.cookies.set('auth-token', token, cookieOptions);
    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
