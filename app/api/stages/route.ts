import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function GET() {
  try {
    const stages = await prisma.academicStage.findMany({
      include: {
        _count: { select: { students: true, groups: true } },
      },
      orderBy: { level: 'asc' },
    });
    return NextResponse.json({ success: true, stages });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول (Staff Only)' }, { status: 401 });
    }

    const { name, level, grade, description, monthlyPrice } = await req.json();
    const stage = await prisma.academicStage.create({
      data: { 
        name, 
        level, 
        grade, 
        description,
        monthlyPrice: monthlyPrice !== undefined ? parseFloat(monthlyPrice) : 350,
      },
    });
    return NextResponse.json({ success: true, stage });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
