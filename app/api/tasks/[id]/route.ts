import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staffPayload = await verifyStaff(req);
    if (!staffPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'حالة المهمة مطلوبة' }, { status: 400 });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null
      }
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staffPayload = await verifyStaff(req);
    if (!staffPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'تم حذف المهمة بنجاح' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
