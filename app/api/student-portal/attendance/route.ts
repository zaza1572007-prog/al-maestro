import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attendances = await prisma.attendance.findMany({
      where: { studentId: payload.userId as string },
      include: {
        session: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const records = attendances.map((a) => ({
      id: a.id,
      date: new Date(a.session.date).toLocaleDateString('ar-EG'),
      status: a.status === 'PRESENT' ? 'حاضر' : a.status === 'ABSENT' ? 'غائب' : 'متأخر',
      time: a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--',
    }));

    const attendanceRate = records.length > 0 
      ? Math.round((records.filter(r => r.status === 'حاضر').length / records.length) * 100) 
      : 0;

    return NextResponse.json({ success: true, records, attendanceRate: `${attendanceRate}%` });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
