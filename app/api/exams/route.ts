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
    const {
      title,
      description,
      groupId,
      examDate,
      type,
      maxScore,
      duration,
      isOnline,
      questions,
      shuffleQuestions,
      showAnswersAfterSubmit,
      isOpen,
      closesAt
    } = await req.json();

    const exam = await prisma.exam.create({
      data: {
        title: title?.trim(),
        description: description?.trim() || null,
        groupId,
        examDate: examDate ? new Date(examDate) : new Date(),
        type: type || 'QUIZ',
        maxScore: parseFloat(maxScore) || 100,
        duration: duration ? parseInt(duration) : null,
        isOnline: Boolean(isOnline),
        questions: questions || null,
        shuffleQuestions: shuffleQuestions !== undefined ? Boolean(shuffleQuestions) : true,
        showAnswersAfterSubmit: showAnswersAfterSubmit !== undefined ? Boolean(showAnswersAfterSubmit) : true,
        isOpen: isOpen !== undefined ? Boolean(isOpen) : true,
        closesAt: closesAt ? new Date(closesAt) : null,
      },
    });

    return NextResponse.json({ success: true, exam });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
