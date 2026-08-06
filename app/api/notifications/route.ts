import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all notifications (for teacher dashboard)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: any = {};
    if (type) where.type = type;
    if (unreadOnly) where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        recipient: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const unreadCount = await prisma.notification.count({ where: { isRead: false } });

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Send notification — supports single student, group, stage, or ALL
export async function POST(req: Request) {
  try {
    const { title, message, type, target, recipientId, groupId, academicStageId } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ success: false, error: 'العنوان والرسالة مطلوبان' }, { status: 400 });
    }

    const notifType = type || 'INFO';
    let createdCount = 0;
    let createdNotifications: any[] = [];

    if (target === 'ALL') {
      // Broadcast to ALL students
      const students = await prisma.student.findMany({ select: { id: true } });
      const data = students.map(s => ({
        title,
        message,
        type: notifType,
        recipientId: s.id,
      }));
      await prisma.notification.createMany({ data });
      createdCount = students.length;

    } else if (target === 'STAGE' && academicStageId) {
      // Broadcast to all students in a specific academic stage
      const students = await prisma.student.findMany({
        where: { academicStageId },
        select: { id: true },
      });
      const data = students.map(s => ({
        title,
        message,
        type: notifType,
        recipientId: s.id,
      }));
      await prisma.notification.createMany({ data });
      createdCount = students.length;

    } else if (target === 'GROUP' && groupId) {
      // Broadcast to all students in a specific group
      const students = await prisma.student.findMany({
        where: { groupId },
        select: { id: true },
      });
      const data = students.map(s => ({
        title,
        message,
        type: notifType,
        recipientId: s.id,
      }));
      await prisma.notification.createMany({ data });
      createdCount = students.length;

    } else if (target === 'STUDENT' && recipientId) {
      // Send to a single student
      const notification = await prisma.notification.create({
        data: { title, message, type: notifType, recipientId },
        include: { recipient: { select: { id: true, name: true, code: true } } },
      });
      createdCount = 1;
      createdNotifications = [notification];

    } else {
      // Fallback: send without recipient (global / system notification)
      const notification = await prisma.notification.create({
        data: { title, message, type: notifType },
      });
      createdNotifications = [notification];
      createdCount = 1;
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال الإشعار لـ ${createdCount} ${createdCount === 1 ? 'طالب' : 'طلاب'}`,
      count: createdCount,
      notifications: createdNotifications,
    });
  } catch (error: any) {
    console.error('Notification error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a notification by ID
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'ID مطلوب' }, { status: 400 });
    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
