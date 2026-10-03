import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.questionBank.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف السؤال من بنك الأسئلة'
    });
  } catch (error: any) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
