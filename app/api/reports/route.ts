import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function syncSubscriptionStatuses() {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await prisma.subscription.updateMany({
    where: { status: { not: 'EXPIRED' }, endDate: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  await prisma.subscription.updateMany({
    where: { status: 'ACTIVE', endDate: { gte: now, lte: sevenDaysLater } },
    data: { status: 'EXPIRING_SOON' },
  });
}

export async function GET() {
  try {
    await syncSubscriptionStatuses();

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      totalGroups,
      totalStages,
      attendanceAll,
      examResults,
      homeworkSubmissions,
      payments,
      expiringIn7,
      expiringIn30,
      expiredSubs,
      activeSubs,
      stagesWithStudents,
      groupsWithStudents,
    ] = await Promise.all([
      // Students
      prisma.student.count(),
      prisma.group.count(),
      prisma.academicStage.count(),

      // Attendance breakdown
      prisma.attendance.groupBy({ by: ['status'], _count: true }),

      // Exam results — average score per stage
      prisma.examResult.findMany({
        select: {
          score: true,
          exam: { select: { maxScore: true, group: { select: { academicStageId: true } } } },
        },
      }),

      // Homework submission stats
      prisma.homeworkSubmission.groupBy({ by: ['status'], _count: true }),

      // Financial totals
      prisma.payment.aggregate({
        _sum: { totalAmount: true, paidAmount: true, remainingAmount: true },
        _count: true,
      }),

      // Subscriptions expiring in 7 days
      prisma.subscription.findMany({
        where: { status: 'ACTIVE', endDate: { lte: sevenDaysLater, gte: now } },
        include: {
          student: { select: { id: true, name: true, code: true, phone: true } },
          group: { select: { name: true } },
        },
        orderBy: { endDate: 'asc' },
      }),

      // Subscriptions expiring in 30 days
      prisma.subscription.count({
        where: { status: 'ACTIVE', endDate: { lte: thirtyDaysLater, gte: now } },
      }),

      // Expired subscriptions
      prisma.subscription.count({ where: { status: 'EXPIRED' } }),

      // Active subscriptions
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),

      // Students per stage
      prisma.academicStage.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { students: true } },
        },
        orderBy: { name: 'asc' },
      }),

      // Students per group
      prisma.group.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { students: true } },
          academicStage: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Attendance breakdown
    const presentCount = attendanceAll.find((a) => a.status === 'PRESENT')?._count ?? 0;
    const absentCount = attendanceAll.find((a) => a.status === 'ABSENT')?._count ?? 0;
    const lateCount = attendanceAll.find((a) => a.status === 'LATE')?._count ?? 0;
    const totalAtt = presentCount + absentCount + lateCount;
    const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;

    // Homework stats
    const hwSubmitted = homeworkSubmissions.filter((h) =>
      ['SUBMITTED', 'GRADED', 'LATE'].includes(h.status)
    ).reduce((acc, h) => acc + h._count, 0);
    const hwTotal = homeworkSubmissions.reduce((acc, h) => acc + h._count, 0);
    const hwRate = hwTotal > 0 ? Math.round((hwSubmitted / hwTotal) * 100) : 0;

    // Avg exam score
    let avgExamPct = 0;
    if (examResults.length > 0) {
      const scores = examResults
        .filter((r) => r.exam.maxScore > 0)
        .map((r) => (r.score / r.exam.maxScore) * 100);
      if (scores.length > 0) avgExamPct = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    return NextResponse.json({
      success: true,
      report: {
        // Overview
        totalStudents,
        totalGroups,
        totalStages,

        // Attendance
        attendance: {
          total: totalAtt,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          rate: attendanceRate,
        },

        // Exams
        exams: {
          totalResults: examResults.length,
          avgScorePercent: avgExamPct,
        },

        // Homework
        homework: {
          total: hwTotal,
          submitted: hwSubmitted,
          rate: hwRate,
        },

        // Financial
        financial: {
          totalAmount: payments._sum.totalAmount ?? 0,
          paidAmount: payments._sum.paidAmount ?? 0,
          remainingAmount: payments._sum.remainingAmount ?? 0,
          paymentCount: payments._count,
          collectionRate: payments._sum.totalAmount
            ? Math.round(((payments._sum.paidAmount ?? 0) / payments._sum.totalAmount) * 100)
            : 0,
        },

        // Subscription alerts
        subscriptions: {
          active: activeSubs,
          expired: expiredSubs,
          expiringIn7: expiringIn7,      // Full objects for alert display
          expiringIn30Count: expiringIn30,
        },

        // Breakdown
        stagesBreakdown: stagesWithStudents.map((s) => ({
          id: s.id,
          name: s.name,
          studentCount: s._count.students,
        })),
        groupsBreakdown: groupsWithStudents.map((g) => ({
          id: g.id,
          name: g.name,
          stage: g.academicStage?.name || '—',
          studentCount: g._count.students,
        })),
      },
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
