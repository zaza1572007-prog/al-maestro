import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-maestro-secret-key-12345';

// Helper to generate a stateless cryptographically signed token
export function generateMagicToken(studentId: string, month: number, year: number): string {
  const payload = `${studentId}:${month}:${year}`;
  const hash = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  const base64Payload = Buffer.from(payload).toString('base64url');
  return `${base64Payload}.${hash.slice(0, 16)}`;
}

// Helper to verify magic token
export function verifyMagicToken(token: string): { studentId: string; month: number; year: number } | null {
  try {
    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) return null;
    
    const payload = Buffer.from(base64Payload, 'base64url').toString('utf8');
    const [studentId, monthStr, yearStr] = payload.split(':');
    
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);
    if (!studentId || isNaN(month) || isNaN(year)) return null;

    const expectedHash = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    const expectedSignature = expectedHash.slice(0, 16);

    if (signature === expectedSignature) {
      return { studentId, month, year };
    }
  } catch (e) {
    // invalid token format
  }
  return null;
}

// WhatsApp Dispatch helper with HTTP gateway check
async function tryDispatchWhatsApp(to: string, body: string) {
  try {
    if (!to || !body) return { success: false, error: 'البيانات غير كافية' };

    const settings = await prisma.systemSettings.findFirst();
    
    // 1. Try HTTP gateway if configured
    if (settings?.waGatewayUrl && settings?.waApiToken) {
      try {
        const res = await fetch(settings.waGatewayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.waApiToken}`,
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify({
            token: settings.waApiToken,
            to,
            body,
          }),
        });
        if (res.ok) {
          console.log(`✅ [WhatsApp Gateway] Delivered message to ${to}`);
          return { success: true };
        } else {
          const text = await res.text();
          console.warn(`⚠️ Gateway returned error ${res.status}: ${text}`);
        }
      } catch (err) {
        console.warn('Gateway fetch failed, falling back to Baileys:', err);
      }
    }

    // 2. Fallback to direct Baileys connection
    const directResult = await sendWhatsAppMessage(to, body);
    return directResult;
  } catch (err: any) {
    console.error('WhatsApp dispatch error:', err);
    return { success: false, error: err.message || 'فشل الإرسال' };
  }
}

// Calculate stats for a student for the chosen month
async function calculateMonthlyReportForStudent(studentId: string, groupId: string, month: number, year: number) {
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Fetch all sessions in the selected month for the student's group
  const sessions = await prisma.lessonSession.findMany({
    where: {
      groupId: groupId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    orderBy: { date: 'asc' },
  });

  const totalSessions = sessions.length;

  // Fetch all attendances for the student in this month
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

  // Fetch exams taken during the month
  const examResults = await prisma.examResult.findMany({
    where: {
      studentId: studentId,
      exam: {
        examDate: { gte: startOfMonth, lte: endOfMonth },
      },
    },
    include: { exam: true },
    orderBy: { exam: { examDate: 'asc' } },
  });

  const exams = examResults.map((r) => ({
    title: r.exam.title,
    type: r.exam.type,
    score: r.score,
    maxScore: r.exam.maxScore,
    percentage: r.percentage,
  }));

  // Check subscription paid status for this month
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
  let isPaid = false;
  if (subscription) {
    const totalPaid = subscription.payments.reduce((sum, p) => sum + p.paidAmount, 0);
    if (totalPaid >= subscription.price || subscription.payments.some((p) => p.remainingAmount <= 0)) {
      paymentStatus = 'مدفوع';
      isPaid = true;
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
    isPaid,
  };
}

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

function buildWhatsAppMessage(student: any, month: number, year: number, stats: any, magicLink: string) {
  const monthName = arabicMonths[month - 1];
  let msg = `📊 *تقرير المتابعة الشهري لولي الأمر* 📊\n\n`;
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

// GET: Preview monthly reports
export async function GET(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || '');
    const year = parseInt(searchParams.get('year') || '');
    const type = searchParams.get('type'); // STAGE, GROUP, STUDENT
    const targetId = searchParams.get('targetId');

    if (isNaN(month) || isNaN(year) || !type || !targetId) {
      return NextResponse.json({ success: false, error: 'المدخلات غير كاملة (month, year, type, targetId)' }, { status: 400 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Get matching students
    const where: any = {};
    if (type === 'STUDENT') {
      where.id = targetId;
    } else if (type === 'GROUP') {
      where.groupId = targetId;
    } else if (type === 'STAGE') {
      where.academicStageId = targetId;
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        academicStage: true,
        group: true,
        parent: true,
      },
    });

    const reportPreviews = await Promise.all(
      students.map(async (student) => {
        const stats = await calculateMonthlyReportForStudent(student.id, student.groupId, month, year);
        const token = generateMagicToken(student.id, month, year);
        const magicLink = `${baseUrl}/parent-report/${token}`;
        const messageText = buildWhatsAppMessage(student, month, year, stats, magicLink);

        return {
          studentId: student.id,
          studentName: student.name,
          studentCode: student.code,
          parentName: student.parent?.name || '—',
          parentPhone: student.parent?.phone || student.phone || '',
          whatsappNum: student.parent?.whatsapp || student.parent?.phone || student.phone || '',
          stats,
          magicLink,
          messageText,
        };
      })
    );

    return NextResponse.json({ success: true, previews: reportPreviews });
  } catch (error: any) {
    console.error('Error generating previews:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Send monthly report messages via WhatsApp
export async function POST(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const body = await req.json();
    const { month, year, type, targetId, studentIds } = body;

    if (isNaN(month) || isNaN(year) || !type || !targetId) {
      return NextResponse.json({ success: false, error: 'المدخلات غير كاملة (month, year, type, targetId)' }, { status: 400 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Get matching students
    const where: any = {};
    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      where.id = { in: studentIds };
    } else {
      if (type === 'STUDENT') {
        where.id = targetId;
      } else if (type === 'GROUP') {
        where.groupId = targetId;
      } else if (type === 'STAGE') {
        where.academicStageId = targetId;
      }
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        academicStage: true,
        group: true,
        parent: true,
      },
    });

    const results = [];

    // Dispatch messages sequentially to avoid clogging the gateway
    for (const student of students) {
      const stats = await calculateMonthlyReportForStudent(student.id, student.groupId, month, year);
      const token = generateMagicToken(student.id, month, year);
      const magicLink = `${baseUrl}/parent-report/${token}`;
      const messageText = buildWhatsAppMessage(student, month, year, stats, magicLink);

      // Parent target phone
      const phoneTarget = student.parent?.whatsapp || student.parent?.phone || student.phone;

      if (!phoneTarget) {
        results.push({
          studentId: student.id,
          studentName: student.name,
          success: false,
          error: 'لا يوجد رقم هاتف مسجل لولي الأمر أو الطالب',
        });
        continue;
      }

      const dispatch = await tryDispatchWhatsApp(phoneTarget, messageText);

      // Log communication record in the database
      if (dispatch.success) {
        await prisma.parentCommunication.create({
          data: {
            studentId: student.id,
            date: new Date(),
            method: 'WHATSAPP',
            reason: `تقرير المتابعة الشهري لشهر ${arabicMonths[month - 1]} ${year}`,
            result: 'تم الإرسال بنجاح',
            notes: `رقم الهاتف: ${phoneTarget}`,
          },
        }).catch((e) => console.error('Failed to log parent communication:', e));
      }

      results.push({
        studentId: student.id,
        studentName: student.name,
        success: dispatch.success,
        error: dispatch.error || null,
        phone: phoneTarget,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error sending reports:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
