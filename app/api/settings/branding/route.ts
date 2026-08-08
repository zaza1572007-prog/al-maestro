import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;

/** GET /api/settings/branding?type=portrait|portrait-tablet|portrait-mobile|logo
 *  Returns the branding image as the actual image binary (for <img src> use).
 */
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type') ?? 'portrait';
    const settings = await prisma.systemSettings.findFirst();

    let b64: string | null | undefined = null;

    if (type === 'logo') {
      b64 = settings?.logoBase64;
    } else if (type === 'portrait-tablet') {
      // Use tablet-specific portrait or fallback to main portrait
      b64 = settings?.portraitTabletBase64 || settings?.portraitBase64;
    } else if (type === 'portrait-mobile') {
      // Use mobile-specific portrait or fallback to main portrait
      b64 = settings?.portraitMobileBase64 || settings?.portraitBase64;
    } else {
      b64 = settings?.portraitBase64;
    }

    if (!b64) {
      return new NextResponse(null, { status: 404 });
    }

    // b64 is stored as "data:<mime>;base64,<data>"
    const match = b64.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!match) {
      return new NextResponse(null, { status: 422 });
    }
    const [, mime, data] = match;
    const buffer = Buffer.from(data, 'base64');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e: any) {
    return new NextResponse(null, { status: 500 });
  }
}

/** POST /api/settings/branding
 *  Accepts a multipart form with `file` and `type` (portrait|portrait-tablet|portrait-mobile|logo).
 *  Converts the image to base64 and saves it in SystemSettings.
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string | null) ?? 'portrait';

    if (!file) {
      return NextResponse.json({ success: false, error: 'لم يتم إرسال أي صورة' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `حجم الصورة يتجاوز ${MAX_SIZE_MB} ميغابايت` },
        { status: 400 }
      );
    }

    // Convert to base64 data URI
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Map type to database field
    let updateData: any = {};
    let successMsg = 'تم رفع صورة المستر بنجاح ✅';

    if (type === 'logo') {
      updateData = { logoBase64: dataUri };
      successMsg = 'تم رفع الشعار بنجاح ✅';
    } else if (type === 'portrait-tablet') {
      updateData = { portraitTabletBase64: dataUri };
      successMsg = 'تم رفع صورة المستر المخصصة للتابلت بنجاح 📱';
    } else if (type === 'portrait-mobile') {
      updateData = { portraitMobileBase64: dataUri };
      successMsg = 'تم رفع صورة المستر المخصصة للهاتف بنجاح 📲';
    } else {
      updateData = { portraitBase64: dataUri };
      successMsg = 'تم رفع صورة المستر الرئيسية (الكمبيوتر) بنجاح 💻';
    }

    // Upsert into SystemSettings
    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: {
          platformName: 'منصة المايسترو',
          ...updateData,
        },
      });
    }

    // Return the API URL that serves this image
    const urlPath = `/api/settings/branding?type=${type}&t=${Date.now()}`;

    return NextResponse.json({
      success: true,
      url: urlPath,
      type,
      message: successMsg,
    });
  } catch (error: any) {
    console.error('[branding upload error]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'خطأ في رفع الصورة' },
      { status: 500 }
    );
  }
}
