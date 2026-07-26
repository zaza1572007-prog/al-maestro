import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH - Update session status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, title, location, notes } = body;

    const session = await prisma.lessonSession.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(title && { title }),
        ...(location !== undefined && { location }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        group: { include: { academicStage: true } },
        _count: { select: { attendances: true } },
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE - Delete a session and its attendances
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.attendance.deleteMany({ where: { sessionId: id } });
    await prisma.lessonSession.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
