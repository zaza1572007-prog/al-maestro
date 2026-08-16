import { prisma } from './prisma';

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  let time = timeStr.trim();
  let isPM = false;
  if (time.toLowerCase().endsWith('pm')) {
    isPM = true;
    time = time.slice(0, -2).trim();
  } else if (time.toLowerCase().endsWith('am')) {
    time = time.slice(0, -2).trim();
  }
  const parts = time.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function getGroupSlotForDay(group: any, todayDayArabic: string): { startTime: string; endTime: string } {
  if (Array.isArray(group.schedule) && group.schedule.length > 0) {
    const normToday = todayDayArabic.replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').trim();
    const match = group.schedule.find((s: any) => {
      const normDay = (s.day || '').replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').trim();
      return normDay === normToday || normDay.includes(normToday) || normToday.includes(normDay);
    });
    if (match && match.startTime && match.endTime) {
      return { startTime: match.startTime, endTime: match.endTime };
    }
  }
  return { startTime: group.startTime || '16:00', endTime: group.endTime || '18:00' };
}

export async function syncTodaySessionsState() {
  // Use Africa/Cairo time zone to ensure the date and time align with Egypt local time
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

  // Get start and end of "today" in Cairo local time
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // Fetch all groups
  const allGroups = await prisma.group.findMany({
    include: { academicStage: true }
  });

  // Filter groups scheduled for today
  const groupsToday = allGroups.filter(g => {
    return g.scheduleDays.some(day => {
      const normalizedDay = day.replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').trim();
      const normalizedToday = todayDayArabic.replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').trim();
      return normalizedDay === normalizedToday || normalizedDay.includes(normalizedToday) || normalizedToday.includes(normalizedDay);
    });
  });

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Fetch all sessions created for today (local Cairo date)
  const todaySessions = await prisma.lessonSession.findMany({
    where: {
      date: {
        gte: todayStart,
        lt: todayEnd
      }
    }
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

  for (const group of groupsToday) {
    const slot = getGroupSlotForDay(group, todayDayArabic);
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);

    const session = todaySessions.find(s => s.groupId === group.id);
    const isGroupVacation = vacationsToday.some(v =>
      v.scope === 'all' ||
      (v.scope === 'stage' && v.academicStageId === group.academicStageId) ||
      (v.scope === 'group' && v.groupId === group.id)
    );

    // Case A: The current time is within class time
    if (currentMinutes >= start && currentMinutes < end) {
      if (!session) {
        // Auto-create session as OPEN (with vacation name if applicable)
        await prisma.lessonSession.create({
          data: {
            title: isGroupVacation ? `إجازة - ${group.name}` : `جلسة ${group.name}`,
            groupId: group.id,
            date: new Date(egyptTimeStr), // save in database using correct current time
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'OPEN',
            type: 'LECTURE',
          }
        });
      } else if (session.status === 'SCHEDULED') {
        // Automatically open it
        await prisma.lessonSession.update({
          where: { id: session.id },
          data: { 
            status: 'OPEN',
            ...(isGroupVacation && { title: `إجازة - ${group.name}` })
          }
        });
      }
    }
    // Case B: The current time is PAST the class end time
    else if (currentMinutes >= end) {
      if (!session) {
        // Session never created but the scheduled time has passed. Create as COMPLETED and mark all as ABSENT or VACATION.
        const newSession = await prisma.lessonSession.create({
          data: {
            title: isGroupVacation ? `إجازة - ${group.name}` : `جلسة ${group.name}`,
            groupId: group.id,
            date: new Date(egyptTimeStr),
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'COMPLETED',
            type: 'LECTURE',
          }
        });

        const students = await prisma.student.findMany({ where: { groupId: group.id } });
        for (const student of students) {
          const isStudentVacation = isGroupVacation || vacationsToday.some(v =>
            v.scope === 'student' && v.studentId === student.id
          );

          await prisma.attendance.create({
            data: {
              studentId: student.id,
              sessionId: newSession.id,
              status: isStudentVacation ? 'VACATION' : 'ABSENT',
              notes: isStudentVacation ? 'إجازة تلقائية' : 'غياب تلقائي لانتهاء وقت الحصة'
            }
          });
        }
      } else if (session.status === 'OPEN' || session.status === 'IN_PROGRESS' || session.status === 'SCHEDULED') {
        // Close session
        await prisma.lessonSession.update({
          where: { id: session.id },
          data: { 
            status: 'COMPLETED',
            ...(isGroupVacation && { title: `إجازة - ${group.name}` })
          }
        });

        const students = await prisma.student.findMany({ where: { groupId: group.id } });
        const attendedStudentIds = (await prisma.attendance.findMany({
          where: { sessionId: session.id },
          select: { studentId: true }
        })).map(a => a.studentId);

        for (const student of students) {
          if (!attendedStudentIds.includes(student.id)) {
            const isStudentVacation = isGroupVacation || vacationsToday.some(v =>
              v.scope === 'student' && v.studentId === student.id
            );

            await prisma.attendance.create({
              data: {
                studentId: student.id,
                sessionId: session.id,
                status: isStudentVacation ? 'VACATION' : 'ABSENT',
                notes: isStudentVacation ? 'إجازة تلقائية' : 'غياب تلقائي لانتهاء وقت الحصة'
              }
            });
          }
        }
      }
    }
  }

  // Also check if any session created for other groups today is open but past its endTime
  const activeSessions = todaySessions.filter(s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED');
  for (const session of activeSessions) {
    const end = parseTimeToMinutes(session.endTime);
    if (currentMinutes >= end) {
      const group = allGroups.find(g => g.id === session.groupId);
      const isGroupVacation = group ? vacationsToday.some(v =>
        v.scope === 'all' ||
        (v.scope === 'stage' && v.academicStageId === group.academicStageId) ||
        (v.scope === 'group' && v.groupId === group.id)
      ) : false;

      // Close session
      await prisma.lessonSession.update({
        where: { id: session.id },
        data: { 
          status: 'COMPLETED',
          ...(isGroupVacation && group && { title: `إجازة - ${group.name}` })
        }
      });

      const students = await prisma.student.findMany({ where: { groupId: session.groupId } });
      const attendedStudentIds = (await prisma.attendance.findMany({
        where: { sessionId: session.id },
        select: { studentId: true }
      })).map(a => a.studentId);

      for (const student of students) {
        if (!attendedStudentIds.includes(student.id)) {
          const isStudentVacation = isGroupVacation || vacationsToday.some(v =>
            v.scope === 'student' && v.studentId === student.id
          );

          await prisma.attendance.create({
            data: {
              studentId: student.id,
              sessionId: session.id,
              status: isStudentVacation ? 'VACATION' : 'ABSENT',
              notes: isStudentVacation ? 'إجازة تلقائية' : 'غياب تلقائي لانتهاء وقت الحصة'
            }
          });
        }
      }
    }
  }
}
