import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';

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
        if (submission.status === 'GRADED') status = 'مكتمل (تم التقييم)';
        else if (submission.status === 'SUBMITTED') status = 'مكتمل';
        else if (submission.status === 'LATE') status = 'مكتمل متأخر';
        else status = 'قيد الانتظار';
      }

      return {
        id: hw.id,
        title: hw.title,
        dueDate: new Date(hw.dueDate).toLocaleDateString('ar-EG'),
        status,
        score: submission?.score ? `${submission.score}/${hw.maxScore || '-'}` : null,
        feedback: submission?.feedback || null,
        attachments: submission?.attachments || [],
      };
    });

    return NextResponse.json({ success: true, homeworks });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const homeworkId = formData.get('homeworkId') as string;
    const file = formData.get('file') as File | null;

    if (!homeworkId) {
      return NextResponse.json({ success: false, error: 'كود الواجب مطلوب' }, { status: 400 });
    }

    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId }
    });

    if (!homework) {
      return NextResponse.json({ success: false, error: 'الواجب غير موجود' }, { status: 404 });
    }

    let fileUrl = '';
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save locally to public/uploads
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });

      const safeBaseName = basename(file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${Date.now()}_${safeBaseName}`;
      const filePath = join(uploadDir, filename);
      await writeFile(filePath, buffer);

      fileUrl = `/uploads/${filename}`;
    }

    const isLate = new Date() > new Date(homework.dueDate);
    const submissionStatus = isLate ? 'LATE' : 'SUBMITTED';

    // Check if submission already exists
    const existingSubmission = await prisma.homeworkSubmission.findFirst({
      where: {
        homeworkId,
        studentId: payload.userId as string
      }
    });

    let submission;
    if (existingSubmission) {
      submission = await prisma.homeworkSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          status: submissionStatus,
          submittedAt: new Date(),
          attachments: fileUrl ? [fileUrl] : existingSubmission.attachments
        }
      });
    } else {
      submission = await prisma.homeworkSubmission.create({
        data: {
          homeworkId,
          studentId: payload.userId as string,
          status: submissionStatus,
          submittedAt: new Date(),
          attachments: fileUrl ? [fileUrl] : []
        }
      });
    }

    return NextResponse.json({ success: true, submission });
  } catch (e: any) {
    console.error('Homework upload error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
