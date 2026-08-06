import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, level, grade, description, monthlyPrice } = body;

    let finalMonthlyPrice = undefined;
    if (monthlyPrice !== undefined && monthlyPrice !== null && monthlyPrice !== '') {
      const parsed = parseFloat(monthlyPrice);
      if (!isNaN(parsed)) {
        finalMonthlyPrice = parsed;
      }
    }

    const stage = await prisma.academicStage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(level !== undefined && { level }),
        ...(grade !== undefined && { grade }),
        ...(description !== undefined && { description }),
        ...(finalMonthlyPrice !== undefined && { monthlyPrice: finalMonthlyPrice }),
      },
    });

    if (finalMonthlyPrice !== undefined) {
      const parsedPrice = finalMonthlyPrice;
      
      // 1. Update all active subscriptions of students belonging to this stage
      await prisma.subscription.updateMany({
        where: {
          status: 'ACTIVE',
          student: {
            academicStageId: id,
          },
        },
        data: {
          price: parsedPrice,
        },
      });

      // 2. Find all active subscriptions for this stage to get their IDs
      const activeSubs = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          student: {
            academicStageId: id,
          },
        },
        select: { id: true },
      });
      const subIds = activeSubs.map(s => s.id);

      if (subIds.length > 0) {
        // 3. Update fully unpaid payments
        await prisma.payment.updateMany({
          where: {
            subscriptionId: { in: subIds },
            paidAmount: 0,
          },
          data: {
            totalAmount: parsedPrice,
            remainingAmount: parsedPrice,
          },
        });
        
        // 4. Update partially paid payments
        const partialPayments = await prisma.payment.findMany({
          where: {
            subscriptionId: { in: subIds },
            paidAmount: { gt: 0 },
            remainingAmount: { gt: 0 },
          },
        });
        for (const p of partialPayments) {
          const newRemaining = Math.max(0, parsedPrice - p.paidAmount);
          await prisma.payment.update({
            where: { id: p.id },
            data: {
              totalAmount: parsedPrice,
              remainingAmount: newRemaining,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, stage });
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

    // Check if stage has students or groups
    const [studentCount, groupCount] = await Promise.all([
      prisma.student.count({ where: { academicStageId: id } }),
      prisma.group.count({ where: { academicStageId: id } }),
    ]);

    if (studentCount > 0 || groupCount > 0) {
      return NextResponse.json({
        success: false,
        error: `لا يمكن حذف المرحلة لأنها مرتبطة بـ ${studentCount} طالب و ${groupCount} مجموعة. انقل البيانات أولاً.`,
      }, { status: 400 });
    }

    await prisma.academicStage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
