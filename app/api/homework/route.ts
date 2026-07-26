import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const homeworks = await prisma.homework.findMany({
      include: {
        group: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: 'desc' },
    });
    return NextResponse.json({ success: true, homeworks });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, description, groupId, dueDate, maxScore, isMandatory } = await req.json();

    const homework = await prisma.homework.create({
      data: {
        title,
        description,
        groupId,
        dueDate: new Date(dueDate),
        maxScore: parseFloat(maxScore) || 10,
        isMandatory: isMandatory ?? true,
      },
    });

    return NextResponse.json({ success: true, homework });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
