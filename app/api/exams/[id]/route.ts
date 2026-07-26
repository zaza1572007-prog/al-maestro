import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, examDate, maxScore, type } = body;

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(examDate !== undefined && { examDate: new Date(examDate) }),
        ...(maxScore !== undefined && { maxScore: parseFloat(maxScore) }),
        ...(type !== undefined && { type }),
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
