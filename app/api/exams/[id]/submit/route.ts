import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'هذا الاختبار مخصص للطلاب فقط' }, { status: 403 });
    }

    const studentId = payload.userId;
    const { id: examId } = await params;
    const body = await req.json();
    const { answers = {}, startedAt, timeSpentSeconds } = body;

    // Fetch exam with questions
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: 'الاختبار غير موجود' }, { status: 404 });
    }

    if (!exam.isOpen) {
      return NextResponse.json({ success: false, error: 'هذا الاختبار مغلق حالياً من قبل الأستاذ' }, { status: 400 });
    }

    if (exam.closesAt && new Date() > new Date(exam.closesAt)) {
      return NextResponse.json({ success: false, error: 'انتهت المهلة المحددة لهذا الاختبار' }, { status: 400 });
    }

    const questions = Array.isArray(exam.questions) ? (exam.questions as any[]) : [];
    if (questions.length === 0) {
      return NextResponse.json({ success: false, error: 'لا توجد أسئلة محددة لهذا الاختبار' }, { status: 400 });
    }

    // Auto-grade logic
    let totalMaxPoints = 0;
    let totalEarnedPoints = 0;
    const questionReview: any[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = q.id || String(i);
      const qPoints = Number(q.points) || 1;
      totalMaxPoints += qPoints;

      const studentAns = answers[qId] !== undefined ? String(answers[qId]) : null;
      const correctAns = String(q.correctAnswer);

      const isCorrect = studentAns !== null && studentAns.trim() === correctAns.trim();
      if (isCorrect) {
        totalEarnedPoints += qPoints;
      }

      questionReview.push({
        id: qId,
        questionText: q.text || q.questionText,
        type: q.type,
        options: q.options || [],
        studentAnswer: studentAns,
        correctAnswer: correctAns,
        isCorrect,
        points: qPoints,
        explanation: q.explanation || null,
      });
    }

    const percentage = totalMaxPoints > 0 ? (totalEarnedPoints / totalMaxPoints) * 100 : 0;
    const finalScore = exam.maxScore ? (percentage / 100) * exam.maxScore : totalEarnedPoints;

    // Upsert ExamResult in DB
    const examResult = await prisma.examResult.upsert({
      where: {
        studentId_examId: {
          studentId,
          examId,
        }
      },
      create: {
        examId,
        studentId,
        score: Math.round(finalScore * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        answers: answers,
        startedAt: startedAt ? new Date(startedAt) : null,
        timeSpentSeconds: timeSpentSeconds ? parseInt(timeSpentSeconds) : null,
        isAutoGraded: true,
        gradedAt: new Date(),
      },
      update: {
        score: Math.round(finalScore * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        answers: answers,
        startedAt: startedAt ? new Date(startedAt) : undefined,
        timeSpentSeconds: timeSpentSeconds ? parseInt(timeSpentSeconds) : undefined,
        isAutoGraded: true,
        gradedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تم تسليم الاختبار وتصحيحه تلقائياً بنجاح 🎉',
      result: {
        score: examResult.score,
        maxScore: exam.maxScore,
        percentage: examResult.percentage,
        earnedPoints: totalEarnedPoints,
        totalPoints: totalMaxPoints,
        timeSpentSeconds: examResult.timeSpentSeconds,
        showAnswers: exam.showAnswersAfterSubmit,
        review: exam.showAnswersAfterSubmit ? questionReview : null,
      }
    });
  } catch (error: any) {
    console.error('Error auto-grading quiz:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
