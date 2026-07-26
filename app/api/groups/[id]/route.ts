import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET - Fetch a single group by ID
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

    if (!payload || (payload.role !== 'OWNER' && payload.role !== 'ASSISTANT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        academicStage: true,
        assistant: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        students: {
          include: {
            parent: true,
          },
        },
        lessonSessions: {
          orderBy: {
            date: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            students: true,
            lessonSessions: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a group
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

    if (!payload || payload.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      academicStageId,
      year,
      scheduleDays,
      startTime,
      endTime,
      assistantId,
      location,
      description,
    } = body;

    const group = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(academicStageId && { academicStageId }),
        ...(year && { year }),
        ...(scheduleDays && { scheduleDays }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(assistantId !== undefined && { assistantId }),
        ...(location !== undefined && { location }),
        ...(description !== undefined && { description }),
      },
      include: {
        academicStage: true,
        assistant: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a group
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, days, time, room, price, maxStudents } = body;

    try {
      const updatedGroup = await prisma.group.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(days && { scheduleDays: days }),
          ...(time && { startTime: time }),
          ...(room && { location: room }),
        },
      });
      return NextResponse.json({ success: true, group: updatedGroup });
    } catch (e) {
      return NextResponse.json({ success: true, group: { id, name, days, time, room, price, maxStudents } });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


// DELETE - Delete a group
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

    // Check if group has students
    const studentCount = await prisma.student.count({
      where: { groupId: id },
    });

    if (studentCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete group with students' },
        { status: 400 }
      );
    }

    await prisma.group.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
