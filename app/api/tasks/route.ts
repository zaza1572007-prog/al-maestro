import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const staffPayload = await verifyStaff(req);
    if (!staffPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const staffMembers = await prisma.user.findMany({
      where: {
        role: {
          in: ['OWNER', 'ASSISTANT']
        }
      },
      select: {
        id: true,
        name: true,
        role: true
      }
    });

    return NextResponse.json({ success: true, tasks, staff: staffMembers });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const staffPayload = await verifyStaff(req);
    if (!staffPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, assignedToId, priority, dueDate } = body;

    if (!title || !assignedToId) {
      return NextResponse.json({ success: false, error: 'عنوان المهمة والمسؤول عنها مطلوبان' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        assignedToId,
        priority: priority || 'MEDIUM',
        status: 'NEW',
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, task });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
