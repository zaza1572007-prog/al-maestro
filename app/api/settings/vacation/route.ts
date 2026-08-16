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
    const { action, password, scope, stageId, groupId, studentId, date } = body;

    if (!action || !password || !scope || !date) {
      return NextResponse.json({ success: false, error: 'المدخلات غير كاملة' }, { status: 400 });
    }

    if (password !== '147369258') {
      return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.' }, { status: 403 });
    }

    const vacationDate = new Date(`${date}T00:00:00.000Z`);

    // Find affected students
    const studentWhere: any = {};
    if (scope === 'stage') {
      if (!stageId) return NextResponse.json({ success: false, error: 'الرجاء اختيار المرحلة الدراسية' }, { status: 400 });
      studentWhere.academicStageId = stageId;
    } else if (scope === 'group') {
      if (!groupId) return NextResponse.json({ success: false, error: 'الرجاء اختيار المجموعة' }, { status: 400 });
      studentWhere.groupId = groupId;
    } else if (scope === 'student') {
      if (!studentId) return NextResponse.json({ success: false, error: 'الرجاء اختيار الطالب' }, { status: 400 });
      studentWhere.id = studentId;
    }

    const affectedStudents = await prisma.student.findMany({
      where: studentWhere,
      select: { id: true },
    });
    const affectedStudentIds = affectedStudents.map(s => s.id);

    // Find sessions on this date (Egypt Cairo timezone check)
    const startOfSearch = new Date(new Date(`${date}T00:00:00.000Z`).getTime() - 24 * 60 * 60 * 1000);
    const endOfSearch = new Date(new Date(`${date}T23:59:59.999Z`).getTime() + 24 * 60 * 60 * 1000);

    const sessions = await prisma.lessonSession.findMany({
      where: {
        date: {
          gte: startOfSearch,
          lte: endOfSearch,
        },
      },
    });

    const daySessions = sessions.filter(s => {
      const sDateStr = new Date(s.date).toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
      const sDateFormatted = new Date(sDateStr).toISOString().split('T')[0];
      return sDateFormatted === date;
    });

    const sessionIds = daySessions.map(s => s.id);

    if (action === 'register') {
      // 1. Add Vacation record
      const existingVacation = await prisma.vacation.findFirst({
        where: {
          date: vacationDate,
          scope,
          academicStageId: scope === 'stage' ? stageId : null,
          groupId: scope === 'group' ? groupId : null,
          studentId: scope === 'student' ? studentId : null,
        },
      });

      if (!existingVacation) {
        await prisma.vacation.create({
          data: {
            date: vacationDate,
            scope,
            academicStageId: scope === 'stage' ? stageId : null,
            groupId: scope === 'group' ? groupId : null,
            studentId: scope === 'student' ? studentId : null,
          },
        });
      }

      // 2. Update existing attendance records & create missing ones
      let updatedCount = 0;
      if (sessionIds.length > 0 && affectedStudentIds.length > 0) {
        // Update existing ones
        const updateResult = await prisma.attendance.updateMany({
          where: {
            sessionId: { in: sessionIds },
            studentId: { in: affectedStudentIds },
          },
          data: {
            status: 'VACATION',
            notes: 'إجازة مسجلة',
          },
        });
        updatedCount += updateResult.count;

        // Create missing ones for these sessions
        for (const sessionId of sessionIds) {
          const existingAttendances = await prisma.attendance.findMany({
            where: { sessionId },
            select: { studentId: true },
          });
          const existingAttStudentIds = existingAttendances.map(a => a.studentId);
          const missingStudentIds = affectedStudentIds.filter(id => !existingAttStudentIds.includes(id));

          if (missingStudentIds.length > 0) {
            const createResult = await prisma.attendance.createMany({
              data: missingStudentIds.map(sId => ({
                studentId: sId,
                sessionId,
                status: 'VACATION',
                notes: 'إجازة مسجلة',
              })),
            });
            updatedCount += createResult.count;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `تم تسجيل الإجازة بنجاح وتحديث ${updatedCount} من سجلات الحضور.`,
      });

    } else if (action === 'cancel') {
      // 1. Delete Vacation record
      await prisma.vacation.deleteMany({
        where: {
          date: vacationDate,
          scope,
          academicStageId: scope === 'stage' ? stageId : null,
          groupId: scope === 'group' ? groupId : null,
          studentId: scope === 'student' ? studentId : null,
        },
      });

      // 2. Revert Attendance records status from VACATION to ABSENT
      let revertedCount = 0;
      if (sessionIds.length > 0 && affectedStudentIds.length > 0) {
        const revertResult = await prisma.attendance.updateMany({
          where: {
            sessionId: { in: sessionIds },
            studentId: { in: affectedStudentIds },
            status: 'VACATION',
          },
          data: {
            status: 'ABSENT',
            notes: 'تم إلغاء الإجازة وإعادة التعيين لغياب',
          },
        });
        revertedCount = revertResult.count;
      }

      return NextResponse.json({
        success: true,
        message: `تم إلغاء الإجازة بنجاح وإعادة تعيين ${revertedCount} من سجلات الحضور إلى غياب.`,
      });
    }

    return NextResponse.json({ success: false, error: 'الإجراء المطلوب غير معروف' }, { status: 400 });
  } catch (e: any) {
    console.error('Error in vacation route:', e);
    return NextResponse.json({ success: false, error: e.message || 'حدث خطأ أثناء معالجة طلب الإجازة' }, { status: 500 });
  }
}
