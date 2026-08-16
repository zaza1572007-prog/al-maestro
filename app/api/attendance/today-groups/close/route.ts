import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';
import { getGroupSlotForDay } from '@/lib/session-sync';

export async function POST(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'الرجاء تحديد معرف المجموعة' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return NextResponse.json({ success: false, error: 'المجموعة غير موجودة' }, { status: 404 });
    }

    // Get current date boundaries in Egypt timezone
    const egyptTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    const now = new Date(egyptTimeStr);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = weekdays[now.getDay()];
    const weekdaysArabic: Record<string, string> = {
      'Sunday': 'الأحد',
      'Monday': 'الاثنين',
      'Tuesday': 'الثلاثاء',
      'Wednesday': 'الأربعاء',
      'Thursday': 'الخميس',
      'Friday': 'الجمعة',
      'Saturday': 'السبت'
    };
    const todayDayArabic = weekdaysArabic[todayDay];
    const slot = getGroupSlotForDay(group, todayDayArabic);

    // Find if a session exists today
    let session = await prisma.lessonSession.findFirst({
      where: {
        groupId,
        date: {
          gte: todayStart,
          lt: todayEnd
        }
      }
    });

    if (session) {
      session = await prisma.lessonSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED' }
      });
    } else {
      // Create session as COMPLETED
      session = await prisma.lessonSession.create({
        data: {
          title: `جلسة ${group.name}`,
          groupId,
          date: new Date(egyptTimeStr),
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: 'COMPLETED',
          type: 'LECTURE'
        }
      });
    }

    // Find all students in this group
    const students = await prisma.student.findMany({
      where: { groupId }
    });

    // Find attended students for this session
    const attendedStudentIds = (await prisma.attendance.findMany({
      where: { sessionId: session.id },
      select: { studentId: true }
    })).map(a => a.studentId);

    // Fetch vacations for today
    const vacationsToday = await prisma.vacation.findMany({
      where: {
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    // Mark remaining students as ABSENT or VACATION
    for (const student of students) {
      if (!attendedStudentIds.includes(student.id)) {
        const isVac = vacationsToday.some((v) =>
          v.scope === 'all' ||
          (v.scope === 'stage' && student.academicStageId === v.academicStageId) ||
          (v.scope === 'group' && student.groupId === v.groupId) ||
          (v.scope === 'student' && student.id === v.studentId)
        );

        await prisma.attendance.create({
          data: {
            studentId: student.id,
            sessionId: session.id,
            status: isVac ? 'VACATION' : 'ABSENT',
            notes: isVac ? 'إجازة تلقائية' : 'غياب يدوي لإنهاء الحصة يدوياً'
          }
        });
      }
    }

    return NextResponse.json({ success: true, session });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
