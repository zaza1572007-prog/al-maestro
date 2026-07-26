import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, level, grade, description } = body;

    const stage = await prisma.academicStage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(level !== undefined && { level }),
        ...(grade !== undefined && { grade }),
        ...(description !== undefined && { description }),
      },
    });
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
