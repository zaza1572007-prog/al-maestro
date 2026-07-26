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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.registrationRequest.count({ where: { status: 'PENDING' } }),
      prisma.attendance.findMany({ where: { createdAt: { gte: today } } }),
      prisma.payment.aggregate({ _sum: { paidAmount: true } }),
    ]);

    // Real attendance rate for today
    let todayAttendanceRate = '0%';
    if (todayAttendances.length > 0) {
      const presentCount = todayAttendances.filter(a => a.status === 'PRESENT').length;
      const rate = Math.round((presentCount / todayAttendances.length) * 100);
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
      logs: recentLogs.map(l => ({
        id: l.id,
        text: `${l.action} - ${l.entity}`,
        entityType: l.entity,
        createdAt: l.createdAt,
        time: new Date(l.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
