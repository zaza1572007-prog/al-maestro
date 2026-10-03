import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = payload.userId;
    const { id: examId } = await params;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        results: {
          where: { studentId },
        }
      }
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: 'الاختبار غير موجود' }, { status: 404 });
    }

    const myResult = exam.results?.[0] || null;
    const questionsRaw = Array.isArray(exam.questions) ? (exam.questions as any[]) : [];

    // If student has already completed the quiz:
    if (myResult) {
      let review = null;
      if (exam.showAnswersAfterSubmit) {
        const studentAnswers = (myResult.answers || {}) as Record<string, any>;
        review = questionsRaw.map((q, idx) => {
          const qId = q.id || String(idx);
          const studentAns = studentAnswers[qId] !== undefined ? String(studentAnswers[qId]) : null;
          const correctAns = String(q.correctAnswer);
          return {
            id: qId,
            questionText: q.questionText || q.text,
            type: q.type,
            options: q.options || [],
            studentAnswer: studentAns,
            correctAnswer: correctAns,
            isCorrect: studentAns !== null && studentAns.trim() === correctAns.trim(),
            points: q.points || 1,
            explanation: q.explanation || null,
          };
        });
      }

      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        exam: {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          maxScore: exam.maxScore,
          duration: exam.duration || 15,
          showAnswers: exam.showAnswersAfterSubmit,
        },
        result: {
          score: myResult.score,
          maxScore: exam.maxScore,
          percentage: Math.round(myResult.percentage),
          timeSpentSeconds: myResult.timeSpentSeconds,
          gradedAt: myResult.gradedAt,
          review,
        }
      });
    }

    // Check if open
    if (!exam.isOpen) {
      return NextResponse.json({ success: false, error: 'هذا الاختبار مغلق حالياً' }, { status: 400 });
    }

    if (exam.closesAt && new Date() > new Date(exam.closesAt)) {
      return NextResponse.json({ success: false, error: 'انتهت المهلة المحددة لهذا الاختبار' }, { status: 400 });
    }

    // Sanitize questions (DO NOT send correctAnswer to client during test taking!)
    let safeQuestions = questionsRaw.map((q, idx) => ({
      id: q.id || String(idx),
      questionText: q.questionText || q.text,
      image: q.image || null,
      type: q.type || 'MCQ',
      options: q.options || [],
      points: Number(q.points) || 1,
    }));

    // Shuffle if enabled
    if (exam.shuffleQuestions) {
      safeQuestions = safeQuestions.sort(() => Math.random() - 0.5);
    }

    return NextResponse.json({
      success: true,
      alreadySubmitted: false,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        maxScore: exam.maxScore,
        duration: exam.duration || 15,
        questionsCount: safeQuestions.length,
        questions: safeQuestions,
      }
    });
  } catch (error: any) {
    console.error('Error fetching quiz for student:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
