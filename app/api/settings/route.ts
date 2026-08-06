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
    const { 
      platformName, 
      isRegistrationOpen, 
      enableWhatsApp, 
      welcomeMessage, 
      primaryColor, 
      secondaryColor,
      contactPhone,
      contactWhatsapp,
      motivationQuote,
      portraitOpacity,
      portraitScale,
      logoScale
    } = body;

    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          ...(platformName !== undefined && { platformName }),
          ...(isRegistrationOpen !== undefined && { isRegistrationOpen }),
          ...(enableWhatsApp !== undefined && { enableWhatsApp }),
          ...(welcomeMessage !== undefined && { welcomeMessage }),
          ...(primaryColor !== undefined && { primaryColor }),
          ...(secondaryColor !== undefined && { secondaryColor }),
          ...(contactPhone !== undefined && { contactPhone }),
          ...(contactWhatsapp !== undefined && { contactWhatsapp }),
          ...(motivationQuote !== undefined && { motivationQuote }),
          ...(portraitOpacity !== undefined && { portraitOpacity: parseFloat(portraitOpacity) }),
          ...(portraitScale !== undefined && { portraitScale: parseFloat(portraitScale) }),
          ...(logoScale !== undefined && { logoScale: parseFloat(logoScale) }),
        },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: { 
          platformName: platformName || 'منصة المايسترو', 
          isRegistrationOpen: isRegistrationOpen ?? true,
          primaryColor: primaryColor || '#8b5cf6',
          secondaryColor: secondaryColor || '#3b82f6',
          contactPhone: contactPhone || '',
          contactWhatsapp: contactWhatsapp || '',
          motivationQuote: motivationQuote || '',
          portraitOpacity: parseFloat(portraitOpacity || '0.18'),
          portraitScale: parseFloat(portraitScale || '1.0'),
          logoScale: parseFloat(logoScale || '1.0'),
        },
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
