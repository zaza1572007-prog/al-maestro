import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';
import bcrypt from 'bcrypt';

// PUT /api/assistants/[id] - Update assistant data & permissions
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaff(req);
    if (!staff || staff.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'غير مصرح لك بالوصول (خاص بالمستر فقط)' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, password, permissions, assignedGroupIds, isActive, notes } = body;

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing || existing.role !== 'ASSISTANT') {
      return NextResponse.json({ success: false, error: 'المساعد غير موجود' }, { status: 404 });
    }

    // Check phone uniqueness if phone is changing
    if (phone && phone.trim() !== existing.phone) {
      const phoneDuplicate = await prisma.user.findFirst({
        where: {
          phone: phone.trim(),
          NOT: { id },
        }
      });
      if (phoneDuplicate) {
        return NextResponse.json({ success: false, error: 'اسم المستخدم أو رقم الهاتف مستخدم بالفعل' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (permissions !== undefined && Array.isArray(permissions)) updateData.permissions = permissions;
    if (assignedGroupIds !== undefined && Array.isArray(assignedGroupIds)) updateData.assignedGroupIds = assignedGroupIds;

    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
      updateData.passwordPlain = password.trim();
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        passwordPlain: true,
        role: true,
        isActive: true,
        permissions: true,
        assignedGroupIds: true,
        notes: true,
        updatedAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات وصلاحيات المساعد بنجاح',
      assistant: updated,
    });
  } catch (error: any) {
    console.error('Error updating assistant:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/assistants/[id] - Remove an assistant
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaff(req);
    if (!staff || staff.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'غير مصرح لك بالوصول (خاص بالمستر فقط)' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing || existing.role !== 'ASSISTANT') {
      return NextResponse.json({ success: false, error: 'المساعد غير موجود' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف المساعد بنجاح',
    });
  } catch (error: any) {
    console.error('Error deleting assistant:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
