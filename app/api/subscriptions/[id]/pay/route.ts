import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';
import { sendWhatsAppMessage, fillTemplate } from '@/app/api/settings/whatsapp/route';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify staff permissions
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { paidAmount, paymentMethod, paidAt, notes } = body;

    if (paidAmount === undefined || paidAmount === null) {
      return NextResponse.json({ success: false, error: 'المبلغ المدفوع مطلوب' }, { status: 400 });
    }

    const newPaidAmount = parseFloat(paidAmount);
    if (isNaN(newPaidAmount) || newPaidAmount < 0) {
      return NextResponse.json({ success: false, error: 'مبلغ غير صالح' }, { status: 400 });
    }

    // 2. Fetch the subscription with student and parent details
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'الاشتراك غير موجود' }, { status: 404 });
    }

    const paidAtDate = paidAt ? new Date(paidAt) : new Date();

    // 3. Calculate payments made so far
    const payments = await prisma.payment.findMany({
      where: { subscriptionId: subscription.id },
    });
    const currentPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalPaidSoFar = currentPaid + newPaidAmount;
    const remaining = subscription.price - totalPaidSoFar;

    // 4. Perform atomic transaction: create payment and update subscription
    let paymentRecord;
    let updatedSub;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            studentId: subscription.studentId,
            subscriptionId: subscription.id,
            totalAmount: subscription.price,
            paidAmount: newPaidAmount,
            remainingAmount: remaining >= 0 ? remaining : 0,
            paymentMethod: paymentMethod || 'CASH',
            recordedById: staff.userId,
            notes: notes || 'سداد من شاشة الاشتراكات',
            month: subscription.month,
            year: subscription.year,
            paidAt: paidAtDate,
          },
        });

        const sub = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: totalPaidSoFar >= subscription.price ? 'PAID' : 'PARTIALLY_PAID',
            paidAt: paidAtDate,
          },
        });

        return { payment, sub };
      });

      paymentRecord = result.payment;
      updatedSub = result.sub;
    } catch (dbErr: any) {
      return NextResponse.json({ success: false, error: `فشل تسجيل الدفعة في قاعدة البيانات: ${dbErr.message}` }, { status: 500 });
    }

    // 5. Send WhatsApp receipt notification gracefully
    let waSuccess = false;
    let waError = '';

    try {
      const student = subscription.student;
      const parent = student?.parent;
      const targetPhone = parent?.whatsapp || parent?.phone || student?.phone;

      if (targetPhone) {
        const settings = await prisma.systemSettings.findFirst();
        const tpl = settings?.waTplPayment || `👨‍👩‍👦 *تأكيد استلام نقدية - منصة المايسترو* 👨‍👩‍👦\n\nتم استلام قيمة اشتراك شهر [month]/[year] للطالب: *[student_name]*.\n\n*المبلغ المدفوع:* [paid_amount] ج.م\n*حالة الاشتراك:* [status]\n*المتبقي:* [remaining_amount] ج.م\n*تاريخ الدفع:* [payment_date]\n\nشكراً لكم وثقتكم بنا 🌸\n*الأستاذ أحمد راضي كحلة*`;
        
        const statusText = totalPaidSoFar >= subscription.price ? 'مدفوع بالكامل ✅' : 'مدفوع جزئياً 🟡';
        const dateStr = paidAtDate.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });

        const msg = fillTemplate(tpl, {
          student_name: student.name,
          student_code: student.code,
          month: String(subscription.month || ''),
          year: String(subscription.year || ''),
          paid_amount: String(newPaidAmount),
          status: statusText,
          remaining_amount: String(remaining >= 0 ? remaining : 0),
          payment_date: dateStr,
        });

        const resWa = await sendWhatsAppMessage(targetPhone, msg);
        if (resWa.success) {
          waSuccess = true;
        } else {
          waError = 'فشل إرسال رسالة الواتساب لولي الأمر.';
        }
      } else {
        waError = 'لا يوجد رقم هاتف أو واتساب مسجل للطالب أو ولي الأمر لإرسال إيصال السداد.';
      }
    } catch (waErr: any) {
      console.warn('WhatsApp notification failed:', waErr);
      waError = waErr.message || 'فشل إرسال إشعار الواتساب.';
    }

    return NextResponse.json({
      success: true,
      payment: paymentRecord,
      subscription: updatedSub,
      waSent: waSuccess,
      waError: waError || undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
