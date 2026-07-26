import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        academicStage: true,
        group: true,
        parent: true,
        attendances: {
          include: { session: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        submissions: {
          include: { homework: true },
          orderBy: { submittedAt: 'desc' },
          take: 20,
        },
        examResults: {
          include: { exam: true },
          orderBy: { gradedAt: 'desc' },
          take: 20,
        },
        subscriptions: {
          orderBy: { startDate: 'desc' },
          take: 5,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        communications: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a student
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);

    if (!payload || (payload.role !== 'OWNER' && payload.role !== 'ASSISTANT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      academicStageId,
      groupId,
      parentId,
      notes,
    } = body;

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(academicStageId && { academicStageId }),
        ...(groupId && { groupId }),
        ...(parentId && { parentId }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        academicStage: true,
        group: true,
        parent: true,
      },
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a student
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, parentName, parentPhone, stageId, groupId, academicStageId } = body;

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(groupId && { groupId }),
        ...(stageId && { academicStageId: stageId }),
        ...(academicStageId && { academicStageId }),
        // Update parent if exists
      },
      include: { academicStage: true, group: true },
    });

    // Update parent name/phone if provided
    if (parentName || parentPhone) {
      const student = await prisma.student.findUnique({
        where: { id },
        include: { parent: true },
      });
      if (student?.parent) {
        await prisma.parent.update({
          where: { id: student.parent.id },
          data: {
            ...(parentName && { name: parentName }),
            ...(parentPhone && { phone: parentPhone }),
          },
        });
      }
    }

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


// DELETE - Delete a student
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete related data first (cascade)
    await prisma.attendance.deleteMany({ where: { studentId: id } });
    await prisma.homeworkSubmission.deleteMany({ where: { studentId: id } });
    await prisma.examResult.deleteMany({ where: { studentId: id } });
    await prisma.payment.deleteMany({ where: { studentId: id } });
    await prisma.subscription.deleteMany({ where: { studentId: id } });
    await prisma.student.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
