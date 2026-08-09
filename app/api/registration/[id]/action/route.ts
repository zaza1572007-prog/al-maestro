import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// Helper to fill dynamic template placeholders
function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  }
  return result;
}

// Helper to send WhatsApp via direct Baileys connection or fallback HTTP gateway (fire-and-forget)
async function tryDispatchWhatsApp(to: string, body: string) {
  try {
    if (!to || !body) return;

    // Direct Baileys dispatch
    const directResult = await sendWhatsAppMessage(to, body);
    if (directResult.success) {
      console.log(`✅ [WhatsApp] Message sent successfully to ${to}`);
      return;
    }

    // Fallback to external HTTP gateway if configured
    const settings = await prisma.systemSettings.findFirst();
    if (settings?.waGatewayUrl && settings?.waApiToken) {
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
    }
  } catch (err) {
    console.warn('WhatsApp dispatch failed (non-blocking):', err);
  }
}

import { verifyStaff } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'غير مصرح لك بتنفيذ هذا الإجراء (Staff Only)' }, { status: 403 });
    }

    const { id: requestId } = await context.params;
    const { action, targetGroupId } = await request.json();

    const reqData = await prisma.registrationRequest.findUnique({
      where: { id: requestId },
      include: { academicStage: true, group: true },
    });

    if (!reqData) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    if (action === 'REJECT') {
      await prisma.registrationRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });
      return NextResponse.json({ success: true, message: 'تم رفض الطلب' });
    }

    if (action === 'APPROVE') {
      const activeGroupId = targetGroupId || reqData.groupId;

      // Verify the target group exists
      const targetGroup = await prisma.group.findUnique({ where: { id: activeGroupId } });
      if (!targetGroup) {
        return NextResponse.json(
          { success: false, error: 'المجموعة المحددة لم تعد موجودة. يرجى تحديث الصفحة والمحاولة مرة أخرى.' },
          { status: 400 }
        );
      }

      // Verify the academic stage exists
      const targetStage = await prisma.academicStage.findUnique({ where: { id: reqData.academicStageId } });
      if (!targetStage) {
        return NextResponse.json(
          { success: false, error: 'المرحلة الدراسية المحددة في الطلب لم تعد موجودة.' },
          { status: 400 }
        );
      }

      // 0. Check if student phone already exists
      const existingStudent = await prisma.student.findFirst({
        where: { phone: reqData.studentPhone },
      });
      if (existingStudent) {
        return NextResponse.json(
          { success: false, error: `رقم هاتف الطالب (${reqData.studentPhone}) مسجل بالفعل لطالب آخر (${existingStudent.name}). يرجى رفض الطلب أو تعديل الرقم.` },
          { status: 400 }
        );
      }

      // 1. Find or create Parent
      let parent = await prisma.parent.findFirst({
        where: { phone: reqData.parentPhone },
      });

      const parentPassword = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedParentPassword = await bcrypt.hash(parentPassword, 10);

      if (!parent) {
        parent = await prisma.parent.create({
          data: {
            name: reqData.parentName,
            phone: reqData.parentPhone,
            relation: reqData.parentRelation || 'Father',
            whatsapp: reqData.parentWhatsapp || null,
            extraPhone: reqData.parentExtraPhone || null,
            password: hashedParentPassword,
            passwordPlain: parentPassword,
          },
        });
      } else {
        // Update parent's extra data and set password if missing
        const updateData: any = {};
        if (reqData.parentWhatsapp) updateData.whatsapp = reqData.parentWhatsapp;
        if (reqData.parentExtraPhone) updateData.extraPhone = reqData.parentExtraPhone;
        if (!parent.password) {
          updateData.password = hashedParentPassword;
          updateData.passwordPlain = parentPassword;
        }
        if (Object.keys(updateData).length > 0) {
          parent = await prisma.parent.update({
            where: { id: parent.id },
            data: updateData,
          });
        }
      }

      // 2. Generate unique student code & QR with retry
      let studentCode = '';
      let qrCode = '';
      for (let i = 0; i < 10; i++) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const candidate = `STU-${randomNum}`;
        const exists = await prisma.student.findFirst({ where: { code: candidate } });
        if (!exists) {
          studentCode = candidate;
          qrCode = `QR-${candidate}`;
          break;
        }
      }
      if (!studentCode) {
        studentCode = `STU-${Date.now().toString().slice(-6)}`;
        qrCode = `QR-${studentCode}`;
      }

      // 3. Create Student
      const studentPassword = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedStudentPassword = await bcrypt.hash(studentPassword, 10);

      const student = await prisma.student.create({
        data: {
          code: studentCode,
          name: reqData.studentName,
          phone: reqData.studentPhone,
          academicStageId: reqData.academicStageId,
          groupId: activeGroupId,
          parentId: parent.id,
          qrCode: qrCode,
          password: hashedStudentPassword,
          passwordPlain: studentPassword,
        },
      });

      // 4. Create initial subscription
      const startDate = new Date();
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);

      await prisma.subscription.create({
        data: {
          studentId: student.id,
          groupId: activeGroupId,
          startDate,
          endDate,
          totalSessions: 8,
          price: targetStage.monthlyPrice ?? 350,
          status: 'ACTIVE',
        },
      });

      // 5. Update request status to APPROVED
      await prisma.registrationRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      });

      // 6. Dispatch WhatsApp credentials (fire-and-forget, non-blocking)
      const settings = await prisma.systemSettings.findFirst();
      if (settings?.enableWhatsApp) {
        // Student message
        const studentTpl = settings.waTplStudent || '🎓 مرحباً [student_name]\nتم إنشاء حسابك بمنصة المايسترو.\nاسم المستخدم: [username]\nكلمة المرور: [password]\nبتوفيق 🌟';
        const studentMsg = fillTemplate(studentTpl, {
          student_name: reqData.studentName,
          username: reqData.studentPhone,
          password: studentPassword,
        });
        tryDispatchWhatsApp(reqData.studentPhone, studentMsg);

        // Parent message (use whatsapp number if available, fallback to main phone)
        const parentTpl = settings.waTplParent || '👨‍👩‍👦 أهلاً [parent_name]\nتم تسجيل [student_name] بمنصة المايسترو.\nاسم المستخدم: [username]\nكلمة المرور: [password]\nبتوفيق 🌟';
        const parentMsg = fillTemplate(parentTpl, {
          parent_name: reqData.parentName,
          student_name: reqData.studentName,
          username: reqData.parentPhone,
          password: parentPassword,
        });
        const parentWhatsappTarget = reqData.parentWhatsapp || reqData.parentPhone;
        tryDispatchWhatsApp(parentWhatsappTarget, parentMsg);
      }

      return NextResponse.json({
        success: true,
        message: 'تم قبول الطالب بنجاح وإنشاء الحساب والـ QR Code والاشتراك!',
        student,
        credentials: {
          studentCode,
          studentPassword,
          parentPassword,
        },
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    console.error('Approve Error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء معالجة الطلب' },
      { status: 500 }
    );
  }
}
