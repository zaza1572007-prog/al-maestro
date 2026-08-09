import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET - Fetch a single group by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        academicStage: true,
        assistant: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        students: {
          include: {
            parent: true,
          },
        },
        lessonSessions: {
          orderBy: {
            date: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            students: true,
            lessonSessions: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function parseScheduleDays(daysInput: any): string[] {
  if (!daysInput) return [];
  
  let text = '';
  if (Array.isArray(daysInput)) {
    text = daysInput.map((d: any) => (typeof d === 'object' && d ? d.day : d)).join(' ');
  } else if (typeof daysInput === 'string') {
    text = daysInput;
  } else {
    return [];
  }
  
  const possibleDays = [
    { key: 'السبت', patterns: [/السبت/] },
    { key: 'الأحد', patterns: [/الأحد/, /الاحد/, /الحد/] },
    { key: 'الاثنين', patterns: [/الاثنين/, /الإثنين/, /الاتنين/] },
    { key: 'الثلاثاء', patterns: [/الثلاثاء/, /التلات/, /التلاتاء/] },
    { key: 'الأربعاء', patterns: [/الأربعاء/, /الاربعاء/, /الاربع/] },
    { key: 'الخميس', patterns: [/الخميس/] },
    { key: 'الجمعة', patterns: [/الجمعة/, /الجمعه/] },
  ];
  
  const matchedDays: string[] = [];
  for (const day of possibleDays) {
    if (day.patterns.some(pattern => pattern.test(text))) {
      matchedDays.push(day.key);
    }
  }
  return matchedDays;
}

function parseArabicTime(tStr: string): string | null {
  let clean = tStr.trim();
  let isPM = false;
  if (clean.includes('م') || clean.toLowerCase().includes('pm')) {
    isPM = true;
  }
  clean = clean.replace(/[مصبأإآاam/pm]/gi, '').trim();
  const parts = clean.split(':');
  if (parts.length >= 1) {
    let h = parseInt(parts[0], 10);
    const m = parts[1] ? parts[1].trim() : '00';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return null;
}

// PUT - Update a group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      academicStageId,
      year,
      scheduleDays,
      startTime,
      endTime,
      schedule,
      assistantId,
      location,
      description,
    } = body;

    let finalSchedule = schedule;
    let finalDays = scheduleDays ? parseScheduleDays(scheduleDays) : undefined;
    let finalStart = startTime;
    let finalEnd = endTime;

    if (Array.isArray(schedule) && schedule.length > 0) {
      finalSchedule = schedule.map((s: any) => ({
        day: s.day?.trim() || 'السبت',
        startTime: s.startTime || '16:00',
        endTime: s.endTime || '18:00',
      }));
      finalDays = finalSchedule.map((s: any) => s.day);
      finalStart = finalSchedule[0]?.startTime || finalStart;
      finalEnd = finalSchedule[0]?.endTime || finalEnd;
    } else if (finalDays && finalDays.length > 0 && finalStart && finalEnd) {
      finalSchedule = finalDays.map(day => ({
        day,
        startTime: finalStart,
        endTime: finalEnd,
      }));
    }

    const group = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(academicStageId && { academicStageId }),
        ...(year && { year }),
        ...(finalDays && { scheduleDays: finalDays }),
        ...(finalStart && { startTime: finalStart }),
        ...(finalEnd && { endTime: finalEnd }),
        ...(finalSchedule !== undefined && { schedule: finalSchedule }),
        ...(assistantId !== undefined && { assistantId }),
        ...(location !== undefined && { location }),
        ...(description !== undefined && { description }),
      },
      include: {
        academicStage: true,
        assistant: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a group
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, days, scheduleDays, time, startTime, endTime, schedule, room, location, price, maxStudents } = body;

    let finalSchedule = schedule;
    let finalScheduleDays = parseScheduleDays(scheduleDays || days);

    // Parse time string fallback
    let finalStartTime = startTime;
    let finalEndTime = endTime;
    if (!finalStartTime && !finalEndTime && time && typeof time === 'string') {
      const timeParts = time.split(/[-–—]+/);
      if (timeParts.length === 2) {
        const st = parseArabicTime(timeParts[0]);
        const et = parseArabicTime(timeParts[1]);
        if (st) finalStartTime = st;
        if (et) finalEndTime = et;
      }
    }

    if (Array.isArray(schedule) && schedule.length > 0) {
      finalSchedule = schedule.map((s: any) => ({
        day: s.day?.trim() || 'السبت',
        startTime: s.startTime || '16:00',
        endTime: s.endTime || '18:00',
      }));
      finalScheduleDays = finalSchedule.map((s: any) => s.day);
      finalStartTime = finalSchedule[0]?.startTime || finalStartTime;
      finalEndTime = finalSchedule[0]?.endTime || finalEndTime;
    } else if (finalScheduleDays && finalScheduleDays.length > 0 && finalStartTime && finalEndTime) {
      finalSchedule = finalScheduleDays.map(day => ({
        day,
        startTime: finalStartTime,
        endTime: finalEndTime,
      }));
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(finalScheduleDays && finalScheduleDays.length > 0 && { scheduleDays: finalScheduleDays }),
        ...(finalStartTime && { startTime: finalStartTime }),
        ...(finalEndTime && { endTime: finalEndTime }),
        ...(finalSchedule !== undefined && { schedule: finalSchedule }),
        ...( (room || location) && { location: room || location }),
        ...(maxStudents && { maxCapacity: parseInt(maxStudents, 10) }),
      },
    });

    return NextResponse.json({ success: true, group: updatedGroup });
  } catch (error: any) {
    console.error('Error in PATCH group:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}



// DELETE - Delete a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if group has students
    const studentCount = await prisma.student.count({ where: { groupId: id } });
    if (studentCount > 0) {
      return NextResponse.json({
        success: false,
        error: `لا يمكن حذف المجموعة لأنها تحتوي على ${studentCount} طالب. انقل الطلاب أولاً.`,
      }, { status: 400 });
    }

    // Cascade delete: attendance → sessions, submissions → homework, results → exams, subscriptions
    const sessions = await prisma.lessonSession.findMany({ where: { groupId: id }, select: { id: true } });
    await prisma.attendance.deleteMany({ where: { sessionId: { in: sessions.map(s => s.id) } } });
    await prisma.lessonSession.deleteMany({ where: { groupId: id } });

    const homeworks = await prisma.homework.findMany({ where: { groupId: id }, select: { id: true } });
    await prisma.homeworkSubmission.deleteMany({ where: { homeworkId: { in: homeworks.map(h => h.id) } } });
    await prisma.homework.deleteMany({ where: { groupId: id } });

    const exams = await prisma.exam.findMany({ where: { groupId: id }, select: { id: true } });
    await prisma.examResult.deleteMany({ where: { examId: { in: exams.map(e => e.id) } } });
    await prisma.exam.deleteMany({ where: { groupId: id } });

    await prisma.payment.deleteMany({ where: { subscription: { groupId: id } } });
    await prisma.subscription.deleteMany({ where: { groupId: id } });
    await prisma.group.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
