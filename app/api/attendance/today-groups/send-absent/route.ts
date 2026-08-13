import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  }
  return result;
}

async function tryDispatchWA(gatewayUrl: string | null | undefined, apiToken: string | null | undefined, to: string, body: string) {
  try {
    if (!to || !body) return false;

    // 1. Gateway Priority
    if (gatewayUrl && apiToken) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const res = await fetch(gatewayUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify({ token: apiToken, to, body }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) return true;
      } catch (err: any) {
        console.warn('Gateway fetch failed or timed out in send-absent:', err.message);
      }
    }

    // 2. Direct fallback
    const directResult = await sendWhatsAppMessage(to, body);
    if (directResult.success) return true;

    return false;
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
    if (!settings) {
      return NextResponse.json({ success: false, error: 'إعدادات النظام غير متوفرة' }, { status: 500 });
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
    const sendPromises = absentStudents.map(async (student) => {
      try {
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
          return success;
        }
      } catch (err) {
        console.error(`Failed to handle absent status/alert for student ${student.name}:`, err);
      }
      return false;
    });

    const results = await Promise.allSettled(sendPromises);
    let sentCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value === true) {
        sentCount++;
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
