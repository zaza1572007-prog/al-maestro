import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

import { checkRateLimit } from '@/lib/rate-limiter';
import { logAuditAction } from '@/lib/audit-logger';

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(clientIp, 'auth_login', 'STRICT');
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: `تجاوزت عدد محاولات الدخول المسموحة. يرجى الانتظار ${rateLimit.resetSeconds} ثانية.` },
        { status: 429 }
      );
    }

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
          .replace(/\s+/g, ' ')
          .trim();
      };

      const stripHonorifics = (text: string) => {
        return text
          .replace(/^(الاستاذ|الأستاذ|استاذ|أستاذ|مستر|دكتور|د\/|أ\/|ا\/)\s+/gi, '')
          .trim();
      };

      const cleanForMatching = (text: string) => {
        return normalizeArabic(stripHonorifics(normalizeArabic(text)));
      };

      const queryIdentifier = phone.trim();

      // 1. Try exact phone match
      targetUser = await prisma.user.findFirst({
        where: { phone: queryIdentifier },
      });

      // 2. If not found by phone, try exact full name match in DB
      if (!targetUser) {
        targetUser = await prisma.user.findFirst({
          where: {
            name: {
              equals: queryIdentifier,
              mode: 'insensitive',
            },
          },
        });
      }

      // 3. Strict full name equality (ignoring honorifics like 'الأستاذ' and hamzas, but requiring full name)
      if (!targetUser) {
        const allUsers = await prisma.user.findMany();
        const cleanedQuery = cleanForMatching(queryIdentifier);
        targetUser = allUsers.find(user => 
          cleanForMatching(user.name) === cleanedQuery ||
          normalizeArabic(user.name) === normalizeArabic(queryIdentifier)
        ) || null;
      }

      if (!targetUser) {
        return NextResponse.json({ 
          success: false, 
          error: 'بيانات الدخول غير صحيحة. يجب كتابة اسم المستخدم الكامل المسجل أو رقم الهاتف كاملاً مع كلمة السر.' 
        }, { status: 401 });
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

    logAuditAction({
      userId: targetUser.id,
      action: 'USER_LOGIN_SUCCESS',
      entity: userRole === 'STUDENT' ? 'Student' : userRole === 'PARENT' ? 'Parent' : 'User',
      entityId: targetUser.id,
      changes: { role: userRole, name: targetUser.name },
      ipAddress: clientIp,
    });

    res.cookies.set('auth-token', token, cookieOptions);
    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
