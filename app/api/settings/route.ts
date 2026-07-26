import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { platformName: 'منصة المايسترو', isRegistrationOpen: true },
      });
    }
    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { platformName, isRegistrationOpen, enableWhatsApp, welcomeMessage } = body;

    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          ...(platformName !== undefined && { platformName }),
          ...(isRegistrationOpen !== undefined && { isRegistrationOpen }),
          ...(enableWhatsApp !== undefined && { enableWhatsApp }),
          ...(welcomeMessage !== undefined && { welcomeMessage }),
        },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: { platformName: platformName || 'منصة المايسترو', isRegistrationOpen: isRegistrationOpen ?? true },
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
