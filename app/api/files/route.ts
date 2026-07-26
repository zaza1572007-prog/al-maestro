import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const files = await prisma.file.findMany({
      include: {
        group: true,
        academicStage: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, files });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, url, type, size, groupId, academicStageId } = await req.json();

    const file = await prisma.file.create({
      data: {
        name,
        url: url || '/files/sample.pdf',
        type: type || 'PDF',
        size: parseInt(size) || 1024,
        groupId,
        academicStageId,
      },
    });

    return NextResponse.json({ success: true, file });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
