import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { id: payload.userId as string },
      include: {
        academicStage: true,
        group: true,
        parent: true
      }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        code: student.code,
        phone: student.phone,
        profileImage: student.profileImage,
        qrCode: student.qrCode,
        notes: student.notes,
        stageName: student.academicStage?.name || 'غير محدد',
        groupName: student.group?.name || 'غير محدد',
        parentName: student.parent?.name || 'غير محدد',
        parentPhone: student.parent?.phone || 'غير محدد',
        parentRelation: student.parent?.relation || 'أب',
        parentWhatsapp: student.parent?.whatsapp || ''
      }
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = payload.userId as string;
    const body = await req.json();
    const { phone, password } = body;

    // Validate phone if changing
    if (phone) {
      if (phone.trim() === '') {
        return NextResponse.json({ success: false, error: 'رقم الهاتف لا يمكن أن يكون فارغاً' }, { status: 400 });
      }

      const existingStudent = await prisma.student.findFirst({
        where: {
          phone,
          NOT: { id: studentId }
        }
      });

      if (existingStudent) {
        return NextResponse.json({ success: false, error: 'رقم الهاتف مستخدم بالفعل من قبل طالب آخر' }, { status: 400 });
      }
    }

    // Build update data
    const updateData: any = {};
    if (phone) updateData.phone = phone;
    
    if (password) {
      if (password.length < 4) {
        return NextResponse.json({ success: false, error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password, 10);
      updateData.passwordPlain = password; // maintain clear text for teacher panel references
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'لا توجد حقول للتحديث' }, { status: 400 });
    }

    await prisma.student.update({
      where: { id: studentId },
      data: updateData
    });

    return NextResponse.json({ success: true, message: 'تم تحديث البيانات بنجاح' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
