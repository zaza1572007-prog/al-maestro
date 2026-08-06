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
    text = daysInput.join(' ');
  } else if (typeof daysInput === 'string') {
    text = daysInput;
  } else {
    return [];
  }
  
  const possibleDays = [
    { key: 'السبت', patterns: [/السبت/] },
    { key: 'الأحد', patterns: [/الأحد/, /الاحد/] },
    { key: 'الاثنين', patterns: [/الاثنين/, /الإثنين/] },
    { key: 'الثلاثاء', patterns: [/الثلاثاء/] },
    { key: 'الأربعاء', patterns: [/الأربعاء/, /الاربعاء/] },
    { key: 'الخميس', patterns: [/الخميس/] },
    { key: 'الجمعة', patterns: [/الجمعة/] },
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
      assistantId,
      location,
      description,
    } = body;

    const group = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(academicStageId && { academicStageId }),
        ...(year && { year }),
        ...(scheduleDays && { scheduleDays: parseScheduleDays(scheduleDays) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
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
    const { name, days, scheduleDays, time, startTime, endTime, room, location, price, maxStudents } = body;

    // Normalizing scheduleDays
    const finalScheduleDays = parseScheduleDays(scheduleDays || days);

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

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(finalScheduleDays && finalScheduleDays.length > 0 && { scheduleDays: finalScheduleDays }),
        ...(finalStartTime && { startTime: finalStartTime }),
        ...(finalEndTime && { endTime: finalEndTime }),
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
