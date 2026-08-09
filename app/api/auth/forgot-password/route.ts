import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { phone, role } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف مطلوب' }, { status: 400 });
    }

    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let targetPhone = phone;
    let messageText = '';

    if (role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { phone },
        include: { parent: true }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: 'لم يتم العثور على طالب مسجل بهذا الرقم' }, { status: 404 });
      }

      // Update student password
      await prisma.student.update({
        where: { id: student.id },
        data: {
          password: hashedPassword,
        }
      });

      // Prepare message
      messageText = `🔑 استعادة كلمة المرور - بوابة الطالب\n\nأهلاً بك يا ${student.name}،\nلقد طلبت إعادة تعيين كلمة المرور الخاصة بحسابك.\n\nبيانات الدخول الجديدة:\nاسم المستخدم: ${student.phone}\nكلمة المرور: ${newPassword}\n\nتمنياتنا لك بالتوفيق والنجاح 🌟`;
      targetPhone = student.phone;
    } else if (role === 'PARENT') {
      const parent = await prisma.parent.findFirst({
        where: { phone }
      });

      if (!parent) {
        return NextResponse.json({ success: false, error: 'لم يتم العثور على ولي أمر مسجل بهذا الرقم' }, { status: 404 });
      }

      // Update parent password
      await prisma.parent.update({
        where: { id: parent.id },
        data: {
          password: hashedPassword,
        }
      });

      // Prepare message
      messageText = `🔑 استعادة كلمة المرور - بوابة ولي الأمر\n\nأهلاً بك يا أ. ${parent.name}،\nلقد طلبت إعادة تعيين كلمة المرور الخاصة بحساب المتابعة الخاص بك.\n\nبيانات الدخول الجديدة:\nاسم المستخدم: ${parent.phone}\nكلمة المرور: ${newPassword}\n\nتمنياتنا لأبنائك بالتوفيق والنجاح 🌟`;
      targetPhone = parent.whatsapp || parent.phone;
    } else {
      return NextResponse.json({ success: false, error: 'الدور المحدد غير صالح' }, { status: 400 });
    }

    // Dispatch WhatsApp message via direct Baileys connection or fallback HTTP gateway
    const sendResult = await sendWhatsAppMessage(targetPhone, messageText);
    if (!sendResult.success) {
      const settings = await prisma.systemSettings.findFirst();
      if (settings?.waGatewayUrl && settings?.waApiToken) {
        const res = await fetch(settings.waGatewayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.waApiToken}`,
          },
          body: JSON.stringify({
            token: settings.waApiToken,
            to: targetPhone,
            body: messageText,
          }),
        });

        if (!res.ok) {
          return NextResponse.json({
            success: false,
            error: 'فشل إرسال الرسالة عبر الواتساب. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.'
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({
          success: false,
          error: sendResult.error || 'فشل إرسال الرسالة عبر الواتساب'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم إرسال كلمة المرور الجديدة بنجاح إلى رقم الواتساب الخاص بك!'
    });
  } catch (err: any) {
    console.error('Forgot Password Recovery Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
