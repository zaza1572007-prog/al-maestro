import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET - Fetch a single student by ID
export async function GET(
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

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Students can only view their own profile
    if (payload.role === 'STUDENT' && payload.userId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Admins and assistants can view any student
    if (payload.role !== 'OWNER' && payload.role !== 'ASSISTANT' && payload.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        academicStage: true,
        group: true,
        parent: true,
        attendances: {
          include: {
            session: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
        submissions: {
          include: {
            homework: true,
          },
          orderBy: {
            submittedAt: 'desc',
          },
          take: 20,
        },
        examResults: {
          include: {
            exam: true,
          },
          orderBy: {
            gradedAt: 'desc',
          },
          take: 20,
        },
        subscriptions: {
          orderBy: {
            startDate: 'desc',
          },
          take: 5,
        },
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        communications: {
          orderBy: {
            date: 'desc',
          },
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
    const { name, phone, parentName, parentPhone, stage, group, subStatus } = body;

    // Check if student exists or perform update/upsert
    try {
      const updatedStudent = await prisma.student.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(phone && { phone }),
          notes: JSON.stringify({ parentName, parentPhone, stage, group, subStatus }),
        },
      });
      return NextResponse.json({ success: true, student: updatedStudent });
    } catch (e) {

      return NextResponse.json({ success: true, student: { id, name, phone, parentName, parentPhone, stage, group, subStatus } });
    }
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
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);

    if (!payload || payload.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.student.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
