import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  }
  return result;
}

async function tryDispatchWA(gatewayUrl: string, apiToken: string, to: string, body: string) {
  try {
    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}` 
      },
      body: JSON.stringify({ token: apiToken, to, body }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'الرجاء تحديد معرف المجموعة' }, { status: 400 });
    }

    const settings = await prisma.systemSettings.findFirst();
    if (!settings?.enableWhatsApp || !settings?.waGatewayUrl || !settings?.waApiToken) {
      return NextResponse.json({ success: false, error: 'بوابة الواتساب غير مهيأة أو معطلة' }, { status: 400 });
    }

    // Egypt Date boundaries
    const egyptTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    const now = new Date(egyptTimeStr);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const session = await prisma.lessonSession.findFirst({
      where: {
        groupId,
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'لا توجد جلسة مفتوحة اليوم لتسجيل الغياب' }, { status: 400 });
    }

    // Get all students in this group
    const students = await prisma.student.findMany({
      where: { groupId },
      include: { parent: true }
    });

    // Find attended students for this session (status is not ABSENT)
    const attendanceRecords = await prisma.attendance.findMany({
      where: { sessionId: session.id },
      select: { studentId: true, status: true }
    });

    const attendedStudentIds = attendanceRecords
      .filter(r => r.status !== 'ABSENT')
      .map(r => r.studentId);

    const absentStudents = students.filter(s => !attendedStudentIds.includes(s.id));

    if (absentStudents.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'لا يوجد أي طلاب غائبين في هذه المجموعة اليوم' });
    }

    const tpl = settings.waTplAbsent || '📅 تنبيه غياب\nالطالب: [student_name]\nتغيب عن حضور حصة اليوم بالمجموعة.\nمنصة المايسترو 🏫';
    let sentCount = 0;

    for (const student of absentStudents) {
      // 1. Ensure ABSENT attendance record exists in DB
      const existing = attendanceRecords.find(r => r.studentId === student.id);
      if (!existing) {
        await prisma.attendance.create({
          data: {
            studentId: student.id,
            sessionId: session.id,
            status: 'ABSENT',
            notes: 'غياب مسجل تلقائياً عند إرسال تنبيه الغياب الجماعي'
          }
        });
      }

      // 2. Dispatch WhatsApp message to parent
      const parentTarget = student.parent?.whatsapp || student.parent?.phone;
      if (parentTarget) {
        const msg = fillTemplate(tpl, {
          student_name: student.name,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        });
        const success = await tryDispatchWA(settings.waGatewayUrl, settings.waApiToken, parentTarget, msg);
        if (success) {
          sentCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: sentCount,
      totalAbsentees: absentStudents.length,
      message: `تم إرسال رسائل الغياب لـ ${sentCount} ولي أمر بنجاح 🎉`
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
