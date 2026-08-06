import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await context.params;
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

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
    if (studentPhone) studentData.phone = studentPhone;
    if (qrCode) studentData.qrCode = qrCode;
    if (studentPassword) {
      studentData.password = await bcrypt.hash(studentPassword, 10);
      studentData.passwordPlain = studentPassword;
    }

    // 3. Prepare parent data updates
    const parentData: any = {};
    if (parentPhone) parentData.phone = parentPhone;
    if (parentPassword) {
      parentData.password = await bcrypt.hash(parentPassword, 10);
      parentData.passwordPlain = parentPassword;
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
