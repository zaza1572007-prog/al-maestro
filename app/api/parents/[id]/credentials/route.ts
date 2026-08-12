import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

async function tryDispatchWhatsApp(to: string, body: string) {
  try {
    if (!to || !body) return { success: false, error: 'بيانات غير كافية' };

    const settings = await prisma.systemSettings.findFirst();
    if (settings?.waGatewayUrl && settings?.waApiToken) {
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
        return { success: true };
      }
    }

    const directResult = await sendWhatsAppMessage(to, body);
    return directResult;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const { id } = await context.params;
    const parent = await prisma.parent.findUnique({
      where: { id },
      include: { students: true },
    });

    if (!parent) {
      return NextResponse.json({ success: false, error: 'ولي الأمر غير موجود' }, { status: 404 });
    }

    const targetPhone = parent.whatsapp || parent.phone;
    if (!targetPhone) {
      return NextResponse.json({ success: false, error: 'لا يوجد رقم هاتف أو واتساب مسجل لولي الأمر' }, { status: 400 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    let msg = `👨‍👩‍👦 *بيانات تسجيل الدخول لولي الأمر (منصة المايسترو)* 👨‍👩‍👦\n\n`;
    msg += `*الاسم:* أ. ${parent.name}\n`;
    msg += `*اسم المستخدم (رقم الهاتف):* ${parent.phone}\n`;
    msg += `*كلمة المرور:* ${parent.passwordPlain || '123456'}\n\n`;
    msg += `يمكنكم تسجيل الدخول ومتابعة الحضور، الغياب، النتائج، والاشتراكات لأبنائكم عبر بوابة أولياء الأمور:\n`;
    msg += `${baseUrl}/login\n\n`;
    msg += `نتمنى لأبنائكم دوام التوفيق والتميز! 🌸\n`;
    msg += `*منصة المايسترو — الأستاذ أحمد راضي كحلة*`;

    const dispatch = await tryDispatchWhatsApp(targetPhone, msg);

    if (dispatch.success) {
      // Log parent communication
      await prisma.parentCommunication.create({
        data: {
          studentId: parent.students[0]?.id || '', // Link to first student if available
          date: new Date(),
          method: 'WHATSAPP',
          reason: 'إرسال بيانات الدخول لولي الأمر يدوياً',
          result: 'تم الإرسال بنجاح',
          notes: `رقم الهاتف المستهدف: ${targetPhone}`,
        },
      }).catch((e) => console.error('Failed to log parent credentials communication:', e));

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: dispatch.error || 'فشل إرسال رسالة الواتساب' }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
