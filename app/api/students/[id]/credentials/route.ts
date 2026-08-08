import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل بيانات الدخول (Staff Only)' }, { status: 403 });
    }

    const { id: studentId } = await context.params;

    const body = await request.json();
    const {
      studentCode,
      studentPhone,
      studentPassword,
      parentPhone,
      parentPassword,
      qrCode,
    } = body;

    // 1. Fetch Student and Parent records
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    // 2. Prepare student data updates
    const studentData: any = {};
    if (studentCode) studentData.code = studentCode;
    if (studentPhone !== undefined) studentData.phone = studentPhone || null;
    if (qrCode) studentData.qrCode = qrCode;
    if (studentPassword) {
      if (studentPassword.length < 4) {
        return NextResponse.json({ error: 'كلمة مرور الطالب يجب ألا تقل عن 4 خانات' }, { status: 400 });
      }
      studentData.password = await bcrypt.hash(studentPassword, 10);
    }

    // 3. Prepare parent data updates
    const parentData: any = {};
    if (parentPhone) parentData.phone = parentPhone;
    if (parentPassword) {
      if (parentPassword.length < 4) {
        return NextResponse.json({ error: 'كلمة مرور ولي الأمر يجب ألا تقل عن 4 خانات' }, { status: 400 });
      }
      parentData.password = await bcrypt.hash(parentPassword, 10);
    }

    // 4. Perform updates in transaction
    await prisma.$transaction(async (tx) => {
      if (Object.keys(studentData).length > 0) {
        await tx.student.update({
          where: { id: studentId },
          data: studentData,
        });
      }
      if (student.parent && Object.keys(parentData).length > 0) {
        await tx.parent.update({
          where: { id: student.parent.id },
          data: parentData,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات الدخول والاعتماديات بنجاح!',
    });
  } catch (error: any) {
    console.error('Credentials Update Error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء تحديث البيانات' },
      { status: 500 }
    );
  }
}
