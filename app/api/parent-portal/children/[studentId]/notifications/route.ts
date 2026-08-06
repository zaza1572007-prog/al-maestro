import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await params;

    // Verify student belongs to this parent
    const student = await prisma.student.findFirst({
      where: { id: studentId, parentId: payload.userId as string }
    });

    if (!student) {
      return NextResponse.json({ error: 'Unauthorized access to this student' }, { status: 403 });
    }

    const notifications = await prisma.notification.findMany({
      where: { recipientId: studentId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    const formatted = notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
      timeAgo: getTimeAgo(n.createdAt),
    }));

    return NextResponse.json({ success: true, notifications: formatted });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days === 1) return 'أمس';
  if (days < 7) return `منذ ${days} أيام`;
  return new Date(date).toLocaleDateString('ar-EG');
}
