import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, totalSessions, price, endDate, renewExempt } = body;

    if (renewExempt) {
      const existing = await prisma.subscription.findUnique({
        where: { id },
      });

      if (!existing) {
        return NextResponse.json({ success: false, error: 'الاشتراك غير موجود' }, { status: 404 });
      }

      const now = new Date();
      const baseDate = existing.endDate && new Date(existing.endDate) > now ? new Date(existing.endDate) : now;
      const nextMonthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0, 23, 59, 59, 999);

      const subscription = await prisma.subscription.update({
        where: { id },
        data: {
          status: 'PAID',
          price: 0,
          isExempt: true,
          endDate: nextMonthEnd,
          usedSessions: 0,
        },
        include: { student: true, group: true, payments: true },
      });

      return NextResponse.json({ success: true, subscription, message: 'تم تجديد الاشتراك كإعفاء بنجاح 🎁' });
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(totalSessions !== undefined && { totalSessions: parseInt(totalSessions) }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
      },
      include: { student: true, group: true, payments: true },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.payment.deleteMany({ where: { subscriptionId: id } });
    await prisma.subscription.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
