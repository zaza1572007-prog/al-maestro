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

    // Get student's stage and group
    const student = await prisma.student.findUnique({
      where: { id: payload.userId as string },
      select: { academicStageId: true, groupId: true },
    });

    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    // Fetch files the student can access:
    //  1. Files for everyone (no stage, no group = accessLevel ALL)
    //  2. Files targeting the student's academic stage
    //  3. Files targeting the student's specific group
    const files = await prisma.file.findMany({
      where: {
        OR: [
          { academicStageId: null, groupId: null },
          { academicStageId: student.academicStageId },
          { groupId: student.groupId },
        ],
      },
      include: {
        academicStage: { select: { name: true } },
        group: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = files.map((f) => ({
      id: f.id,
      name: f.name,
      url: f.url,
      type: f.type,
      size: f.size,
      createdAt: new Date(f.createdAt).toLocaleDateString('ar-EG'),
      stageName: f.academicStage?.name ?? null,
      groupName: f.group?.name ?? null,
      accessLabel:
        f.groupId
          ? `مجموعة: ${f.group?.name}`
          : f.academicStageId
          ? `مرحلة: ${f.academicStage?.name}`
          : 'متاح للجميع',
    }));

    return NextResponse.json({ success: true, files: formatted, total: formatted.length });
  } catch (e: any) {
    console.error('Student files error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
