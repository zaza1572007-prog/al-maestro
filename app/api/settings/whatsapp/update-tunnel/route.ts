import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_TOKEN = process.env.WA_API_TOKEN || 'almaestro_wa_secret_token_2026';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, gatewayUrl } = body;

    if (!token || !gatewayUrl) {
      return NextResponse.json({ success: false, error: 'Missing token or gatewayUrl' }, { status: 400 });
    }

    const normalizeToken = (t: string) => (t || '').trim().replace(/[\s_-]+/g, '').toLowerCase();
    if (normalizeToken(token) !== normalizeToken(API_TOKEN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid API Token' }, { status: 401 });
    }

    let settings = await prisma.systemSettings.findFirst();
    if (settings) {
      await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          waGatewayUrl: gatewayUrl,
          waApiToken: token,
        },
      });
    } else {
      await prisma.systemSettings.create({
        data: {
          platformName: 'منصة المايسترو',
          isRegistrationOpen: true,
          waGatewayUrl: gatewayUrl,
          waApiToken: token,
        },
      });
    }

    console.log(`✅ [Tunnel Auto-Update] Updated WhatsApp gateway URL to: ${gatewayUrl}`);
    return NextResponse.json({ success: true, message: 'Gateway URL updated successfully' });
  } catch (err: any) {
    console.error('❌ [Tunnel Auto-Update Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
