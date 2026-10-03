import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            academicStage: true,
            students: {
              where: { isDeleted: false },
              select: {
                id: true,
                name: true,
                code: true,
              },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: 'الامتحان غير موجود' }, { status: 404 });
    }

    if (!exam.isOnline) {
      return NextResponse.json(
        { success: false, error: 'هذا الامتحان ورقي ولا يتوفر له رابط إلكتروني' },
        { status: 400 }
      );
    }

    if (!exam.isOpen) {
      return NextResponse.json(
        { success: false, error: 'هذا الكويز مغلق حالياً من قبل المعلم' },
        { status: 403 }
      );
    }

    const questionsList = Array.isArray(exam.questions) ? exam.questions : [];

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        examDate: exam.examDate,
        duration: exam.duration || 15,
        maxScore: exam.maxScore,
        questionsCount: questionsList.length,
        isOpen: exam.isOpen,
        group: {
          id: exam.group.id,
          name: exam.group.name,
          stageName: exam.group.academicStage?.name || '',
        },
        students: exam.group.students.map((s) => ({
          id: s.id,
          name: s.name,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching public quiz:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تحميل بيانات الكويز' },
      { status: 500 }
    );
  }
}
