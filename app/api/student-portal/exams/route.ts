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

    const results = await prisma.examResult.findMany({
      where: { studentId: payload.userId as string },
      include: { exam: true },
      orderBy: { exam: { examDate: 'desc' } }
    });

    const examIds = results.map((r) => r.examId);
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

    const exams = results.map((r) => {
      totalPercentage += r.percentage;
      const allScores = scoresByExamMap.get(r.examId) || [];
      const uniqueScores = Array.from(new Set(allScores)).sort((a, b) => b - a);
      const rankIdx = uniqueScores.indexOf(r.score);

      let rankLabel: string | null = null;
      if (rankIdx === 0) rankLabel = 'المركز الأول على المجموعة 🥇';
      else if (rankIdx === 1) rankLabel = 'المركز الثاني على المجموعة 🥈';
      else if (rankIdx === 2) rankLabel = 'المركز الثالث على المجموعة 🥉';

      return {
        id: r.id,
        title: r.exam.title,
        date: new Date(r.exam.examDate).toLocaleDateString('ar-EG'),
        score: `${r.score} من ${r.exam.maxScore}`,
        rank: rankLabel,
        evaluation: r.percentage >= 90 ? 'ممتاز' : r.percentage >= 75 ? 'جيد جداً' : r.percentage >= 60 ? 'جيد' : 'بحاجة لمتابعة',
      };
    });

    const average = results.length > 0 ? Math.round(totalPercentage / results.length) : 0;

    return NextResponse.json({ success: true, exams, average: `${average}%` });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
