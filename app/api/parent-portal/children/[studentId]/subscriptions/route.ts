import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await params;

    const actualStudent = await prisma.student.findFirst({
      where: { id: studentId, parentId: payload.userId as string }
    });

    if (!actualStudent) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const sub = await prisma.subscription.findFirst({
      where: { studentId: actualStudent.id },
      orderBy: { endDate: 'desc' },
      include: { payments: true }
    });

    if (!sub) return NextResponse.json({ success: true, subscription: null });

    const payment = sub.payments.length > 0 ? sub.payments[0] : null;

    const subscription = {
      id: sub.id,
      month: new Date(sub.startDate).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
      price: sub.price,
      remaining: payment?.remainingAmount || 0,
      status: sub.status === 'ACTIVE' ? 'ساري' : 'منتهي',
    };

    return NextResponse.json({ success: true, subscription });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
