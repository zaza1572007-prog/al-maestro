import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff || staff.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'غير مصرح لك بتنفيذ هذا الإجراء (للمدير فقط OWNER)' }, { status: 403 });
    }

    const body = await req.json();
    const { type, password, scope, stageId, groupId, studentId } = body;

    // 1. Delete Attendance/Absence (حذف الغياب)
    if (type === 'attendance') {
      if (password !== '147369258') {
        return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.' }, { status: 403 });
      }
      let count = 0;
      if (scope === 'all') {
        const result = await prisma.attendance.deleteMany({
          where: { status: 'ABSENT' },
        });
        count = result.count;
      } else if (scope === 'stage') {
        if (!stageId) {
          return NextResponse.json({ success: false, error: 'الرجاء اختيار المرحلة الدراسية' }, { status: 400 });
        }
        const result = await prisma.attendance.deleteMany({
          where: {
            status: 'ABSENT',
            student: { academicStageId: stageId },
          },
        });
        count = result.count;
      } else if (scope === 'group') {
        if (!groupId) {
          return NextResponse.json({ success: false, error: 'الرجاء اختيار المجموعة' }, { status: 400 });
        }
        const result = await prisma.attendance.deleteMany({
          where: {
            status: 'ABSENT',
            student: { groupId: groupId },
          },
        });
        count = result.count;
      } else if (scope === 'student') {
        if (!studentId) {
          return NextResponse.json({ success: false, error: 'الرجاء اختيار الطالب' }, { status: 400 });
        }
        const result = await prisma.attendance.deleteMany({
          where: {
            status: 'ABSENT',
            studentId: studentId,
          },
        });
        count = result.count;
      } else {
        return NextResponse.json({ success: false, error: 'نطاق المسح المحدد غير صحيح' }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: `تم حذف ${count} من غيابات الطلاب بنجاح.` });
    }

    // 2. Delete Notifications (حذف الإشعارات)
    if (type === 'notifications') {
      if (password !== '147369258') {
        return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.' }, { status: 403 });
      }
      const result = await prisma.notification.deleteMany({});
      return NextResponse.json({ success: true, message: `تم حذف جميع الإشعارات بنجاح (العدد: ${result.count}).` });
    }

    // 3. Delete Booking Requests (حذف رسائل طلبات الحجز)
    if (type === 'registrations') {
      if (password !== '147369258') {
        return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.' }, { status: 403 });
      }

      const result = await prisma.registrationRequest.deleteMany({});
      return NextResponse.json({ success: true, message: `تم حذف جميع طلبات الحجز بنجاح (العدد: ${result.count}).` });
    }

    return NextResponse.json({ success: false, error: 'نوع العملية غير معروف' }, { status: 400 });
  } catch (e: any) {
    console.error('Error during data cleanup:', e);
    return NextResponse.json({ success: false, error: e.message || 'حدث خطأ أثناء مسح البيانات' }, { status: 500 });
  }
}
