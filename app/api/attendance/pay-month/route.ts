import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/app/api/settings/whatsapp/route';
import { handleApiError } from '@/lib/error-handler';
import { verifyStaff } from '@/lib/auth';
import { calculateStudentDueMonths, ARABIC_MONTH_NAMES, getCairoNow } from '@/lib/due-months';

export async function POST(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, month, year, force } = await req.json();

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'كود الطالب مطلوب' }, { status: 400 });
    }

    // 1. Fetch student details with parent, group, academicStage, and subscriptions
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parent: true,
        group: true,
        academicStage: true,
        subscriptions: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'الطالب غير موجود' }, { status: 404 });
    }

    // 2. Check for unpaid previous months if no specific month/year was chosen and not forced
    if ((!month || !year) && !force) {
      const dueInfo = calculateStudentDueMonths(student);
      if (dueInfo.hasUnpaidPreviousMonths) {
        return NextResponse.json({
          success: false,
          warningType: 'UNPAID_PREVIOUS_MONTHS',
          error: 'توجد شهور سابقة غير مسددة على الطالب',
          student: {
            id: student.id,
            name: student.name,
            code: student.code,
            groupName: student.group?.name || 'بدون مجموعة',
            stageName: student.academicStage?.name,
            monthlyPrice: student.academicStage?.monthlyPrice ?? 350,
            phone: student.phone || student.parent?.phone,
            hasActiveSub: student.subscriptions.some(s => s.status === 'ACTIVE' || s.status === 'PAID'),
          },
          dueMonths: dueInfo.dueMonths,
        });
      }
    }

    const now = getCairoNow();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // 3. Find or create subscription for this specific month & year
    let subscription = await prisma.subscription.findFirst({
      where: {
        studentId: student.id,
        month: targetMonth,
        year: targetYear,
      },
    });

    const price = student.academicStage?.monthlyPrice ?? 350;

    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          studentId: student.id,
          groupId: student.groupId,
          startDate: startOfMonth,
          endDate: endOfMonth,
          totalSessions: 8,
          price: price,
          status: 'PAID',
          month: targetMonth,
          year: targetYear,
          paidAt: now,
        },
      });
    } else {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'PAID',
          paidAt: now,
        },
      });
    }

    // 4. Mark as fully paid by creating or updating Payment record
    const owner = await prisma.user.findFirst();
    const recorderId = owner?.id || staff.userId || '';

    const existingPayment = await prisma.payment.findFirst({
      where: { subscriptionId: subscription.id },
    });

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          paidAmount: subscription.price,
          remainingAmount: 0,
          month: targetMonth,
          year: targetYear,
          paidAt: now,
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          studentId: student.id,
          subscriptionId: subscription.id,
          totalAmount: subscription.price,
          paidAmount: subscription.price,
          remainingAmount: 0,
          recordedById: recorderId,
          notes: `دفع اشتراك شهر ${targetMonth}/${targetYear}`,
          month: targetMonth,
          year: targetYear,
          paidAt: now,
        },
      });
    }

    // 5. Send WhatsApp message to parent
    const parentPhone = student.parent?.phone || student.phone || '';
    const parentName = student.parent?.name || 'ولي الأمر';
    const monthName = ARABIC_MONTH_NAMES[targetMonth] || `شهر ${targetMonth}`;
    const messageBody = `👨‍👩‍👦 أهلاً ${parentName}،\nتم دفع اشتراك (${monthName} ${targetYear}) للطالب: ${student.name} بنجاح 🟢💵\nمنصة المايسترو 🏫`;

    let waSuccess = true;
    const settings = await prisma.systemSettings.findFirst();
    if (settings?.enableWhatsApp !== false && parentPhone) {
      sendWhatsAppMessage(parentPhone, messageBody).catch((waErr) => {
        console.warn('Failed to send payment WhatsApp message:', waErr);
      });
    } else {
      waSuccess = false;
    }

    return NextResponse.json({
      success: true,
      message: `تم تسجيل دفع اشتراك (${monthName} ${targetYear}) بنجاح`,
      waSent: waSuccess,
      month: targetMonth,
      year: targetYear,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
