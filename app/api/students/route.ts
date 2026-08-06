import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

// Helper to fill dynamic template placeholders
function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  }
  return result;
}

// Helper to send WhatsApp via configured HTTP gateway (fire-and-forget)
async function tryDispatchWhatsApp(to: string, body: string) {
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (!settings?.enableWhatsApp || !settings?.waGatewayUrl || !settings?.waApiToken) return;

    await fetch(settings.waGatewayUrl, {
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
  } catch (err) {
    console.warn('WhatsApp dispatch failed (non-blocking):', err);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const academicStageId = searchParams.get('academicStageId') || searchParams.get('stageId');
    const search = searchParams.get('search');

    const where: any = {};
    if (groupId) where.groupId = groupId;
    if (academicStageId) where.academicStageId = academicStageId;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        academicStage: true,
        group: true,
        parent: true,
        subscriptions: {
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, students });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, phone, academicStageId, groupId, parentName, parentPhone, parentRelation, parentWhatsapp, parentExtraPhone } = await req.json();

    // Validate required fields
    if (!name || !phone || !academicStageId || !groupId) {
      return NextResponse.json({ success: false, error: 'جميع الحقول المطلوبة يجب ملؤها (الاسم، الهاتف، المرحلة، المجموعة)' }, { status: 400 });
    }

    // Verify the academicStageId and groupId exist
    const [stage, group] = await Promise.all([
      prisma.academicStage.findUnique({ where: { id: academicStageId } }),
      prisma.group.findUnique({ where: { id: groupId } }),
    ]);
    if (!stage) {
      return NextResponse.json({ success: false, error: 'المرحلة الدراسية المحددة غير موجودة. يرجى اختيار مرحلة صالحة.' }, { status: 400 });
    }
    if (!group) {
      return NextResponse.json({ success: false, error: 'المجموعة المحددة غير موجودة. يرجى اختيار مجموعة صالحة.' }, { status: 400 });
    }

    // Check if student phone already exists
    const existingStudent = await prisma.student.findFirst({
      where: { phone },
    });
    if (existingStudent) {
      return NextResponse.json({ success: false, error: 'رقم هاتف الطالب مسجل بالفعل لطالب آخر. يرجى استخدام رقم مختلف.' }, { status: 400 });
    }

    // Create or find parent
    const actualParentPhone = parentPhone || phone;
    let parent = await prisma.parent.findFirst({
      where: { phone: actualParentPhone },
    });

    // Track the plain text parent password for display
    const parentPasswordPlain = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedParentPassword = await bcrypt.hash(parentPasswordPlain, 10);

    if (!parent) {
      parent = await prisma.parent.create({
        data: {
          name: parentName || `ولي أمر ${name}`,
          phone: actualParentPhone,
          relation: parentRelation || 'Father',
          whatsapp: parentWhatsapp || null,
          extraPhone: parentExtraPhone || null,
          password: hashedParentPassword,
          passwordPlain: parentPasswordPlain,
        },
      });
    } else {
      // Update parent's extra info if provided
      const updateData: any = {};
      if (parentName) updateData.name = parentName;
      if (parentWhatsapp) updateData.whatsapp = parentWhatsapp;
      if (parentExtraPhone) updateData.extraPhone = parentExtraPhone;
      if (parentRelation) updateData.relation = parentRelation;
      if (!parent.password) {
        updateData.password = hashedParentPassword;
        updateData.passwordPlain = parentPasswordPlain;
      }
      if (Object.keys(updateData).length > 0) {
        parent = await prisma.parent.update({
          where: { id: parent.id },
          data: updateData,
        });
      }
    }

    // Generate unique student code with retry
    let code = '';
    let qrCode = '';
    for (let i = 0; i < 10; i++) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const candidate = `STU-${randomNum}`;
      const exists = await prisma.student.findFirst({ where: { code: candidate } });
      if (!exists) {
        code = candidate;
        qrCode = `QR-${candidate}`;
        break;
      }
    }
    if (!code) {
      // Fallback: use timestamp-based code
      code = `STU-${Date.now().toString().slice(-6)}`;
      qrCode = `QR-${code}`;
    }

    const studentPasswordPlain = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedStudentPassword = await bcrypt.hash(studentPasswordPlain, 10);

    const student = await prisma.student.create({
      data: {
        code,
        name,
        phone,
        password: hashedStudentPassword,
        passwordPlain: studentPasswordPlain,
        academicStageId,
        groupId,
        parentId: parent.id,
        qrCode,
      },
      include: {
        academicStage: true,
        group: true,
        parent: true,
      },
    });

    // Create initial subscription ending at the end of the current month
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    await prisma.subscription.create({
      data: {
        studentId: student.id,
        groupId: groupId,
        startDate: now,
        endDate: endOfMonth,
        totalSessions: 8,
        price: student.academicStage?.monthlyPrice ?? 350,
        status: 'ACTIVE',
      },
    });

    // Dispatch WhatsApp welcome messages (fire-and-forget, non-blocking)
    const settings = await prisma.systemSettings.findFirst();
    if (settings?.enableWhatsApp) {
      // Student message
      const studentTpl = settings.waTplStudent || '🎓 مرحباً [student_name]\nتم إنشاء حسابك بمنصة المايسترو.\nاسم المستخدم: [username]\nكلمة المرور: [password]\nبتوفيق 🌟';
      const studentMsg = fillTemplate(studentTpl, {
        student_name: name,
        username: phone,
        password: studentPasswordPlain,
      });
      tryDispatchWhatsApp(phone, studentMsg);

      // Parent message
      const parentTpl = settings.waTplParent || '👨‍👩‍👦 أهلاً [parent_name]\nتم تسجيل [student_name] بمنصة المايسترو.\nاسم المستخدم: [username]\nكلمة المرور: [password]\nبتوفيق 🌟';
      const parentMsg = fillTemplate(parentTpl, {
        parent_name: parent.name,
        student_name: name,
        username: actualParentPhone,
        password: parentPasswordPlain,
      });
      const parentWhatsappTarget = parentWhatsapp || actualParentPhone;
      tryDispatchWhatsApp(parentWhatsappTarget, parentMsg);
    }

    return NextResponse.json({
      success: true,
      student,
      credentials: {
        studentCode: code,
        studentPassword: studentPasswordPlain,
        parentPassword: parentPasswordPlain,
      },
    });
  } catch (e: any) {
    console.error('Create student error:', e);
    // Handle Prisma unique constraint errors
    if (e.code === 'P2002') {
      const field = e.meta?.target?.[0] || 'حقل';
      return NextResponse.json({ success: false, error: `القيمة المُدخلة في ${field} موجودة بالفعل. يرجى استخدام قيمة مختلفة.` }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: e.message || 'حدث خطأ أثناء إضافة الطالب' }, { status: 500 });
  }
}

