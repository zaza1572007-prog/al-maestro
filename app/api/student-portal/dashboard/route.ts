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

    const student = await prisma.student.findUnique({
      where: { id: payload.userId as string },
      include: {
        academicStage: true,
        group: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
          take: 1,
        },
        attendances: {
          orderBy: { createdAt: 'desc' },
        },
        submissions: {
          include: { homework: true },
          orderBy: { submittedAt: 'desc' },
        },
        examResults: {
          include: { exam: true },
          orderBy: { gradedAt: 'desc' },
          take: 2,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const activeSub = student.subscriptions[0];
    const attendanceRate = student.attendances.length > 0
      ? Math.round((student.attendances.filter(a => a.status === 'PRESENT').length / student.attendances.length) * 100)
      : 0;

    const upcomingHomework = await prisma.homework.findMany({
      where: {
        groupId: student.groupId,
        dueDate: { gte: new Date() },
      },
      include: {
        submissions: {
          where: { studentId: student.id },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 2,
    });

    // Calculate group rank for exam results based on top 3 distinct scores
    const examIds = student.examResults.map((r) => r.examId);
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

    const rankTextMap = new Map<string, (score: number) => string | null>();
    for (const [examId, scores] of scoresByExamMap.entries()) {
      const sortedUnique = Array.from(new Set(scores)).sort((a, b) => b - a);
      rankTextMap.set(examId, (score: number) => {
        const idx = sortedUnique.indexOf(score);
        if (idx === 0) return 'المركز الأول على المجموعة 🥇';
        if (idx === 1) return 'المركز الثاني على المجموعة 🥈';
        if (idx === 2) return 'المركز الثالث على المجموعة 🥉';
        return null;
      });
    }

    const latestResult = student.examResults[0];
    const latestExamRank = latestResult
      ? rankTextMap.get(latestResult.examId)?.(latestResult.score) || null
      : null;

    return NextResponse.json({
      success: true,
      student: {
        name: student.name,
        code: student.code,
        stage: student.academicStage?.name || 'مرحلة دراسية',
        group: student.group?.name || 'مجموعة',
        attendanceRate: `${attendanceRate}%`,
        homeworkSubmissions: `${student.submissions.length}`,
        latestExamScore: latestResult ? `${latestResult.score} / ${latestResult.exam.maxScore}` : 'لا يوجد',
        latestExamRank: latestExamRank,
        subscriptionStatus: activeSub ? 'نشط 🟢' : 'غير نشط 🔴',
        subscriptionEndDate: activeSub ? new Date(activeSub.endDate).toLocaleDateString('ar-EG') : null,
      },
      recentExams: student.examResults.map((r) => {
        const rankText = rankTextMap.get(r.examId)?.(r.score) || null;
        return {
          id: r.id,
          title: r.exam.title,
          score: `${r.score} / ${r.exam.maxScore}`,
          date: new Date(r.gradedAt).toLocaleDateString('ar-EG'),
          rank: rankText,
        };
      }),
      upcomingHomework: upcomingHomework.map(h => ({
        id: h.id,
        title: h.title,
        dueDate: new Date(h.dueDate).toLocaleDateString('ar-EG'),
        status: h.submissions.length > 0 ? 'مكتمل' : 'معلق',
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
