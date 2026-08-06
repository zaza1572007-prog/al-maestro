import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncTodaySessionsState } from '@/lib/session-sync';

import { verifyStaff } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // 1. Sync session states first
    await syncTodaySessionsState();

    const egyptTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    const now = new Date(egyptTimeStr);

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

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Fetch all groups with their stage
    const allGroups = await prisma.group.findMany({
      include: {
        academicStage: true,
        students: {
          select: {
            id: true,
            name: true,
            code: true,
            academicStage: { select: { name: true } }
          }
        }
      }
    });

    // Fetch today's sessions
    const todaySessions = await prisma.lessonSession.findMany({
      where: {
        date: {
          gte: todayStart,
          lt: todayEnd
        }
      },
      include: {
        attendances: {
          include: {
            student: {
              select: { id: true, name: true, code: true }
            }
          }
        }
      }
    });

    // Today's groups: scheduled for today, or has a session today
    const groupsToday = allGroups.filter(g => {
      const isScheduledToday = g.scheduleDays.some(day => {
        const normalizedDay = day.replace(/[أإآا]/g, 'ا').trim();
        const normalizedToday = todayDayArabic.replace(/[أإآا]/g, 'ا').trim();
        return normalizedDay === normalizedToday;
      });
      const hasSessionToday = todaySessions.some(s => s.groupId === g.id);
      return isScheduledToday || hasSessionToday;
    });

    const results = await Promise.all(groupsToday.map(async (group) => {
      const session = todaySessions.find(s => s.groupId === group.id);
      
      let sessionStatus = 'NOT_STARTED'; // NOT_STARTED, OPEN, IN_PROGRESS, COMPLETED, etc.
      let sessionId = null;
      let attendancesList: any[] = [];
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      if (session) {
        sessionStatus = session.status;
        sessionId = session.id;
        attendancesList = session.attendances;

        presentCount = attendancesList.filter(a => a.status === 'PRESENT' || a.status === 'LEFT_EARLY').length;
        lateCount = attendancesList.filter(a => a.status === 'LATE').length;
        absentCount = attendancesList.filter(a => a.status === 'ABSENT').length;
      }

      // Map all students in this group to their attendance record if it exists
      const studentsSheet = group.students.map((student) => {
        const attendance = attendancesList.find(a => a.studentId === student.id);
        return {
          id: student.id,
          name: student.name,
          code: student.code,
          stageName: student.academicStage?.name,
          attended: !!attendance && attendance.status !== 'ABSENT',
          status: attendance ? attendance.status : (sessionStatus === 'COMPLETED' ? 'ABSENT' : ''),
          checkInTime: attendance?.checkInTime || null,
          checkOutTime: attendance?.checkOutTime || null,
          notes: attendance?.notes || ''
        };
      });

      return {
        id: group.id,
        name: group.name,
        stageName: group.academicStage?.name,
        startTime: group.startTime,
        endTime: group.endTime,
        sessionStatus,
        sessionId,
        stats: {
          present: presentCount + lateCount, // total present and late
          absent: sessionStatus === 'COMPLETED' ? absentCount : (group.students.length - (presentCount + lateCount)),
          total: group.students.length
        },
        students: studentsSheet
      };
    }));

    return NextResponse.json({ success: true, groups: results });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
