import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        group: {
          include: {
            academicStage: true,
            _count: { select: { students: true } },
          },
        },
        results: {
          include: { student: true },
        },
      },
      orderBy: { examDate: 'desc' },
    });
    return NextResponse.json({ success: true, exams });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, description, groupId, examDate, type, maxScore } = await req.json();

    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        groupId,
        examDate: new Date(examDate),
        type: type || 'QUIZ',
        maxScore: parseFloat(maxScore) || 100,
      },
    });

    return NextResponse.json({ success: true, exam });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
