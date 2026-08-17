import { NextResponse } from 'next/server';
import { prisma, safeSettingsSelect } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول (Unauthorized)' }, { status: 401 });
    }

    const stages = await prisma.academicStage.findMany();
    const groups = await prisma.group.findMany();
    const parents = await prisma.parent.findMany();
    const students = await prisma.student.findMany();
    const subscriptions = await prisma.subscription.findMany();
    const attendances = await prisma.attendance.findMany();
    const payments = await prisma.payment.findMany();
    const settings = await prisma.systemSettings.findMany({ select: safeSettingsSelect });

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        stages,
        groups,
        parents,
        students,
        subscriptions,
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
    const data = body.data || body;

    if (!data) {
      return NextResponse.json({ success: false, error: 'ملف النسخة الاحتياطية غير صالح' }, { status: 400 });
    }

    let restoredCount = 0;

    // 1. Restore Stages
    if (data.stages && Array.isArray(data.stages)) {
      for (const st of data.stages) {
        await prisma.academicStage.upsert({
          where: { id: st.id },
          update: {
            name: st.name,
            level: st.level || 'High',
            grade: st.grade || '1st',
            description: st.description,
            monthlyPrice: st.monthlyPrice ?? 350,
          },
          create: {
            id: st.id,
            name: st.name,
            level: st.level || 'High',
            grade: st.grade || '1st',
            description: st.description,
            monthlyPrice: st.monthlyPrice ?? 350,
          },
        });
      }
    }

    // 2. Restore Groups
    if (data.groups && Array.isArray(data.groups)) {
      for (const g of data.groups) {
        await prisma.group.upsert({
          where: { id: g.id },
          update: {
            name: g.name,
            academicStageId: g.academicStageId,
            year: g.year || '2026',
            scheduleDays: g.scheduleDays || [],
            startTime: g.startTime || '16:00',
            endTime: g.endTime || '18:00',
            maxCapacity: g.maxCapacity ?? 30,
            location: g.location,
            description: g.description,
          },
          create: {
            id: g.id,
            name: g.name,
            academicStageId: g.academicStageId,
            year: g.year || '2026',
            scheduleDays: g.scheduleDays || [],
            startTime: g.startTime || '16:00',
            endTime: g.endTime || '18:00',
            maxCapacity: g.maxCapacity ?? 30,
            location: g.location,
            description: g.description,
          },
        });
      }
    }

    // 3. Restore Parents
    if (data.parents && Array.isArray(data.parents)) {
      for (const p of data.parents) {
        await prisma.parent.upsert({
          where: { id: p.id },
          update: {
            name: p.name,
            phone: p.phone,
            relation: p.relation || 'Father',
            whatsapp: p.whatsapp,
            extraPhone: p.extraPhone,
            qrCode: p.qrCode || `PARENT-${p.id}`,
          },
          create: {
            id: p.id,
            name: p.name,
            phone: p.phone,
            relation: p.relation || 'Father',
            whatsapp: p.whatsapp,
            extraPhone: p.extraPhone,
            qrCode: p.qrCode || `PARENT-${p.id}`,
          },
        });
      }
    }

    // 4. Restore Students
    if (data.students && Array.isArray(data.students)) {
      for (const s of data.students) {
        if (s.parentId) {
          const parentExists = await prisma.parent.findUnique({ where: { id: s.parentId } });
          if (!parentExists) {
            await prisma.parent.create({
              data: {
                id: s.parentId,
                name: `ولي أمر ${s.name}`,
                phone: s.phone || `010${Math.floor(10000000 + Math.random() * 90000000)}`,
                qrCode: `PARENT-${s.parentId}`,
              },
            });
          }
        }

        await prisma.student.upsert({
          where: { id: s.id },
          update: {
            code: s.code,
            name: s.name,
            phone: s.phone,
            academicStageId: s.academicStageId,
            groupId: s.groupId,
            parentId: s.parentId,
            qrCode: s.qrCode || `QR-${s.code}`,
            notes: s.notes,
          },
          create: {
            id: s.id,
            code: s.code,
            name: s.name,
            phone: s.phone,
            academicStageId: s.academicStageId,
            groupId: s.groupId,
            parentId: s.parentId,
            qrCode: s.qrCode || `QR-${s.code}`,
            notes: s.notes,
          },
        });
        restoredCount++;
      }
    }

    // 5. Restore Subscriptions
    if (data.subscriptions && Array.isArray(data.subscriptions)) {
      for (const sub of data.subscriptions) {
        await prisma.subscription.upsert({
          where: { id: sub.id },
          update: {
            studentId: sub.studentId,
            groupId: sub.groupId,
            startDate: new Date(sub.startDate),
            endDate: new Date(sub.endDate),
            totalSessions: sub.totalSessions ?? 8,
            usedSessions: sub.usedSessions ?? 0,
            price: sub.price ?? 350,
            status: sub.status || 'ACTIVE',
            month: sub.month,
            year: sub.year,
          },
          create: {
            id: sub.id,
            studentId: sub.studentId,
            groupId: sub.groupId,
            startDate: new Date(sub.startDate),
            endDate: new Date(sub.endDate),
            totalSessions: sub.totalSessions ?? 8,
            usedSessions: sub.usedSessions ?? 0,
            price: sub.price ?? 350,
            status: sub.status || 'ACTIVE',
            month: sub.month,
            year: sub.year,
          },
        });
      }
    }

    // 6. Restore Attendances
    if (data.attendances && Array.isArray(data.attendances)) {
      for (const att of data.attendances) {
        if (att.sessionId) {
          const sessionExists = await prisma.lessonSession.findUnique({ where: { id: att.sessionId } });
          if (!sessionExists) {
            await prisma.lessonSession.create({
              data: {
                id: att.sessionId,
                title: 'حصة حضور',
                groupId: att.groupId || (await prisma.student.findUnique({ where: { id: att.studentId } }))?.groupId || '',
                date: att.createdAt ? new Date(att.createdAt) : new Date(),
                startTime: '16:00',
                endTime: '18:00',
              },
            });
          }
        }

        await prisma.attendance.upsert({
          where: { id: att.id },
          update: {
            studentId: att.studentId,
            sessionId: att.sessionId,
            status: att.status || 'PRESENT',
            notes: att.notes,
            checkInTime: att.checkInTime ? new Date(att.checkInTime) : null,
          },
          create: {
            id: att.id,
            studentId: att.studentId,
            sessionId: att.sessionId,
            status: att.status || 'PRESENT',
            notes: att.notes,
            checkInTime: att.checkInTime ? new Date(att.checkInTime) : null,
          },
        });
      }
    }

    // 7. Restore Payments
    if (data.payments && Array.isArray(data.payments)) {
      for (const pay of data.payments) {
        await prisma.payment.upsert({
          where: { id: pay.id },
          update: {
            studentId: pay.studentId,
            subscriptionId: pay.subscriptionId,
            totalAmount: pay.totalAmount,
            paidAmount: pay.paidAmount,
            remainingAmount: pay.remainingAmount,
            recordedById: (staff as any).id || pay.recordedById,
          },
          create: {
            id: pay.id,
            studentId: pay.studentId,
            subscriptionId: pay.subscriptionId,
            totalAmount: pay.totalAmount,
            paidAmount: pay.paidAmount,
            remainingAmount: pay.remainingAmount,
            recordedById: (staff as any).id || pay.recordedById,
          },
        });
      }
    }

    // 8. Restore Settings
    if (data.settings && Array.isArray(data.settings) && data.settings.length > 0) {
      const set = data.settings[0];
      const { portraitBase64, portraitTabletBase64, portraitMobileBase64, logoBase64, ...safeSet } = set;
      await prisma.systemSettings.upsert({
        where: { id: set.id || 'default-settings' },
        update: safeSet,
        create: { ...safeSet, id: set.id || 'default-settings' },
      });
    }

    return NextResponse.json({
      success: true,
      message: `تمت استعادة النسخة الاحتياطية بنجاح! تم استعادة ${restoredCount} طالب مع كافة السجلات. 🎉`,
    });
  } catch (error: any) {
    console.error('Backup restore error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

