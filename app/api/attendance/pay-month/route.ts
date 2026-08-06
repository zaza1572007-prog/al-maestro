import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/app/api/settings/whatsapp/route';
import { handleApiError } from '@/lib/error-handler';

import { verifyStaff } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'كود الطالب مطلوب' }, { status: 400 });
    }

    // 1. Fetch student details with parent
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { parent: true, group: true, academicStage: true },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'الطالب غير موجود' }, { status: 404 });
    }

    // 2. Find or create a subscription for this student in their current group
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Look for subscription that overlaps with current month
    let subscription = await prisma.subscription.findFirst({
      where: {
        studentId: student.id,
        groupId: student.groupId,
        endDate: { gte: startOfMonth },
      },
      orderBy: { endDate: 'desc' },
    });

    const price = student?.academicStage?.monthlyPrice ?? 350; // stage subscription price

    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          studentId: student.id,
          groupId: student.groupId,
          startDate: now,
          endDate: endOfMonth,
          totalSessions: 8,
          price: price,
          status: 'ACTIVE',
        },
      });
    }

    // 3. Mark as fully paid by creating a Payment record
    const owner = await prisma.user.findFirst();
    const recorderId = owner?.id || '';

    // Check if they already paid this subscription
    const existingPayment = await prisma.payment.findFirst({
      where: { subscriptionId: subscription.id },
    });

    if (existingPayment) {
      // Just update it to be fully paid
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          paidAmount: subscription.price,
          remainingAmount: 0,
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
          notes: 'دفع سريع من ماسح الباركود',
        },
      });
    }

    // 4. Send WhatsApp message to parent
    const parentPhone = student.parent?.phone || student.phone;
    const parentName = student.parent?.name || 'ولي الأمر';
    const messageBody = `👨‍👩‍👦 أهلاً ${parentName}،\nتم دفع اشتراك الشهر للطالب: ${student.name} وصحح الواجب الخاص به بنجاح 🟢\nمنصة المايسترو 🏫`;

    let waSuccess = false;
    try {
      await sendWhatsAppMessage(parentPhone, messageBody);
      waSuccess = true;
    } catch (waErr) {
      console.warn('Failed to send payment WhatsApp message:', waErr);
    }

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل دفع الاشتراك بنجاح',
      waSent: waSuccess,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
