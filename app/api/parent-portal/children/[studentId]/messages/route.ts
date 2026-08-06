import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await params;

    // Verify student belongs to this parent
    const student = await prisma.student.findFirst({
      where: { id: studentId, parentId: payload.userId as string }
    });

    if (!student) {
      return NextResponse.json({ error: 'Unauthorized access to this student' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message } = body;

    if (!title || !message) {
      return NextResponse.json({ success: false, error: 'الموضوع ونص الرسالة مطلوبان' }, { status: 400 });
    }

    const communication = await prisma.parentCommunication.create({
      data: {
        studentId: studentId,
        date: new Date(),
        method: 'WHATSAPP',
        reason: title,
        result: 'قيد الانتظار',
        notes: message
      }
    });

    return NextResponse.json({ success: true, message: 'تم إرسال رسالتك بنجاح وسيتواصل معك المعلم أو الدعم الفني قريباً! 📨' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
