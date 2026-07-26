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

export async function POST(req: Request) {
  try {
    const { name, academicStageId, year, scheduleDays, startTime, endTime, location } = await req.json();
    const group = await prisma.group.create({
      data: {
        name,
        academicStageId,
        year: year || '2025/2026',
        scheduleDays: scheduleDays || ['Saturday', 'Tuesday'],
        startTime: startTime || '16:00',
        endTime: endTime || '18:00',
        location,
      },
    });
    return NextResponse.json({ success: true, group });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
