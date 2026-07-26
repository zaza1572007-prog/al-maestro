import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sessions = await prisma.lessonSession.findMany({
      include: {
        group: { include: { academicStage: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ success: true, sessions });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, groupId, date, startTime, endTime, type, location } = await req.json();

    const session = await prisma.lessonSession.create({
      data: {
        title,
        groupId,
        date: new Date(date),
        startTime: startTime || '16:00',
        endTime: endTime || '18:00',
        type: type || 'LECTURE',
        status: 'SCHEDULED',
        location,
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
