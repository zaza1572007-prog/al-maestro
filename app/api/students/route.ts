import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const academicStageId = searchParams.get('academicStageId') || searchParams.get('stageId');

    const where: any = {};
    if (groupId) where.groupId = groupId;
    if (academicStageId) where.academicStageId = academicStageId;

    const students = await prisma.student.findMany({
      where,
      include: {
        academicStage: true,
        group: true,
        parent: true,
        subscriptions: {
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, students });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, phone, academicStageId, groupId, parentName, parentPhone, parentRelation } = await req.json();

    // Create or find parent
    let parent = await prisma.parent.findFirst({
      where: { phone: parentPhone },
    });

    if (!parent) {
      parent = await prisma.parent.create({
        data: {
          name: parentName || `ولي أمر ${name}`,
          phone: parentPhone || phone,
          relation: parentRelation || 'Father',
        },
      });
    }

    const code = `STU-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrCode = `QR-${code}`;

    const student = await prisma.student.create({
      data: {
        code,
        name,
        phone,
        academicStageId,
        groupId,
        parentId: parent.id,
        qrCode,
      },
      include: {
        academicStage: true,
        group: true,
        parent: true,
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
