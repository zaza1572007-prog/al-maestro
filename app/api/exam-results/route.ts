import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List exam results (optionally by examId)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');
    const studentId = searchParams.get('studentId');

    const where: any = {};
    if (examId) where.examId = examId;
    if (studentId) where.studentId = studentId;

    const results = await prisma.examResult.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, code: true } },
        exam: { select: { id: true, title: true, maxScore: true } },
      },
      orderBy: { gradedAt: 'desc' },
    });

    return NextResponse.json({ success: true, results });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST - Create or update an exam result for a student
export async function POST(req: Request) {
  try {
    const { examId, studentId, score, notes } = await req.json();

    if (!examId || !studentId) {
      return NextResponse.json({ success: false, error: 'examId و studentId مطلوبان' }, { status: 400 });
    }

    // Fetch exam to get maxScore
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      return NextResponse.json({ success: false, error: 'الامتحان غير موجود' }, { status: 404 });
    }

    const numScore = parseFloat(score);
    const percentage = exam.maxScore > 0 ? (numScore / exam.maxScore) * 100 : 0;

    // Upsert: update if exists, create if not
    const existing = await prisma.examResult.findFirst({ where: { examId, studentId } });

    let result;
    if (existing) {
      result = await prisma.examResult.update({
        where: { id: existing.id },
        data: {
          score: numScore,
          percentage,
          notes: notes || null,
          gradedAt: new Date(),
        },
        include: { student: true },
      });
    } else {
      result = await prisma.examResult.create({
        data: {
          examId,
          studentId,
          score: numScore,
          percentage,
          notes: notes || null,
          gradedAt: new Date(),
        },
        include: { student: true },
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
