import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';
import bcrypt from 'bcrypt';

// GET /api/assistants - List all assistants
export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff || staff.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'غير مصرح لك بالوصول (خاص بالمستر فقط)' }, { status: 403 });
    }

    const assistants = await prisma.user.findMany({
      where: { role: 'ASSISTANT' },
      select: {
        id: true,
        name: true,
        phone: true,
        passwordPlain: true,
        role: true,
        profileImage: true,
        isActive: true,
        permissions: true,
        assignedGroupIds: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            attendances: true,
            lessonSessions: true,
            tasks: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      assistants,
    });
  } catch (error: any) {
    console.error('Error fetching assistants:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/assistants - Create a new assistant
export async function POST(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff || staff.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'غير مصرح لك بالوصول (خاص بالمستر فقط)' }, { status: 403 });
    }

    const body = await req.json();
    const { name, phone, password, permissions = [], assignedGroupIds = [], notes = '' } = body;

    if (!name?.trim() || !phone?.trim() || !password?.trim()) {
      return NextResponse.json({ success: false, error: 'الاسم، ورقم الهاتف/اسم المستخدم، وكلمة المرور حقول مطلوبة' }, { status: 400 });
    }

    // Check if phone/username already exists in User
    const existing = await prisma.user.findFirst({
      where: { phone: phone.trim() },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'اسم المستخدم أو رقم الهاتف مستخدم بالفعل لمستخدم آخر' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const newAssistant = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        password: hashedPassword,
        passwordPlain: password.trim(),
        role: 'ASSISTANT',
        isActive: true,
        permissions: Array.isArray(permissions) ? permissions : [],
        assignedGroupIds: Array.isArray(assignedGroupIds) ? assignedGroupIds : [],
        notes: notes?.trim() || null,
      },
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
        createdAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تم إضافة المساعد وتحديد صلاحياته بنجاح',
      assistant: newAssistant,
    });
  } catch (error: any) {
    console.error('Error creating assistant:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
