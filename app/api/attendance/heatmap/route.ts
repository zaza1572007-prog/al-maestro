import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthsParam = parseInt(searchParams.get('months') || '2', 10); // default last 2 months

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsParam);
    startDate.setHours(0, 0, 0, 0);

    // Fetch sessions in range
    const sessions = await prisma.lessonSession.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        attendances: {
          select: {
            status: true,
          },
        },
      },
    });

    // Group by YYYY-MM-DD
    const dailyMap: Record<
      string,
      { present: number; absent: number; total: number; sessionCount: number }
    > = {};

    sessions.forEach((s) => {
      const y = s.date.getFullYear();
      const m = String(s.date.getMonth() + 1).padStart(2, '0');
      const d = String(s.date.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { present: 0, absent: 0, total: 0, sessionCount: 0 };
      }

      dailyMap[dateKey].sessionCount += 1;

      s.attendances.forEach((att) => {
        dailyMap[dateKey].total += 1;
        if (att.status === 'PRESENT' || att.status === 'LATE' || att.status === 'LEFT_EARLY') {
          dailyMap[dateKey].present += 1;
        } else if (att.status === 'ABSENT') {
          dailyMap[dateKey].absent += 1;
        }
      });
    });

    // Transform into array
    const data = Object.entries(dailyMap).map(([date, stats]) => {
      const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (stats.total > 0) {
        if (rate >= 85) level = 4;
        else if (rate >= 70) level = 3;
        else if (rate >= 50) level = 2;
        else level = 1;
      }

      return {
        date,
        present: stats.present,
        absent: stats.absent,
        total: stats.total,
        sessionCount: stats.sessionCount,
        rate,
        level,
      };
    });

    return NextResponse.json({
      success: true,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      heatmapData: data,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
