import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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

      // 1. Find or create Parent
      let parent = await prisma.parent.findFirst({
        where: { phone: reqData.parentPhone },
      });

      if (!parent) {
        parent = await prisma.parent.create({
          data: {
            name: reqData.parentName,
            phone: reqData.parentPhone,
            relation: reqData.parentRelation || 'Father',
            whatsapp: reqData.parentWhatsapp,
            extraPhone: reqData.parentExtraPhone,
          },
        });
      }

      // 2. Generate student code & QR
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const studentCode = `STU-${randomNum}`;
      const qrCode = `QR-${studentCode}`;

      // 3. Create Student
      const student = await prisma.student.create({
        data: {
          code: studentCode,
          name: reqData.studentName,
          phone: reqData.studentPhone,
          academicStageId: reqData.academicStageId,
          groupId: activeGroupId,
          parentId: parent.id,
          qrCode: qrCode,
        },
      });

      // 4. Create initial subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await prisma.subscription.create({
        data: {
          studentId: student.id,
          groupId: activeGroupId,
          startDate,
          endDate,
          totalSessions: 8,
          price: 350,
          status: 'ACTIVE',
        },
      });

      // 5. Update request status to APPROVED
      await prisma.registrationRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      });

      return NextResponse.json({
        success: true,
        message: 'تم قبول الطالب بنجاح وإنشاء الحساب والـ QR Code والاشتراك!',
        student,
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
