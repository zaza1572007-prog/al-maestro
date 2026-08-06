import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { verifyStaff } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'الرجاء تحديد معرف المجموعة' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return NextResponse.json({ success: false, error: 'المجموعة غير موجودة' }, { status: 404 });
    }

    // Get current date boundaries in Egypt timezone
    const egyptTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    const now = new Date(egyptTimeStr);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Find if a session exists today
    let session = await prisma.lessonSession.findFirst({
      where: {
        groupId,
        date: {
          gte: todayStart,
          lt: todayEnd
        }
      }
    });

    if (session) {
      if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
        // Reopen it
        session = await prisma.lessonSession.update({
          where: { id: session.id },
          data: { status: 'OPEN' }
        });

        // Delete any auto-generated absences so they can be re-recorded if the student doesn't show up again
        await prisma.attendance.deleteMany({
          where: {
            sessionId: session.id,
            status: 'ABSENT'
          }
        });
      } else {
        session = await prisma.lessonSession.update({
          where: { id: session.id },
          data: { status: 'OPEN' }
        });
      }
    } else {
      // Create session as OPEN
      session = await prisma.lessonSession.create({
        data: {
          title: `جلسة ${group.name}`,
          groupId,
          date: new Date(egyptTimeStr),
          startTime: group.startTime,
          endTime: group.endTime,
          status: 'OPEN',
          type: 'LECTURE'
        }
      });
    }

    return NextResponse.json({ success: true, session });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
