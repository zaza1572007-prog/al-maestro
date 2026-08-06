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

    const results = await prisma.examResult.findMany({
      where: { studentId: payload.userId as string },
      include: { exam: true },
      orderBy: { exam: { examDate: 'desc' } }
    });

    let totalPercentage = 0;

    const exams = results.map((r) => {
      totalPercentage += r.percentage;
      return {
        id: r.id,
        title: r.exam.title,
        date: new Date(r.exam.examDate).toLocaleDateString('ar-EG'),
        score: `${r.score}/${r.exam.maxScore}`,
        rank: r.rank ? `المركز ${r.rank}` : 'غير محدد',
        evaluation: r.percentage >= 90 ? 'ممتاز' : r.percentage >= 75 ? 'جيد جداً' : r.percentage >= 60 ? 'جيد' : 'بحاجة لمتابعة',
      };
    });

    const average = results.length > 0 ? Math.round(totalPercentage / results.length) : 0;

    return NextResponse.json({ success: true, exams, average: `${average}%` });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
