import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      activeGroups,
      pendingPaymentsCount,
      recentLogs,
      pendingRegistrations,
      todayAttendances,
      totalPayments,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.group.count(),
      prisma.subscription.count({
        where: { OR: [{ status: 'EXPIRING_SOON' }, { status: 'EXPIRED' }] },
      }),
      prisma.activityLog.findMany({
        take: 20,
        include: {
          user: {
            select: { name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.registrationRequest.count({ where: { status: 'PENDING' } }),
      prisma.attendance.findMany({ where: { createdAt: { gte: today } } }),
      prisma.payment.aggregate({ _sum: { paidAmount: true } }),
    ]);

    // Real attendance rate for today
    let todayAttendanceRate = '0%';
    const nonVacationToday = todayAttendances.filter((a: { status: string }) => a.status !== 'VACATION');
    if (nonVacationToday.length > 0) {
      const presentCount = nonVacationToday.filter((a: { status: string }) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'LEFT_EARLY').length;
      const rate = Math.round((presentCount / nonVacationToday.length) * 100);
      todayAttendanceRate = `${rate}%`;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        activeGroups,
        todayAttendanceRate,
        pendingPaymentsCount,
        pendingRegistrations,
        totalCollected: totalPayments._sum.paidAmount || 0,
        todayAttendancesCount: todayAttendances.length,
      },
      logs: recentLogs.map((l: any) => ({
        id: l.id,
        action: l.action,
        entityType: l.entity,
        userName: l.user?.name || (l.details && typeof l.details === 'object' ? l.details.studentName || l.details.userName : null),
        details: l.details,
        createdAt: l.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
