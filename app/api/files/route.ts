import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const academicStageId = searchParams.get('academicStageId');
    const groupId = searchParams.get('groupId');
    const type = searchParams.get('type');

    const where: any = {};
    if (academicStageId) where.academicStageId = academicStageId;
    if (groupId) where.groupId = groupId;
    if (type) where.type = type;

    const files = await prisma.file.findMany({
      where,
      include: { group: true, academicStage: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, files });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 });

    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return NextResponse.json({ success: false, error: 'الملف غير موجود' }, { status: 404 });

    // Delete physical file from disk if locally stored
    if (file.url.startsWith('/uploads/')) {
      try {
        const filePath = join(process.cwd(), 'public', file.url);
        await unlink(filePath);
      } catch {
        // File may not exist on disk — continue with DB deletion
      }
    }

    await prisma.file.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
