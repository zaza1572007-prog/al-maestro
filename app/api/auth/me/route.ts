import { NextResponse } from 'next/server';
import { verifyToken, signToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user details from DB to get the most up-to-date name and phone
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        profileImage: true,
      }
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: dbUser
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, password } = await req.json();
    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'الاسم واسم المستخدم/رقم الهاتف مطلوبان' }, { status: 400 });
    }

    // Check if phone is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        phone,
        NOT: { id: payload.userId }
      }
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف/اسم المستخدم مستخدم بالفعل' }, { status: 400 });
    }

    const dataToUpdate: any = {
      name,
      phone,
    };

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: dataToUpdate,
    });

    // Create a new token with the updated info
    const newToken = await signToken({
      userId: updatedUser.id,
      name: updatedUser.name,
      role: updatedUser.role as any,
      phone: updatedUser.phone,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        profileImage: updatedUser.profileImage,
      }
    });

    // Set updated cookie
    res.cookies.set('auth-token', newToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
