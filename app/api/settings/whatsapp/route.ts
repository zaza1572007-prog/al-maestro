import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Utility: send a WhatsApp message via configured HTTP gateway
export async function sendWhatsAppMessage(to: string, body: string) {
  const settings = await prisma.systemSettings.findFirst();
  if (!settings?.waGatewayUrl || !settings?.waApiToken) {
    throw new Error('WhatsApp gateway not configured');
  }

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gateway responded ${res.status}: ${text}`);
  }

  return await res.json();
}

// Replace template placeholders with actual values
export function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  }
  return result;
}

// GET: load WhatsApp gateway settings
export async function GET() {
  try {
    const settings = await prisma.systemSettings.findFirst();
    return NextResponse.json({
      success: true,
      settings: {
        gatewayUrl: settings?.waGatewayUrl || '',
        apiToken: settings?.waApiToken || '',
        senderNumber: settings?.waSenderNumber || '',
        templates: {
          student: settings?.waTplStudent || '',
          parent: settings?.waTplParent || '',
          attendance: settings?.waTplAttendance || '',
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// PUT: save gateway settings + templates
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { gatewayUrl, apiToken, senderNumber, templates } = body;

    let settings = await prisma.systemSettings.findFirst();
    const data: Record<string, any> = {};
    if (gatewayUrl !== undefined) data.waGatewayUrl = gatewayUrl;
    if (apiToken !== undefined) data.waApiToken = apiToken;
    if (senderNumber !== undefined) data.waSenderNumber = senderNumber;
    if (templates?.student !== undefined) data.waTplStudent = templates.student;
    if (templates?.parent !== undefined) data.waTplParent = templates.parent;
    if (templates?.attendance !== undefined) data.waTplAttendance = templates.attendance;

    if (settings) {
      await prisma.systemSettings.update({ where: { id: settings.id }, data });
    } else {
      await prisma.systemSettings.create({
        data: { platformName: 'منصة المايسترو', isRegistrationOpen: true, ...data },
      });
    }

    // Try to trigger auto-connect on the WhatsApp gateway
    const targetGateway = gatewayUrl || settings?.waGatewayUrl;
    const targetToken = apiToken || settings?.waApiToken;
    const targetSender = senderNumber || settings?.waSenderNumber;

    if (targetGateway) {
      try {
        const lastSlash = targetGateway.lastIndexOf('/');
        const baseUrl = lastSlash !== -1 ? targetGateway.substring(0, lastSlash) : targetGateway;

        const requestBody = JSON.stringify({
          token: targetToken,
          number: targetSender,
          phone: targetSender,
        });

        // Trigger connection/init endpoints asynchronously
        fetch(`${baseUrl}/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        }).catch(() => {});

        fetch(`${baseUrl}/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        }).catch(() => {});
        
        fetch(`${baseUrl}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        }).catch(() => {});
      } catch (err) {
        console.warn('Failed to fire auto-connect trigger:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST: send a test message OR dispatch credentials
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, to, message } = body;

    if (action === 'test') {
      if (!to) return NextResponse.json({ success: false, error: 'رقم الهاتف مطلوب' }, { status: 400 });
      const testMsg = `✅ رسالة اختبارية من منصة المايسترو\nتم ربط الواتساب بنجاح!\nالوقت: ${new Date().toLocaleString('ar-EG')}`;
      await sendWhatsAppMessage(to, testMsg);
      return NextResponse.json({ success: true, message: 'تم إرسال رسالة الاختبار' });
    }

    if (action === 'send') {
      if (!to || !message) return NextResponse.json({ success: false, error: 'رقم الهاتف والرسالة مطلوبان' }, { status: 400 });
      await sendWhatsAppMessage(to, message);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
