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

    const student = subscription.student;
    const parent = student?.parent;
    const targetPhone = parent?.whatsapp || parent?.phone || student?.phone;

    if (!targetPhone) {
      return NextResponse.json({ success: false, error: 'لا يوجد رقم هاتف أو واتساب مسجل للاتصال بولي الأمر.' }, { status: 400 });
    }

    // 3. Construct WhatsApp reminder message
    const settings = await prisma.systemSettings.findFirst();
    const tpl = settings?.waTplReminder || `👨‍👩‍👦 *تذكير بسداد الاشتراك - منصة المايسترو* 👨‍👩‍👦\n\nنود تذكيركم بعدم سداد اشتراك شهر [month]/[year] للطالب: *[student_name]*.\n\nالرجاء السداد في أقرب وقت. شاكرين تعاونكم المستمر 🌸\n*الأستاذ أحمد راضي كحلة*`;

    const msg = fillTemplate(tpl, {
      student_name: student.name,
      student_code: student.code,
      month: String(subscription.month || ''),
      year: String(subscription.year || ''),
    });

    let waSuccess = false;
    let waError = '';

    try {
      const resWa = await sendWhatsAppMessage(targetPhone, msg);
      if (resWa.success) {
        waSuccess = true;
      } else {
        waError = 'فشل إرسال رسالة الواتساب عبر البوابة.';
      }
    } catch (waErr: any) {
      console.warn('WhatsApp reminder failed:', waErr);
      waError = waErr.message || 'حدث خطأ في إرسال رسالة الواتساب.';
    }

    // 4. Log the communication history in ParentCommunication
    await prisma.parentCommunication.create({
      data: {
        studentId: student.id,
        date: new Date(),
        method: 'WHATSAPP',
        reason: `إنذار عدم سداد اشتراك شهر ${subscription.month}/${subscription.year}`,
        result: waSuccess ? 'تم الإرسال بنجاح' : `فشل الإرسال: ${waError}`,
        notes: `رقم الهاتف المستهدف: ${targetPhone}. تم التسجيل بواسطة: ${staff.name}`,
      },
    }).catch((logErr) => {
      console.error('Failed to log parent communication for reminder:', logErr);
    });

    if (!waSuccess) {
      return NextResponse.json({
        success: false,
        error: waError || 'فشل إرسال رسالة التذكير عبر الواتساب.'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'تم إرسال رسالة التذكير لولي الأمر بنجاح عبر الواتساب.'
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
