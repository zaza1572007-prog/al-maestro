import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parent = await prisma.parent.findUnique({
      where: { id: payload.userId as string }
    });

    if (!parent) {
      return NextResponse.json({ success: false, error: 'Parent not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      parent: {
        id: parent.id,
        name: parent.name,
        phone: parent.phone,
        relation: parent.relation,
        whatsapp: parent.whatsapp || '',
        extraPhone: parent.extraPhone || ''
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
    if (!payload || payload.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parentId = payload.userId as string;
    const body = await req.json();
    const { phone, whatsapp, password } = body;

    // Validate phone uniqueness
    if (phone) {
      if (phone.trim() === '') {
        return NextResponse.json({ success: false, error: 'رقم الهاتف لا يمكن أن يكون فارغاً' }, { status: 400 });
      }
      const existingParent = await prisma.parent.findFirst({
        where: {
          phone,
          NOT: { id: parentId }
        }
      });
      if (existingParent) {
        return NextResponse.json({ success: false, error: 'رقم الهاتف مستخدم بالفعل من قبل حساب آخر' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (phone) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;

    if (password) {
      if (password.length < 4) {
        return NextResponse.json({ success: false, error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password, 10);
      updateData.passwordPlain = password;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'لا توجد حقول للتحديث' }, { status: 400 });
    }

    await prisma.parent.update({
      where: { id: parentId },
      data: updateData
    });

    return NextResponse.json({ success: true, message: 'تم تحديث البيانات بنجاح' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
