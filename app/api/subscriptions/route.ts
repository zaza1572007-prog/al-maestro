import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function syncSubscriptionStatuses() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Determine if we are in the last 8 days of the current month
  const endOfMonth = new Date(currentYear, currentMonth, 0); // e.g. August 31
  const totalDays = endOfMonth.getDate();
  const last8DaysStart = totalDays - 7; // e.g. 31 - 7 = 24. Day 24 onwards is the last 8 days.
  const isLast8Days = now.getDate() >= last8DaysStart;

  // 1. Automatically create subscriptions for the current month for all active students if they don't exist
  try {
    const activeStudents = await prisma.student.findMany({
      include: {
        academicStage: true
      }
    });

    const currentSubs = await prisma.subscription.findMany({
      where: {
        month: currentMonth,
        year: currentYear
      },
      select: {
        studentId: true
      }
    });

    const currentSubStudentIds = new Set(currentSubs.map(s => s.studentId));
    const studentsWithoutSub = activeStudents.filter(s => !currentSubStudentIds.has(s.id));

    if (studentsWithoutSub.length > 0) {
      const defaultStatus = isLast8Days ? 'UNPAID' : 'ACTIVE';
      const start = new Date(currentYear, currentMonth - 1, 1);
      const end = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

      await prisma.subscription.createMany({
        data: studentsWithoutSub.map(s => ({
          studentId: s.id,
          groupId: s.groupId,
          startDate: start,
          endDate: end,
          totalSessions: 8,
          price: s.academicStage?.monthlyPrice ?? 350,
          status: defaultStatus,
          month: currentMonth,
          year: currentYear
        }))
      });
      console.log(`🤖 Auto-created ${studentsWithoutSub.length} new subscriptions for month ${currentMonth}/${currentYear}.`);
    }
  } catch (err) {
    console.error('Error auto-creating monthly subscriptions:', err);
  }

  // 2. Sync status for ALL subscriptions
  const allSubs = await prisma.subscription.findMany({
    include: {
      payments: true
    }
  });

  for (const sub of allSubs) {
    if (sub.status === 'CANCELLED' || sub.status === 'SUSPENDED') continue;

    const totalPaid = sub.payments.reduce((sum, p) => sum + p.paidAmount, 0);
    let expectedStatus = sub.status;

    const subMonth = sub.month || (new Date(sub.startDate).getMonth() + 1);
    const subYear = sub.year || new Date(sub.startDate).getFullYear();

    const isCurrentMonth = subMonth === currentMonth && subYear === currentYear;
    const isPastMonth = subYear < currentYear || (subYear === currentYear && subMonth < currentMonth);

    if (totalPaid >= sub.price) {
      expectedStatus = 'PAID';
    } else if (totalPaid > 0) {
      expectedStatus = 'PARTIALLY_PAID';
    } else {
      // No payments
      if (isCurrentMonth) {
        expectedStatus = isLast8Days ? 'UNPAID' : 'ACTIVE';
      } else if (isPastMonth) {
        expectedStatus = 'OVERDUE';
      }
    }

    if (sub.status !== expectedStatus) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: expectedStatus,
          paidAt: expectedStatus === 'PAID' ? (sub.payments[0]?.paidAt || new Date()) : sub.paidAt
        }
      });
    }
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');

    // Keep statuses fresh on every read
    await syncSubscriptionStatuses();

    const where: any = {};
    if (monthStr) {
      where.month = parseInt(monthStr);
    }
    if (yearStr) {
      where.year = parseInt(yearStr);
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        student: {
          include: {
            parent: true,
          }
        },
        group: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, subscriptions });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { studentId, groupId, price, totalSessions, startDate, endDate, month, year } = await req.json();

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

    const finalMonth = month ? parseInt(month) : start.getMonth() + 1;
    const finalYear = year ? parseInt(year) : start.getFullYear();

    // Check if subscription already exists for this student in this month and year (Unique constraint check)
    const existing = await prisma.subscription.findUnique({
      where: {
        studentId_month_year: {
          studentId,
          month: finalMonth,
          year: finalYear,
        }
      }
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: `الطالب مسجل بالفعل في اشتراك لشهر ${finalMonth}/${finalYear}.`
      }, { status: 400 });
    }

    let finalPrice = 350;
    if (price !== undefined && price !== '') {
      finalPrice = parseFloat(price);
    } else {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { academicStage: true },
      });
      finalPrice = student?.academicStage?.monthlyPrice ?? 350;
    }

    const subscription = await prisma.subscription.create({
      data: {
        studentId,
        groupId,
        price: finalPrice,
        totalSessions: parseInt(totalSessions) || 8,
        startDate: start,
        endDate: end,
        status: 'UNPAID',
        month: finalMonth,
        year: finalYear,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
