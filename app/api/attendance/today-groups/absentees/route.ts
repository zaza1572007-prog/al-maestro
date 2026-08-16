import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'الرجاء تحديد المجموعة' }, { status: 400 });
    }

    // Egypt Date boundaries
    const egyptTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    const now = new Date(egyptTimeStr);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const session = await prisma.lessonSession.findFirst({
      where: {
        groupId,
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    // Fetch vacations for today
    const vacationsToday = await prisma.vacation.findMany({
      where: {
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    const students = await prisma.student.findMany({
      where: { groupId },
      select: {
        id: true,
        name: true,
        code: true,
        phone: true,
        academicStageId: true,
        groupId: true,
        parent: {
          select: {
            name: true,
            phone: true,
            whatsapp: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Exclude students who are on vacation today
    const activeStudents = students.filter((student) => {
      const isVac = vacationsToday.some((v) =>
        v.scope === 'all' ||
        (v.scope === 'stage' && student.academicStageId === v.academicStageId) ||
        (v.scope === 'group' && student.groupId === v.groupId) ||
        (v.scope === 'student' && student.id === v.studentId)
      );
      return !isVac;
    });

    if (!session) {
      // If no session is open yet today, all students are not checked in
      return NextResponse.json({
        success: true,
        absentees: activeStudents,
        sessionId: null,
      });
    }

    // Get attendance records for today's session
    const attendanceRecords = await prisma.attendance.findMany({
      where: { sessionId: session.id },
      select: {
        studentId: true,
        status: true,
      },
    });

    const attendedStudentIds = attendanceRecords
      .filter((r) => r.status !== 'ABSENT' && r.status !== 'VACATION')
      .map((r) => r.studentId);

    const absentees = activeStudents.filter((s) => !attendedStudentIds.includes(s.id));

    return NextResponse.json({
      success: true,
      absentees,
      sessionId: session.id,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
