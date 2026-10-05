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
          take: 3,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const activeSub = student.subscriptions[0];
    const totalAttendances = student.attendances.length;
    const presentCount = student.attendances.filter(
      a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'LEFT_EARLY'
    ).length;
    const attendanceRate = totalAttendances > 0
      ? Math.round((presentCount / totalAttendances) * 100)
      : 0;

    // Calculate attendance streak (consecutive present sessions from latest)
    let streak = 0;
    for (const att of student.attendances) {
      if (att.status === 'PRESENT' || att.status === 'LATE' || att.status === 'LEFT_EARLY') {
        streak++;
      } else {
        break;
      }
    }

    // Homework stats
    const totalHomeworkCount = await prisma.homework.count({
      where: { groupId: student.groupId },
    });
    const submittedHomeworkCount = student.submissions.length;
    const homeworkRate = totalHomeworkCount > 0
      ? Math.round((submittedHomeworkCount / totalHomeworkCount) * 100)
      : 100;

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
      take: 3,
    });

    // Recent materials / files for this student's stage and group
    const recentFilesRaw = await prisma.file.findMany({
      where: {
        OR: [
          { academicStageId: null, groupId: null },
          { academicStageId: student.academicStageId },
          { groupId: student.groupId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
        size: true,
        createdAt: true,
      },
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

    const latestExamScoreDisplay = latestResult
      ? `${latestResult.score} من ${latestResult.exam.maxScore}`
      : 'لا يوجد بعد';

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        code: student.code,
        qrCode: student.qrCode,
        stage: student.academicStage?.name || 'مرحلة دراسية',
        group: student.group?.name || 'مجموعة',
        groupScheduleDays: student.group?.scheduleDays || [],
        groupStartTime: student.group?.startTime || '',
        groupEndTime: student.group?.endTime || '',
        attendanceRate: `${attendanceRate}%`,
        attendanceStreak: streak,
        presentSessions: presentCount,
        totalSessions: totalAttendances,
        totalHomework: totalHomeworkCount,
        homeworkSubmissions: submittedHomeworkCount,
        homeworkRate,
        latestExamScore: latestExamScoreDisplay,
        latestExamScoreRaw: latestResult?.score ?? null,
        latestExamMaxScore: latestResult?.exam.maxScore ?? null,
        latestExamRank: latestExamRank,
        subscriptionStatus: activeSub ? 'نشط 🟢' : 'غير نشط 🔴',
        subscriptionEndDate: activeSub ? new Date(activeSub.endDate).toLocaleDateString('ar-EG') : null,
      },
      recentExams: student.examResults.map((r) => {
        const rankText = rankTextMap.get(r.examId)?.(r.score) || null;
        const maxScore = r.exam.maxScore || 1;
        const percent = Math.min(100, Math.max(0, Math.round((r.score / maxScore) * 100)));
        return {
          id: r.id,
          title: r.exam.title,
          scoreDisplay: `${r.score} من ${maxScore}`,
          scoreRaw: r.score,
          maxScore: maxScore,
          percentage: percent,
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
      recentFiles: recentFilesRaw.map(f => ({
        id: f.id,
        name: f.name,
        url: f.url,
        type: f.type,
        size: f.size,
        date: new Date(f.createdAt).toLocaleDateString('ar-EG'),
      })),
    });
  } catch (e: any) {
    console.error('Error fetching student dashboard:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

