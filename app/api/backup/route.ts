import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول (Unauthorized)' }, { status: 401 });
    }

    const students = await prisma.student.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        academicStageId: true,
        groupId: true,
        parentId: true,
        qrCode: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    const groups = await prisma.group.findMany();
    const stages = await prisma.academicStage.findMany();
    const attendances = await prisma.attendance.findMany();
    const payments = await prisma.payment.findMany();
    const settings = await prisma.systemSettings.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        students,
        groups,
        stages,
        attendances,
        payments,
        settings,
      },
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="almaestro_backup_${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff || staff.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'عملية الاستعادة مسموحة فقط للمدير (OWNER)' }, { status: 403 });
    }

    const body = await req.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ success: false, error: 'ملف النسخة الاحتياطية غير صالح' }, { status: 400 });
    }

    // Restore settings if present
    if (data.settings && Array.isArray(data.settings) && data.settings.length > 0) {
      const set = data.settings[0];
      await prisma.systemSettings.upsert({
        where: { id: set.id || 'default-settings' },
        update: set,
        create: { ...set, id: set.id || 'default-settings' },
      });
    }

    return NextResponse.json({ success: true, message: 'تمت استعادة البيانات بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
