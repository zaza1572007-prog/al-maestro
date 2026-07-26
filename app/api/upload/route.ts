import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'لم يتم إرسال أي ملف' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save locally to public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;

    // Add record to database
    let fileType = 'OTHER';
    if (file.type.includes('pdf')) fileType = 'PDF';
    else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) fileType = 'WORD';
    else if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) fileType = 'EXCEL';
    else if (file.type.includes('powerpoint') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) fileType = 'POWERPOINT';
    else if (file.type.includes('image')) fileType = 'IMAGE';
    else if (file.type.includes('video')) fileType = 'VIDEO';
    else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) fileType = 'ZIP';

    const dbFile = await prisma.file.create({
      data: {
        name: file.name,
        url: fileUrl,
        type: fileType as any,
        size: file.size,
      },
    });

    return NextResponse.json({ success: true, file: dbFile });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
