import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.payment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { paidAmount, notes } = body;

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...(paidAmount !== undefined && {
          paidAmount: parseFloat(paidAmount),
          remainingAmount: 0,
        }),
        ...(notes !== undefined && { notes }),
      },
      include: { student: true },
    });

    return NextResponse.json({ success: true, payment });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
