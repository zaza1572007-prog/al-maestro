import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function syncSubscriptionStatuses() {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Mark expired
  await prisma.subscription.updateMany({
    where: { status: { not: 'EXPIRED' }, endDate: { lt: now } },
    data: { status: 'EXPIRED' },
  });

  // Mark expiring soon
  await prisma.subscription.updateMany({
    where: { status: 'ACTIVE', endDate: { gte: now, lte: sevenDaysLater } },
    data: { status: 'EXPIRING_SOON' },
  });

  // Restore EXPIRING_SOON that were extended past 7 days back to ACTIVE
  await prisma.subscription.updateMany({
    where: { status: 'EXPIRING_SOON', endDate: { gt: sevenDaysLater } },
    data: { status: 'ACTIVE' },
  });
}

export async function GET() {
  try {
    // Keep statuses fresh on every read
    await syncSubscriptionStatuses();
    const subscriptions = await prisma.subscription.findMany({
      include: {
        student: true,
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
    const { studentId, groupId, price, totalSessions, startDate, endDate } = await req.json();

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

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
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
