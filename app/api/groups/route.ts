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

export async function POST(req: Request) {
  try {
    const { name, academicStageId, year, scheduleDays, startTime, endTime, location } = await req.json();

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

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        academicStageId,
        year: year || '2025/2026',
        scheduleDays: parseScheduleDays(scheduleDays) || ['السبت', 'الثلاثاء'],
        startTime: startTime || '16:00',
        endTime: endTime || '18:00',
        location,
      },
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

