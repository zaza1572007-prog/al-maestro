import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaffWithPermission } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const staff = await verifyStaffWithPermission(req, 'subscriptions.view');
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول (يتطلب صلاحية الاطلاع على المدفوعات)' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');

    const where: any = {};
    if (monthStr) {
      where.subscription = { month: parseInt(monthStr) };
    }
    if (yearStr) {
      if (where.subscription) {
        where.subscription.year = parseInt(yearStr);
      } else {
        where.subscription = { year: parseInt(yearStr) };
      }
    }

    const payments = await prisma.payment.findMany({
      where,
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
    const staff = await verifyStaffWithPermission(req, 'payments.collect');
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك بتحصيل المدفوعات (يتطلب صلاحية تسجيل وتحصيل المدفوعات)' }, { status: 403 });
    }

    const { studentId, subscriptionId, totalAmount, paidAmount, paidAt, month, year, notes } = await req.json();

    const total = parseFloat(totalAmount);
    const paid = parseFloat(paidAmount);
    const remaining = total - paid;

    // Security: Always use verified staff identity from session token (prevents IDOR / impersonation)
    const recorderId = staff.userId;

    // Get the target subscription to retrieve target month/year
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    const finalMonth = month ? parseInt(month) : (sub?.month || undefined);
    const finalYear = year ? parseInt(year) : (sub?.year || undefined);
    const finalPaidAt = paidAt ? new Date(paidAt) : new Date();

    // Create the payment record
    const payment = await prisma.payment.create({
      data: {
        studentId,
        subscriptionId,
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining >= 0 ? remaining : 0,
        recordedById: recorderId,
        month: finalMonth,
        year: finalYear,
        paidAt: finalPaidAt,
        notes: notes || undefined,
      },
      include: {
        student: true,
      },
    });

    // Automatically update the subscription's status and paidAt date
    const paymentsForSub = await prisma.payment.findMany({
      where: { subscriptionId },
    });
    const totalPaid = paymentsForSub.reduce((sum, p) => sum + p.paidAmount, 0);
    const subPrice = sub?.price || 0;
    const subStatus = totalPaid >= subPrice ? 'PAID' : 'PARTIALLY_PAID';

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: subStatus,
        paidAt: finalPaidAt,
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

