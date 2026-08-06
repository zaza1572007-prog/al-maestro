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

    return NextResponse.json({
      success: true,
      student: {
        name: student.name,
        code: student.code,
        stage: student.academicStage?.name || 'مرحلة دراسية',
        group: student.group?.name || 'مجموعة',
        attendanceRate: `${attendanceRate}%`,
        homeworkSubmissions: `${student.submissions.length}`,
        latestExamScore: student.examResults[0] ? `${student.examResults[0].score} / ${student.examResults[0].exam.maxScore}` : 'لا يوجد',
        subscriptionStatus: activeSub ? `نشط (ينتهي ${new Date(activeSub.endDate).toLocaleDateString('ar-EG')})` : 'غير نشط',
      },
      recentExams: student.examResults.map(r => ({
        id: r.id,
        title: r.exam.title,
        score: `${r.score} / ${r.exam.maxScore}`,
        date: new Date(r.gradedAt).toLocaleDateString('ar-EG'),
        rank: r.percentage >= 90 ? 'ممتاز 🥇' : r.percentage >= 75 ? 'جيد جداً 🥈' : 'جيد',
      })),
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
