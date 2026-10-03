import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
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
            _count: { select: { students: true } }
          }
        },
        results: {
          include: {
            student: {
              select: { id: true, name: true, code: true, phone: true }
            }
          },
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: 'الامتحان غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, exam });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      description,
      examDate,
      maxScore,
      type,
      duration,
      isOnline,
      questions,
      shuffleQuestions,
      showAnswersAfterSubmit,
      isOpen,
      closesAt
    } = body;

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(examDate !== undefined && { examDate: new Date(examDate) }),
        ...(maxScore !== undefined && { maxScore: parseFloat(maxScore) }),
        ...(type !== undefined && { type }),
        ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
        ...(isOnline !== undefined && { isOnline: Boolean(isOnline) }),
        ...(questions !== undefined && { questions }),
        ...(shuffleQuestions !== undefined && { shuffleQuestions: Boolean(shuffleQuestions) }),
        ...(showAnswersAfterSubmit !== undefined && { showAnswersAfterSubmit: Boolean(showAnswersAfterSubmit) }),
        ...(isOpen !== undefined && { isOpen: Boolean(isOpen) }),
        ...(closesAt !== undefined && { closesAt: closesAt ? new Date(closesAt) : null }),
      },
      include: { group: true, _count: { select: { results: true } } },
    });

    return NextResponse.json({ success: true, exam });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.examResult.deleteMany({ where: { examId: id } });
    await prisma.exam.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
