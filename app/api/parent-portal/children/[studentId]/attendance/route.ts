import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
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
      where: { id: studentId, parent: { phone: { contains: '' } } } // Simplification for now, we should ideally check parentId
    });

    // Actually, we need to find the parent by payload.userId if we used parentId in token.
    // In auth, parent ID is payload.userId
    const actualStudent = await prisma.student.findFirst({
      where: { id: studentId, parentId: payload.userId as string }
    });

    if (!actualStudent) {
      return NextResponse.json({ error: 'Unauthorized access to this student' }, { status: 403 });
    }

    const attendances = await prisma.attendance.findMany({
      where: { studentId: actualStudent.id },
      include: {
        session: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const records = attendances.map((a) => ({
      id: a.id,
      date: new Date(a.session.date).toLocaleDateString('ar-EG'),
      status: a.status === 'PRESENT' ? 'حاضر' : a.status === 'VACATION' ? 'إجازة' : a.status === 'ABSENT' ? 'غائب' : 'متأخر',
      time: a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--',
    }));

    const nonVacationRecords = records.filter(r => r.status !== 'إجازة');
    const attendanceRate = nonVacationRecords.length > 0 
      ? Math.round((nonVacationRecords.filter(r => r.status === 'حاضر' || r.status === 'متأخر').length / nonVacationRecords.length) * 100) 
      : 0;

    return NextResponse.json({ success: true, records, attendanceRate: `${attendanceRate}%` });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
