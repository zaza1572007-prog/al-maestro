import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        academicStage: true,
        _count: { select: { students: true, lessonSessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, groups });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, academicStageId, year, scheduleDays, startTime, endTime, schedule, location } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'اسم المجموعة مطلوب' }, { status: 400 });
    }
    if (!academicStageId) {
      return NextResponse.json({ success: false, error: 'المرحلة الدراسية مطلوبة. يرجى إضافة مرحلة دراسية أولاً من شاشة المراحل.' }, { status: 400 });
    }

    // Verify the academicStageId exists
    const stage = await prisma.academicStage.findUnique({ where: { id: academicStageId } });
    if (!stage) {
      return NextResponse.json({ success: false, error: 'المرحلة الدراسية المحددة غير موجودة في قاعدة البيانات.' }, { status: 400 });
    }

    let finalSchedule: Array<{ day: string; startTime: string; endTime: string }> = [];
    let finalDays: string[] = [];
    let finalStart = startTime || '16:00';
    let finalEnd = endTime || '18:00';

    if (Array.isArray(schedule) && schedule.length > 0) {
      finalSchedule = schedule.map((s: any) => ({
        day: s.day?.trim() || 'السبت',
        startTime: s.startTime || '16:00',
        endTime: s.endTime || '18:00',
      }));
      finalDays = finalSchedule.map(s => s.day);
      finalStart = finalSchedule[0]?.startTime || finalStart;
      finalEnd = finalSchedule[0]?.endTime || finalEnd;
    } else {
      finalDays = parseScheduleDays(scheduleDays);
      if (finalDays.length === 0) {
        finalDays = ['السبت', 'الثلاثاء'];
      }
      finalSchedule = finalDays.map(day => ({
        day,
        startTime: finalStart,
        endTime: finalEnd,
      }));
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        academicStageId,
        year: year || '2025/2026',
        scheduleDays: finalDays,
        startTime: finalStart,
        endTime: finalEnd,
        schedule: finalSchedule,
        location,
      },
      include: {
        academicStage: true,
      }
    });
    return NextResponse.json({ success: true, group });
  } catch (e: any) {
    console.error('Create group error:', e);
    if (e.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'اسم المجموعة مسجل بالفعل. يرجى اختيار اسم مختلف.' }, { status: 400 });
    }
    if (e.code === 'P2003') {
      return NextResponse.json({ success: false, error: 'المرحلة الدراسية المحددة غير صالحة.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: e.message || 'حدث خطأ أثناء إنشاء المجموعة' }, { status: 500 });
  }
}

