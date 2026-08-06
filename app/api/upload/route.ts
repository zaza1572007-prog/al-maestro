import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { handleApiError } from '@/lib/error-handler';
import { join, basename } from 'path';
import { verifyStaff } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const academicStageId = formData.get('academicStageId') as string | null;
    const groupId = formData.get('groupId') as string | null;
    const accessLevel = (formData.get('accessLevel') as string) || 'ALL';
    const customName = formData.get('customName') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'لم يتم إرسال أي ملف' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save locally to public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Sanitize filename to prevent path traversal
    const safeBaseName = basename(file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}_${safeBaseName}`;
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;

    // Detect file type
    let fileType = 'OTHER';
    const fname = file.name.toLowerCase();
    const fmime = file.type.toLowerCase();
    if (fmime.includes('pdf') || fname.endsWith('.pdf')) fileType = 'PDF';
    else if (fmime.includes('word') || fname.endsWith('.doc') || fname.endsWith('.docx')) fileType = 'WORD';
    else if (fmime.includes('excel') || fname.endsWith('.xls') || fname.endsWith('.xlsx')) fileType = 'EXCEL';
    else if (fmime.includes('powerpoint') || fname.endsWith('.ppt') || fname.endsWith('.pptx')) fileType = 'POWERPOINT';
    else if (fmime.includes('image')) fileType = 'IMAGE';
    else if (fmime.includes('video') || fname.endsWith('.mp4') || fname.endsWith('.mov') || fname.endsWith('.avi') || fname.endsWith('.mkv')) fileType = 'VIDEO';
    else if (fname.endsWith('.zip') || fname.endsWith('.rar')) fileType = 'ZIP';

    const dbFile = await prisma.file.create({
      data: {
        name: customName || file.name,
        url: fileUrl,
        type: fileType as any,
        size: file.size,
        academicStageId: (accessLevel === 'STAGE' && academicStageId) ? academicStageId : null,
        groupId: (accessLevel === 'GROUP' && groupId) ? groupId : null,
        accessLevel,
      },
      include: {
        academicStage: true,
        group: true,
      },
    });

    return NextResponse.json({ success: true, file: dbFile });
  } catch (error: any) {
    return handleApiError(error);
  }
}
