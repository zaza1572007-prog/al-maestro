import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function GET() {
  try {
    let settings = await prisma.systemSettings.findFirst({
      select: {
        id: true,
        platformName: true,
        isRegistrationOpen: true,
        logo: true,
        favicon: true,
        primaryColor: true,
        secondaryColor: true,
        backgroundImage: true,
        welcomeMessage: true,
        loginBackground: true,
        enableDarkMode: true,
        portraitBase64: true,
        logoBase64: true,
        contactPhone: true,
        contactWhatsapp: true,
        motivationQuote: true,
        portraitOpacity: true,
        portraitScale: true,
        portraitPosition: true,
        portraitConfig: true,
        logoScale: true,
      }
    });
    if (!settings) {
      const created = await prisma.systemSettings.create({
        data: { platformName: 'منصة المايسترو', isRegistrationOpen: true },
      });
      return NextResponse.json({ success: true, settings: created });
    }
    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const staff = await verifyStaff(req);
    if (!staff || staff.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'تعديل الإعدادات مسموح لمدير النظام (OWNER) فقط' }, { status: 403 });
    }

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
      portraitPosition,
      portraitConfig,
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
          ...(portraitPosition !== undefined && { portraitPosition }),
          ...(portraitConfig !== undefined && { portraitConfig: typeof portraitConfig === 'object' ? JSON.stringify(portraitConfig) : portraitConfig }),
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
          portraitPosition: portraitPosition || 'side',
          portraitConfig: typeof portraitConfig === 'object' ? JSON.stringify(portraitConfig) : (portraitConfig || null),
          logoScale: parseFloat(logoScale || '1.0'),
        },
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
