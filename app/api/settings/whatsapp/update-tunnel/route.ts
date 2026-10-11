import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const API_TOKEN = process.env.WA_API_TOKEN || process.env.TUNNEL_SECRET || 'almaestro_wa_secret_token_2026';

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(clientIp, 'wa_update_tunnel', 'STRICT');
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: `Too many attempts. Retry in ${rateLimit.resetSeconds}s.` },
        { status: 429 }
      );
    }

    const headerSecret = req.headers.get('x-tunnel-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    const body = await req.json().catch(() => ({}));
    const { token = headerSecret, gatewayUrl } = body;

    const providedToken = (headerSecret || token || '').trim();

    if (!providedToken || !gatewayUrl) {
      return NextResponse.json({ success: false, error: 'Missing token or gatewayUrl' }, { status: 400 });
    }

    const normalizeToken = (t: string) => (t || '').trim().replace(/[\s_-]+/g, '').toLowerCase();
    if (normalizeToken(providedToken) !== normalizeToken(API_TOKEN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid API Token' }, { status: 401 });
    }

    // Strict URL validation to prevent SSRF / malicious schema injection
    try {
      const parsed = new URL(gatewayUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return NextResponse.json({ success: false, error: 'Invalid URL protocol' }, { status: 400 });
      }
      if (parsed.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
        return NextResponse.json({ success: false, error: 'Insecure HTTP only permitted for localhost' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Malformed gatewayUrl' }, { status: 400 });
    }

    let settings = await prisma.systemSettings.findFirst();
    if (settings) {
      await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          waGatewayUrl: gatewayUrl,
          waApiToken: providedToken,
        },
      });
    } else {
      await prisma.systemSettings.create({
        data: {
          platformName: 'منصة المايسترو',
          isRegistrationOpen: true,
          waGatewayUrl: gatewayUrl,
          waApiToken: providedToken,
        },
      });
    }

    console.log(`✅ [Tunnel Auto-Update] Securely updated WhatsApp gateway URL to: ${gatewayUrl}`);
    return NextResponse.json({ success: true, message: 'Gateway URL updated successfully' });
  } catch (err: any) {
    console.error('❌ [Tunnel Auto-Update Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
