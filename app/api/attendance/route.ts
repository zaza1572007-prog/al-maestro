import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List recent attendance records
export async function GET() {
  try {
    const attendances = await prisma.attendance.findMany({
      include: {
        student: { select: { id: true, name: true, code: true } },
        session: {
          include: {
            group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ success: true, attendances });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
