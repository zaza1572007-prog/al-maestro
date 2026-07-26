import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        student: true,
        subscription: true,
        recordedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, payments });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { studentId, subscriptionId, totalAmount, paidAmount, recordedById } = await req.json();

    const total = parseFloat(totalAmount);
    const paid = parseFloat(paidAmount);
    const remaining = total - paid;

    // Find owner or user fallback
    let recorderId = recordedById;
    if (!recorderId) {
      const owner = await prisma.user.findFirst();
      if (owner) recorderId = owner.id;
    }

    const payment = await prisma.payment.create({
      data: {
        studentId,
        subscriptionId,
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining,
        recordedById: recorderId,
      },
      include: {
        student: true,
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
