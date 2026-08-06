import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    // Accept both PARENT role and student-linked parent login
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let parentId: string | null = null;

    if (payload.role === 'STUDENT') {
      // If a student logs in and accesses parent portal, find their parent
      const stu = await prisma.student.findUnique({
        where: { id: payload.userId as string },
        select: { parentId: true },
      });
      parentId = stu?.parentId ?? null;
    } else {
      // Assume userId IS the parent
      parentId = payload.userId as string;
    }

    if (!parentId) {
      return NextResponse.json({ error: 'No parent associated' }, { status: 404 });
    }

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        students: {
          include: {
            academicStage: true,
            group: true,
            attendances: { select: { status: true } },
            examResults: {
              include: { exam: { select: { maxScore: true, title: true } } },
              orderBy: { gradedAt: 'desc' },
              take: 1,
            },
            submissions: {
              select: { status: true },
            },
            subscriptions: {
              orderBy: { endDate: 'desc' },
              take: 1,
              select: { status: true, endDate: true, price: true },
            },
          },
        },
      },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    const childrenData = parent.students.map((stu) => {
      // Attendance rate
      const totalAtt = stu.attendances.length;
      const presentCount = stu.attendances.filter((a) => a.status === 'PRESENT').length;
      const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) + '%' : 'N/A';

      // Latest exam result
      const latestExam =
        stu.examResults.length > 0
          ? `${stu.examResults[0].score} / ${stu.examResults[0].exam.maxScore}`
          : 'لا توجد درجات';

      // Homework completion rate
      const totalHW = stu.submissions.length;
      const completedHW = stu.submissions.filter((s) =>
        ['SUBMITTED', 'GRADED', 'LATE'].includes(s.status)
      ).length;
      const homeworkRate = totalHW > 0 ? Math.round((completedHW / totalHW) * 100) + '%' : 'N/A';

      // Subscription info
      const sub = stu.subscriptions[0];
      const subscriptionStatus = sub
        ? sub.status === 'ACTIVE'
          ? 'ساري'
          : sub.status === 'EXPIRING_SOON'
          ? 'ينتهي قريباً'
          : 'منتهي'
        : 'لا يوجد';
      const subscriptionEndDate = sub
        ? new Date(sub.endDate).toLocaleDateString('ar-EG')
        : null;

      return {
        id: stu.id,
        name: stu.name,
        code: stu.code,
        stage: stu.academicStage?.name || 'مرحلة دراسية',
        group: stu.group?.name || 'مجموعة',
        attendanceRate,
        latestExam,
        homeworkRate,
        subscriptionStatus,
        subscriptionEndDate,
        notes: stu.notes || null,
      };
    });

    return NextResponse.json({ success: true, children: childrenData, parentName: parent.name });
  } catch (e: any) {
    console.error('Parent portal error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
