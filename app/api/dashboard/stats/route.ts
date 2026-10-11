import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

let cachedStats: { data: any; expiresAt: number } | null = null;
const STATS_TTL_MS = 15_000; // 15 seconds cache to avoid heavy DB aggregations

export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول (Staff Only)' }, { status: 401 });
    }

    const now = Date.now();
    if (cachedStats && now < cachedStats.expiresAt) {
      return NextResponse.json(cachedStats.data, {
        headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' },
      });
    }

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

    const responsePayload = {
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
    };

    cachedStats = {
      data: responsePayload,
      expiresAt: now + STATS_TTL_MS,
    };

    return NextResponse.json(responsePayload, {
      headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
