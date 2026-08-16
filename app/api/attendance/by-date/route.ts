import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';
import { getGroupSlotForDay } from '@/lib/session-sync';

export async function GET(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD

    if (!dateParam) {
      return NextResponse.json({ success: false, error: 'الرجاء تحديد التاريخ' }, { status: 400 });
    }

    // Parse date in Egypt timezone
    const [year, month, day] = dateParam.split('-').map(Number);
    const dateStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

    // Weekday for that date
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdaysArabic: Record<string, string> = {
      Sunday: 'الأحد',
      Monday: 'الاثنين',
      Tuesday: 'الثلاثاء',
      Wednesday: 'الأربعاء',
      Thursday: 'الخميس',
      Friday: 'الجمعة',
      Saturday: 'السبت',
    };
    const dayOfWeek = weekdays[dateStart.getDay()];
    const dayArabic = weekdaysArabic[dayOfWeek];

    // Fetch sessions for that date
    const sessions = await prisma.lessonSession.findMany({
      where: {
        date: {
          gte: dateStart,
          lt: dateEnd,
        },
      },
      include: {
        attendances: {
          include: {
            student: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (sessions.length === 0) {
      return NextResponse.json({ success: true, groups: [], date: dateParam });
    }

    // Collect group IDs from sessions
    const groupIds = [...new Set(sessions.map((s) => s.groupId))];

    // Fetch all those groups
    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds } },
      include: {
        academicStage: true,
        students: {
          select: {
            id: true,
            name: true,
            code: true,
            academicStageId: true,
            groupId: true,
            phone: true,
            academicStage: { select: { name: true } },
            parent: {
              select: { name: true, phone: true, whatsapp: true },
            },
          },
        },
      },
    });

    // Fetch vacations for that date
    const vacations = await prisma.vacation.findMany({
      where: {
        date: {
          gte: dateStart,
          lt: dateEnd,
        },
      },
    });

    const results = groups.map((group) => {
      const session = sessions.find((s) => s.groupId === group.id);
      const slot = getGroupSlotForDay(group, dayArabic);

      let sessionStatus = 'NOT_STARTED';
      let sessionId: string | null = null;
      let attendancesList: any[] = [];
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      if (session) {
        sessionStatus = session.status;
        sessionId = session.id;
        attendancesList = session.attendances;

        presentCount = attendancesList.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LEFT_EARLY'
        ).length;
        lateCount = attendancesList.filter((a) => a.status === 'LATE').length;
        absentCount = attendancesList.filter((a) => a.status === 'ABSENT').length;
      }

      const studentsSheet = group.students.map((student) => {
        const attendance = attendancesList.find((a) => a.studentId === student.id);
        const isVacation = vacations.some(
          (v) =>
            v.scope === 'all' ||
            (v.scope === 'stage' && v.academicStageId === student.academicStageId) ||
            (v.scope === 'group' && v.groupId === student.groupId) ||
            (v.scope === 'student' && v.studentId === student.id)
        );

        let status = '';
        if (attendance) {
          status = attendance.status;
        } else if (isVacation) {
          status = 'VACATION';
        } else if (sessionStatus === 'COMPLETED') {
          status = 'ABSENT';
        }

        return {
          id: student.id,
          name: student.name,
          code: student.code,
          phone: student.phone,
          parent: student.parent,
          stageName: student.academicStage?.name,
          attended:
            !!attendance &&
            attendance.status !== 'ABSENT' &&
            attendance.status !== 'VACATION',
          status,
          checkInTime: attendance?.checkInTime || null,
          checkOutTime: attendance?.checkOutTime || null,
          notes:
            attendance?.notes || (isVacation && !attendance ? 'إجازة' : ''),
        };
      });

      const vacationCount = studentsSheet.filter((s) => s.status === 'VACATION').length;

      return {
        id: group.id,
        name: group.name,
        stageName: group.academicStage?.name,
        startTime: session?.startTime || slot.startTime,
        endTime: session?.endTime || slot.endTime,
        sessionStatus,
        sessionId,
        stats: {
          present: presentCount + lateCount,
          absent:
            sessionStatus === 'COMPLETED'
              ? absentCount
              : group.students.length - (presentCount + lateCount + vacationCount),
          total: group.students.length,
        },
        students: studentsSheet,
      };
    });

    return NextResponse.json({ success: true, groups: results, date: dateParam });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
