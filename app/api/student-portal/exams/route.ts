import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = payload.userId;

    // Get student details (groupId, academicStageId)
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, groupId: true, academicStageId: true }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 1. Fetch all exams assigned to this student's group
    const groupExams = await prisma.exam.findMany({
      where: {
        groupId: student.groupId,
      },
      include: {
        results: {
          where: { studentId },
        }
      },
      orderBy: { examDate: 'desc' }
    });

    // Rank calculations for exams with results
    const examIds = groupExams.map(e => e.id);
    const allResultsForExams = examIds.length > 0
      ? await prisma.examResult.findMany({
          where: { examId: { in: examIds } },
          select: { examId: true, score: true },
        })
      : [];

    const scoresByExamMap = new Map<string, number[]>();
    for (const res of allResultsForExams) {
      if (!scoresByExamMap.has(res.examId)) {
        scoresByExamMap.set(res.examId, []);
      }
      scoresByExamMap.get(res.examId)!.push(res.score);
    }

    let totalPercentage = 0;
    let gradedCount = 0;

    const availableQuizzes: any[] = [];
    const completedExams: any[] = [];

    for (const exam of groupExams) {
      const myResult = exam.results?.[0] || null;
      const questions = Array.isArray(exam.questions) ? (exam.questions as any[]) : [];

      if (myResult) {
        // Exam was taken or graded
        totalPercentage += myResult.percentage;
        gradedCount++;

        const allScores = scoresByExamMap.get(exam.id) || [];
        const uniqueScores = Array.from(new Set(allScores)).sort((a, b) => b - a);
        const rankIdx = uniqueScores.indexOf(myResult.score);

        let rankLabel: string | null = null;
        if (rankIdx === 0) rankLabel = 'الأول على المجموعة 🥇';
        else if (rankIdx === 1) rankLabel = 'الثاني على المجموعة 🥈';
        else if (rankIdx === 2) rankLabel = 'الثالث على المجموعة 🥉';

        completedExams.push({
          id: exam.id,
          resultId: myResult.id,
          title: exam.title,
          description: exam.description,
          type: exam.type,
          isOnline: exam.isOnline,
          isAutoGraded: myResult.isAutoGraded,
          date: new Date(exam.examDate).toLocaleDateString('ar-EG'),
          score: myResult.score,
          maxScore: exam.maxScore,
          percentage: Math.round(myResult.percentage),
          rank: rankLabel,
          timeSpentSeconds: myResult.timeSpentSeconds,
          showAnswers: exam.showAnswersAfterSubmit,
          evaluation:
            myResult.percentage >= 90
              ? 'ممتاز 🌟'
              : myResult.percentage >= 75
              ? 'جيد جداً 👏'
              : myResult.percentage >= 60
              ? 'جيد 👍'
              : 'بحاجة لمتابعة ⚠️',
        });
      } else if (exam.isOnline && exam.isOpen) {
        // Active Online Quiz waiting to be taken
        availableQuizzes.push({
          id: exam.id,
          title: exam.title,
          description: exam.description,
          questionsCount: questions.length,
          duration: exam.duration || 15,
          maxScore: exam.maxScore,
          closesAt: exam.closesAt,
          date: new Date(exam.examDate).toLocaleDateString('ar-EG'),
        });
      }
    }

    const average = gradedCount > 0 ? Math.round(totalPercentage / gradedCount) : 0;

    return NextResponse.json({
      success: true,
      availableQuizzes,
      completedExams,
      average: `${average}%`,
      totalGraded: gradedCount,
    });
  } catch (e: any) {
    console.error('Error fetching student exams:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
