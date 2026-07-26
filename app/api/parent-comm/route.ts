import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const parentComms = await prisma.parentCommunication.findMany({
      include: {
        student: true,
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ success: true, parentComms });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { studentId, method, reason, result, notes } = await req.json();

    const comm = await prisma.parentCommunication.create({
      data: {
        studentId,
        date: new Date(),
        method: method || 'WHATSAPP',
        reason,
        result,
        notes,
      },
    });

    return NextResponse.json({ success: true, comm });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
