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

    // Maximum file size check: 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت)' }, { status: 400 });
    }

    // Strict file extension allowlist
    const ALLOWED_EXTENSIONS = new Set([
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'jpg', 'jpeg', 'png', 'webp', 'gif',
      'mp4', 'mov', 'avi', 'mkv', 'zip', 'rar'
    ]);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({
        success: false,
        error: `نوع الملف (.${ext}) غير مسموح به لأسباب أمنية. يُسمح فقط بالمستندات (PDF, Word, Excel, PowerPoint) والصور والفيديوهات والملفات المضغوطة.`
      }, { status: 400 });
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
    if (ext === 'pdf' || fmime.includes('pdf')) fileType = 'PDF';
    else if (['doc', 'docx'].includes(ext) || fmime.includes('word')) fileType = 'WORD';
    else if (['xls', 'xlsx'].includes(ext) || fmime.includes('excel')) fileType = 'EXCEL';
    else if (['ppt', 'pptx'].includes(ext) || fmime.includes('powerpoint')) fileType = 'POWERPOINT';
    else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || fmime.includes('image')) fileType = 'IMAGE';
    else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext) || fmime.includes('video')) fileType = 'VIDEO';
    else if (['zip', 'rar'].includes(ext)) fileType = 'ZIP';

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
