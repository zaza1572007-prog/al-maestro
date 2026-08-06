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

    const student = await prisma.student.findUnique({
      where: { id: payload.userId as string },
      select: { groupId: true }
    });

    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const allHomeworks = await prisma.homework.findMany({
      where: { groupId: student.groupId },
      include: {
        submissions: {
          where: { studentId: payload.userId as string }
        }
      },
      orderBy: { dueDate: 'desc' }
    });

    const homeworks = allHomeworks.map((hw) => {
      const submission = hw.submissions[0];
      let status = 'قيد الانتظار';
      if (submission) {
        if (submission.status === 'GRADED' || submission.status === 'SUBMITTED') status = 'مكتمل';
        else if (submission.status === 'LATE') status = 'مكتمل متأخر';
        else status = 'قيد الانتظار';
      }

      return {
        id: hw.id,
        title: hw.title,
        dueDate: new Date(hw.dueDate).toLocaleDateString('ar-EG'),
        status,
        score: submission?.score ? `${submission.score}/${hw.maxScore || '-'}` : null,
      };
    });

    return NextResponse.json({ success: true, homeworks });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
