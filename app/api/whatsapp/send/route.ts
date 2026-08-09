import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, initWhatsApp, getWhatsAppStatus } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف ومحتوى الرسالة مطلوبان (phone, message)' },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage(phone, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'تم إرسال رسالة الواتساب بنجاح 🎉',
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'فشل إرسال الرسالة' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    let status = getWhatsAppStatus();
    if (!status.isConnected && status.status === 'DISCONNECTED') {
      // Trigger initialization in background
      initWhatsApp().catch((e) => console.error('Auto init WA error:', e.message));
      status = getWhatsAppStatus();
    }

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'فشل قراءة حالة خدمة الواتساب' },
      { status: 500 }
    );
  }
}
