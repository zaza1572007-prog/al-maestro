import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        studentId,
        groupId,
        price: parseFloat(price),
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
