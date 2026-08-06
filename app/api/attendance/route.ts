import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { verifyStaff } from '@/lib/auth';

// GET - List recent attendance records
export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
