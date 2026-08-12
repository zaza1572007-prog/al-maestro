import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const stageId = searchParams.get('stageId') || undefined;
    const groupId = searchParams.get('groupId') || undefined;
    const search = searchParams.get('search') || undefined;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0);
    const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const startOfPrevMonth = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0);
    const endOfPrevMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // Arabic weekday mapping helper
    const getArabicDayName = (date: Date) => {
      return new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date);
    };

    if (studentId) {
      // Fetch details for a single student
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          academicStage: true,
          group: true,
          parent: true,
          attendances: {
            include: {
              session: true,
            },
            orderBy: {
              session: { date: 'desc' },
            },
          },
          examResults: {
            include: {
              exam: true,
            },
            orderBy: {
              exam: { examDate: 'desc' },
            },
          },
          subscriptions: {
            include: {
              payments: true,
            },
            orderBy: {
              endDate: 'desc',
            },
          },
        },
      });

      if (!student) {
        return NextResponse.json({ success: false, error: 'الطالب غير موجود' }, { status: 404 });
      }

      // Map absences specifically
      const absences = student.attendances
        .filter((a) => a.status === 'ABSENT')
        .map((a) => {
          const date = new Date(a.session.date);
          return {
            id: a.id,
            date: date.toISOString().split('T')[0],
            day: getArabicDayName(date),
            sessionTitle: a.session.title,
          };
        });

      return NextResponse.json({
        success: true,
        student: {
          id: student.id,
          code: student.code,
          name: student.name,
          phone: student.phone,
          stageName: student.academicStage?.name,
          groupName: student.group?.name,
          parentName: student.parent?.name,
          parentPhone: student.parent?.phone,
        },
        attendances: student.attendances.map((a) => ({
          id: a.id,
          status: a.status,
          date: new Date(a.session.date).toISOString().split('T')[0],
          day: getArabicDayName(new Date(a.session.date)),
          sessionTitle: a.session.title,
        })),
        absences,
        exams: student.examResults.map((r) => ({
          id: r.id,
          title: r.exam.title,
          type: r.exam.type,
          date: new Date(r.exam.examDate).toISOString().split('T')[0],
          score: r.score,
          maxScore: r.exam.maxScore,
          percentage: r.percentage,
          notes: r.notes,
        })),
        subscriptions: student.subscriptions.map((s) => {
          const paid = s.payments.reduce((sum, p) => sum + p.paidAmount, 0);
          return {
            id: s.id,
            groupName: student.group?.name,
            startDate: s.startDate.toISOString().split('T')[0],
            endDate: s.endDate.toISOString().split('T')[0],
            price: s.price,
            paidAmount: paid,
            status: s.status,
            isPaid: paid >= s.price || s.payments.some((p) => p.remainingAmount <= 0),
          };
        }),
      });
    }

    // Otherwise, fetch all students summary
    const where: any = {};
    if (groupId) where.groupId = groupId;
    if (stageId) where.academicStageId = stageId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        academicStage: true,
        group: true,
        attendances: {
          include: {
            session: true,
          },
        },
        examResults: {
          include: {
            exam: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const studentList = students.map((student) => {
      const attendances = student.attendances;
      const totalAtt = attendances.length;
      const presentCount = attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'LEFT_EARLY'
      ).length;
      const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;
      const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;

      // Filter absent days specifically
      const absentDays = attendances
        .filter((a) => a.status === 'ABSENT')
        .map((a) => {
          const date = new Date(a.session.date);
          return {
            date: date.toISOString().split('T')[0],
            day: getArabicDayName(date),
          };
        });

      // Calculate trend: compare current month average with previous month average
      const currentMonthResults = student.examResults.filter(
        (r) => r.exam.examDate >= startOfCurrentMonth && r.exam.examDate <= endOfCurrentMonth
      );
      const prevMonthResults = student.examResults.filter(
        (r) => r.exam.examDate >= startOfPrevMonth && r.exam.examDate <= endOfPrevMonth
      );

      const avgCurrent =
        currentMonthResults.length > 0
          ? currentMonthResults.reduce((sum, r) => sum + r.percentage, 0) / currentMonthResults.length
          : null;

      const avgPrev =
        prevMonthResults.length > 0
          ? prevMonthResults.reduce((sum, r) => sum + r.percentage, 0) / prevMonthResults.length
          : null;

      let trend = 'STABLE';
      if (avgCurrent !== null && avgPrev !== null) {
        if (avgCurrent > avgPrev) trend = 'UP';
        else if (avgCurrent < avgPrev) trend = 'DOWN';
      } else if (avgCurrent !== null && avgPrev === null) {
        trend = 'UP';
      } else if (avgCurrent === null && avgPrev !== null) {
        trend = 'DOWN';
      } else {
        trend = 'NONE';
      }

      // Latest 5 exams
      const latestExams = student.examResults
        .slice(-5)
        .map((r) => ({
          title: r.exam.title,
          type: r.exam.type,
          score: r.score,
          maxScore: r.exam.maxScore,
          percentage: r.percentage,
        }));

      return {
        id: student.id,
        code: student.code,
        name: student.name,
        stageName: student.academicStage?.name || '—',
        groupName: student.group?.name || '—',
        totalSessions: totalAtt,
        presentSessions: presentCount,
        absentSessions: absentCount,
        attendanceRate,
        absentDays,
        trend,
        latestExams,
        avgCurrent: avgCurrent ? Math.round(avgCurrent) : null,
        avgPrev: avgPrev ? Math.round(avgPrev) : null,
      };
    });

    return NextResponse.json({
      success: true,
      students: studentList,
    });
  } catch (error: any) {
    console.error('Error fetching student history:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
