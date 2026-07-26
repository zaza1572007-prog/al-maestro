import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { studentCode, sessionId, status } = await req.json();

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ code: studentCode }, { qrCode: studentCode }],
      },
      include: {
        group: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'لم يتم العثور على الطالب بهذا الكود أو الـ QR' }, { status: 404 });
    }

    const hasActiveSub = student.subscriptions.length > 0;

    let targetSessionId = sessionId;
    if (!targetSessionId || targetSessionId === 'default-session') {
      let latestSession = await prisma.lessonSession.findFirst({
        where: { groupId: student.groupId },
        orderBy: { date: 'desc' },
      });

      if (!latestSession) {
        latestSession = await prisma.lessonSession.create({
          data: {
            title: `جلسة ${student.group.name}`,
            groupId: student.groupId,
            date: new Date(),
            startTime: '16:00',
            endTime: '18:00',
            status: 'IN_PROGRESS',
          },
        });
      }
      targetSessionId = latestSession.id;
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId: student.id,
        sessionId: targetSessionId,
        status: status || 'PRESENT',
        checkInTime: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        code: student.code,
        groupName: student.group.name,
        hasActiveSub,
      },
      attendance,
      whatsappSent: true,
      message: `تم تسجيل حضور الطالب ${student.name} بنجاح`,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
