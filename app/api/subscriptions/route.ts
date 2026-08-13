import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function syncSubscriptionStatuses() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 0. Sync payment-based statuses for subscriptions that are not fully paid in DB
  const unpaidSubs = await prisma.subscription.findMany({
    where: {
      status: { notIn: ['PAID', 'CANCELLED'] }
    },
    include: {
      payments: true
    }
  });

  for (const sub of unpaidSubs) {
    const totalPaid = sub.payments.reduce((sum, p) => sum + p.paidAmount, 0);
    let newStatus = sub.status;
    
    if (totalPaid >= sub.price) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    if (newStatus !== sub.status) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: newStatus,
          paidAt: newStatus === 'PAID' ? (sub.payments[0]?.paidAt || new Date()) : sub.paidAt
        }
      });
    }
  }

  // 1. Mark unpaid/active subscriptions of past months as OVERDUE
  await prisma.subscription.updateMany({
    where: {
      status: { notIn: ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'] },
      OR: [
        { year: { lt: currentYear } },
        { AND: [{ year: currentYear }, { month: { lt: currentMonth } }] }
      ]
    },
    data: { status: 'OVERDUE' },
  });

  // 2. Mark remaining non-paid subscriptions that are past their endDate as EXPIRED (e.g. legacy subscriptions without month/year)
  await prisma.subscription.updateMany({
    where: {
      status: { notIn: ['EXPIRED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED', 'OVERDUE'] },
      endDate: { lt: now }
    },
    data: { status: 'EXPIRED' },
  });

  // 3. Mark active subscriptions expiring soon
  await prisma.subscription.updateMany({
    where: {
      status: 'ACTIVE',
      endDate: { gte: now, lte: sevenDaysLater }
    },
    data: { status: 'EXPIRING_SOON' },
  });

  // 4. Restore EXPIRING_SOON that were extended past 7 days back to ACTIVE or UNPAID
  await prisma.subscription.updateMany({
    where: { status: 'EXPIRING_SOON', endDate: { gt: sevenDaysLater } },
    data: { status: 'ACTIVE' },
  });
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
