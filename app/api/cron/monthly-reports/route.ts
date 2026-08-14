import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { verifyStaff } from '@/lib/auth';
import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-maestro-secret-key-12345';

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// Helper to generate magic token
function generateMagicToken(studentId: string, month: number, year: number): string {
  const payload = `${studentId}:${month}:${year}`;
  const hash = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  const base64Payload = Buffer.from(payload).toString('base64url');
  return `${base64Payload}.${hash.slice(0, 16)}`;
}

// Calculate monthly stats for a student
async function calculateMonthlyReportForStudent(studentId: string, groupId: string, month: number, year: number) {
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const sessions = await prisma.lessonSession.findMany({
    where: {
      groupId: groupId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  const totalSessions = sessions.length;

  const attendances = await prisma.attendance.findMany({
    where: {
      studentId: studentId,
      session: {
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    },
    include: { session: true },
  });

  const presentCount = attendances.filter(
    (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'LEFT_EARLY'
  ).length;
  
  const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;

  const absentDays = attendances
    .filter((a) => a.status === 'ABSENT')
    .map((a) => {
      const date = new Date(a.session.date);
      const dayName = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date);
      const dateStr = date.toISOString().split('T')[0];
      return { date: dateStr, day: dayName };
    });

  const examResults = await prisma.examResult.findMany({
    where: {
      studentId: studentId,
      exam: {
        examDate: { gte: startOfMonth, lte: endOfMonth },
      },
    },
    include: { exam: true },
  });

  const exams = examResults.map((r) => ({
    title: r.exam.title,
    type: r.exam.type,
    score: r.score,
    maxScore: r.exam.maxScore,
    percentage: r.percentage,
  }));

  const subscription = await prisma.subscription.findFirst({
    where: {
      studentId: studentId,
      groupId: groupId,
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
    },
    include: {
      payments: true,
    },
  });

  let paymentStatus = 'غير مدفوع';
  if (subscription) {
    const totalPaid = subscription.payments.reduce((sum, p) => sum + p.paidAmount, 0);
    if (totalPaid >= subscription.price || subscription.payments.some((p) => p.remainingAmount <= 0)) {
      paymentStatus = 'مدفوع';
    } else if (totalPaid > 0) {
      paymentStatus = `مدفوع جزئياً (${totalPaid} ج.م من ${subscription.price} ج.م)`;
    } else {
      paymentStatus = `غير مدفوع (مطلوب ${subscription.price} ج.م)`;
    }
  }

  return {
    totalSessions,
    presentCount,
    absentCount,
    absentDays,
    exams,
    paymentStatus,
  };
}

function buildWhatsAppMessage(student: any, month: number, year: number, stats: any, magicLink: string) {
  const monthName = arabicMonths[month - 1];
  let msg = `📊 *تقرير المتابعة الشهري التلقائي لولي الأمر* 📊\n\n`;
  msg += `*اسم الطالب:* ${student.name}\n`;
  msg += `*الصف الدراسي:* ${student.academicStage?.name || '—'}\n`;
  msg += `*المجموعة:* ${student.group?.name || '—'}\n`;
  msg += `*التقرير الخاص بشهر:* ${monthName} ${year}\n\n`;

  msg += `*1. الحضور والغياب:* 📅\n`;
  msg += `- إجمالي عدد الحصص: ${stats.totalSessions}\n`;
  msg += `- حضور: ${stats.presentCount} حصص\n`;
  msg += `- غياب: ${stats.absentCount} حصص\n`;

  if (stats.absentDays.length > 0) {
    msg += `*تفاصيل أيام الغياب:* ⚠️\n`;
    stats.absentDays.forEach((day: any) => {
      msg += `  - ${day.day} (${day.date})\n`;
    });
  }
  msg += `\n`;

  msg += `*2. الاختبارات والتقييمات:* 📝\n`;
  if (stats.exams.length > 0) {
    stats.exams.forEach((exam: any) => {
      const typeStr = exam.type === 'QUIZ' ? 'اختبار قصير' : exam.type === 'MONTHLY' ? 'امتحان شهري' : 'امتحان';
      msg += `  - ${exam.title} (${typeStr}): ${exam.score} / ${exam.maxScore} (${exam.percentage}%)\n`;
    });
  } else {
    msg += `  - لا توجد امتحانات مسجلة هذا الشهر.\n`;
  }
  msg += `\n`;

  msg += `*3. المصروفات والاشتراك:* 💰\n`;
  msg += `- حالة السداد للشهر: *${stats.paymentStatus}*\n\n`;

  msg += `🔗 *رابط التقرير التفاعلي السريع (رابط سحري):*\n`;
  msg += `يمكنكم الاطلاع على تقرير الحضور والدرجات التفاعلي والرسوم البيانية عبر هذا الرابط:\n`;
  msg += `${magicLink}\n\n`;

  msg += `نتمنى للطالب دوام التوفيق والتميز! 🌸\n`;
  msg += `*منصة المايسترو - الأستاذ أحمد راضي كحلة*`;

  return msg;
}

async function tryDispatchWhatsApp(to: string, body: string) {
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (settings && settings.enableWhatsApp === false) {
      return { success: false, error: 'WhatsApp service is disabled in settings.' };
    }

    if (settings?.waGatewayUrl && settings?.waApiToken) {
      const res = await fetch(settings.waGatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.waApiToken}`,
        },
        body: JSON.stringify({
          token: settings.waApiToken,
          to,
          body,
        }),
      });
      if (res.ok) return { success: true };
    }
    const directResult = await sendWhatsAppMessage(to, body);
    return directResult;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Function to perform the actual bulk report sending
async function runAutoSend(baseUrl: string, isManualTrigger = false) {
  const settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    return { success: false, error: 'لم يتم العثور على إعدادات المنصة' };
  }

  if (settings.enableWhatsApp === false) {
    return { success: false, error: 'خدمة الواتساب معطلة في إعدادات المنصة' };
  }

  // If not manual, verify configurations are enabled
  if (!isManualTrigger) {
    if (!settings.autoSendEnabled || settings.sendMode !== 'AUTOMATIC') {
      return { success: false, skip: true, error: 'الإرسال التلقائي معطل في الإعدادات' };
    }
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthName = arabicMonths[month - 1];
  const reasonStr = `تقرير المتابعة الشهري لشهر ${monthName} ${year}`;

  // If not manual, verify we haven't already sent for this month
  if (!isManualTrigger) {
    const sentCount = await prisma.parentCommunication.count({
      where: {
        reason: { startsWith: `تقرير المتابعة الشهري لشهر ${monthName} ${year}` },
      },
    });
    if (sentCount > 0) {
      return { success: false, skip: true, error: `تم إرسال تقارير هذا الشهر بالفعل (${monthName} ${year})` };
    }
  }

  // Get all students
  const students = await prisma.student.findMany({
    include: {
      academicStage: true,
      group: true,
      parent: true,
    },
  });

  let successCount = 0;
  let failCount = 0;

  for (const student of students) {
    try {
      const stats = await calculateMonthlyReportForStudent(student.id, student.groupId, month, year);
      const token = generateMagicToken(student.id, month, year);
      const magicLink = `${baseUrl}/parent-report/${token}`;
      const messageText = buildWhatsAppMessage(student, month, year, stats, magicLink);

      const phoneTarget = student.parent?.whatsapp || student.parent?.phone || student.phone;
      if (!phoneTarget) {
        failCount++;
        continue;
      }

      const dispatch = await tryDispatchWhatsApp(phoneTarget, messageText);
      if (dispatch.success) {
        successCount++;
        // Log communication
        await prisma.parentCommunication.create({
          data: {
            studentId: student.id,
            date: new Date(),
            method: 'WHATSAPP',
            reason: reasonStr + ' (تلقائي)',
            result: 'تم الإرسال بنجاح',
            notes: `رقم الهاتف: ${phoneTarget}`,
          },
        });
      } else {
        failCount++;
      }
    } catch (e) {
      failCount++;
      console.error(`Error auto-sending to student ${student.id}:`, e);
    }
  }

  // Log in activity logs
  await prisma.activityLog.create({
    data: {
      action: 'CRON_AUTO_SEND_REPORTS',
      entity: 'SystemSettings',
      entityId: settings.id,
      changes: JSON.stringify({
        successCount,
        failCount,
        triggeredBy: isManualTrigger ? 'MANUAL' : 'CRON',
      }),
    },
  });

  return { success: true, successCount, failCount };
}

// GET: Cron call
export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      return NextResponse.json({ success: false, error: 'Settings not found' }, { status: 404 });
    }

    if (settings.enableWhatsApp === false) {
      return NextResponse.json({ success: true, message: 'Automatic reports sending skipped because WhatsApp is disabled globally' });
    }

    if (!settings.autoSendEnabled || settings.sendMode !== 'AUTOMATIC') {
      return NextResponse.json({ success: true, message: 'Automatic reports sending is disabled' });
    }

    const today = new Date();
    const scheduledDay = settings.scheduledDay; // e.g. 28
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // Check if it is the correct day.
    const isToday = today.getDate() === scheduledDay || (scheduledDay >= lastDayOfMonth && today.getDate() === lastDayOfMonth);

    if (!isToday) {
      return NextResponse.json({ success: true, message: `Today is not the scheduled day (Scheduled: ${scheduledDay}, Today: ${today.getDate()})` });
    }

    // Check time if called hourly
    const [scheduledHourStr, scheduledMinuteStr] = settings.scheduledTime.split(':');
    const scheduledHour = parseInt(scheduledHourStr) || 20;
    const currentHour = today.getHours();
    
    if (currentHour < scheduledHour) {
      return NextResponse.json({ success: true, message: `Time is before scheduled hour (Scheduled: ${settings.scheduledTime}, Current hour: ${currentHour})` });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    const res = await runAutoSend(baseUrl, false);
    return NextResponse.json({ ...res });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Manual trigger of automatic reports (for testing)
export async function POST(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff || staff.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول (OWNER only)' }, { status: 403 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    const res = await runAutoSend(baseUrl, true);
    
    return NextResponse.json({ ...res });
  } catch (error: any) {
    console.error('Manual cron trigger error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
