import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWhatsAppStatus, initWhatsApp } from '@/lib/whatsapp';
import { verifyStaff } from '@/lib/auth';

function getGatewayBaseUrl(gatewayUrl: string): string {
  if (!gatewayUrl) return '';
  const lastSlash = gatewayUrl.lastIndexOf('/');
  if (lastSlash > 8) {
    const endPart = gatewayUrl.substring(lastSlash + 1);
    if (['send', 'chat', 'status', 'qr'].includes(endPart)) {
      return gatewayUrl.substring(0, lastSlash);
    }
  }
  return gatewayUrl.replace(/\/+$/, '');
}

// GET: Live status and QR code
export async function GET(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const settings = await prisma.systemSettings.findFirst({
      select: {
        enableWhatsApp: true,
        waGatewayUrl: true,
        waApiToken: true,
        waSenderNumber: true,
      },
    });

    if (settings && settings.enableWhatsApp === false) {
      return NextResponse.json({
        success: true,
        isEnabled: false,
        isConnected: false,
        status: 'DISABLED',
        message: 'خدمة الواتساب معطلة في الإعدادات العامة',
      });
    }

    // 1. Try to query the external/local HTTP Gateway if configured
    if (settings?.waGatewayUrl) {
      const baseUrl = getGatewayBaseUrl(settings.waGatewayUrl);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${baseUrl}/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: settings.waApiToken ? `Bearer ${settings.waApiToken}` : '',
            'bypass-tunnel-reminder': 'true',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            success: true,
            isEnabled: true,
            isConnected: !!data.isConnected,
            status: data.status || (data.isConnected ? 'CONNECTED' : 'DISCONNECTED'),
            user: data.user || settings.waSenderNumber || null,
            hasQr: !!data.qr || !!data.hasQr,
            qr: data.qr || null,
            gatewayUrl: settings.waGatewayUrl,
            mode: 'GATEWAY',
          });
        }
      } catch (gwErr: any) {
        console.warn('Gateway status check failed:', gwErr.message);
      }
    }

    // 2. Direct Baileys Status (Local dev or direct hosting)
    if (process.env.VERCEL === '1') {
      return NextResponse.json({
        success: true,
        isEnabled: true,
        isConnected: false,
        status: 'DISCONNECTED',
        user: settings?.waSenderNumber || null,
        hasQr: false,
        qr: null,
        gatewayUrl: settings?.waGatewayUrl || null,
        mode: 'GATEWAY',
      });
    }

    const directStatus = getWhatsAppStatus();
    return NextResponse.json({
      success: true,
      isEnabled: true,
      isConnected: directStatus.isConnected,
      status: directStatus.status,
      user: directStatus.user?.id || settings?.waSenderNumber || null,
      hasQr: directStatus.hasQr,
      qr: directStatus.qr || null,
      gatewayUrl: settings?.waGatewayUrl || null,
      mode: 'DIRECT',
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST: Trigger reconnect / refresh QR / logout
export async function POST(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff || staff.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'reconnect' } = body;

    const settings = await prisma.systemSettings.findFirst({
      select: {
        waGatewayUrl: true,
        waApiToken: true,
      },
    });

    if (action === 'reconnect' || action === 'refresh_qr') {
      // 1. If Gateway configured, call /reconnect on gateway
      if (settings?.waGatewayUrl) {
        const baseUrl = getGatewayBaseUrl(settings.waGatewayUrl);
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const res = await fetch(`${baseUrl}/reconnect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: settings.waApiToken ? `Bearer ${settings.waApiToken}` : '',
              'bypass-tunnel-reminder': 'true',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            return NextResponse.json({
              success: true,
              message: 'تم طلب توليد كود QR جديد من البوابة',
              qr: data.qr || null,
              status: data.status,
              isConnected: data.isConnected,
            });
          }
        } catch (gwErr: any) {
          console.warn('Gateway reconnect call failed:', gwErr.message);
        }
      }

      // 2. Direct Baileys Reconnect (Only for local dev / non-Vercel)
      if (process.env.VERCEL === '1') {
        return NextResponse.json({
          success: false,
          error: 'تعذر الاتصال بخادم الواتساب المحلي. يرجى تشغيل أمر npm run whatsapp:service في التيرمنال على جهازك.',
        }, { status: 503 });
      }

      try {
        await initWhatsApp(true);
        const directStatus = getWhatsAppStatus();
        return NextResponse.json({
          success: true,
          message: 'جارٍ توليد كود QR جديد',
          qr: directStatus.qr || null,
          status: directStatus.status,
          isConnected: directStatus.isConnected,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message || 'فشل توليد رمز QR',
        }, { status: 500 });
      }
    }

    if (action === 'logout') {
      if (settings?.waGatewayUrl) {
        const baseUrl = getGatewayBaseUrl(settings.waGatewayUrl);
        try {
          await fetch(`${baseUrl}/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: settings.waApiToken ? `Bearer ${settings.waApiToken}` : '',
              'bypass-tunnel-reminder': 'true',
            },
          });
        } catch {}
      }

      return NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
