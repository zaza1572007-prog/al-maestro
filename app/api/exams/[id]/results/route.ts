import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

// POST /api/exams/[id]/results - Save manual exam grades
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: examId } = await params;
    const body = await req.json();
    const { results = [] } = body;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: 'الامتحان غير موجود' }, { status: 404 });
    }

    // Upsert grades for each student in the payload
    const upsertPromises = results.map(async (r: { studentId: string; score: number; percentage?: number; notes?: string }) => {
      const score = Number(r.score);
      const percentage = exam.maxScore > 0 ? (score / exam.maxScore) * 100 : (r.percentage || 0);

      return prisma.examResult.upsert({
        where: {
          studentId_examId: {
            studentId: r.studentId,
            examId,
          }
        },
        create: {
          examId,
          studentId: r.studentId,
          score,
          percentage: Math.round(percentage * 100) / 100,
          notes: r.notes || null,
          gradedAt: new Date(),
        },
        update: {
          score,
          percentage: Math.round(percentage * 100) / 100,
          notes: r.notes || null,
          gradedAt: new Date(),
        }
      });
    });

    await Promise.all(upsertPromises);

    return NextResponse.json({
      success: true,
      message: 'تم حفظ ورصد الدرجات بنجاح',
      count: results.length,
    });
  } catch (error: any) {
    console.error('Error saving exam results:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
