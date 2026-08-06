import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const comms = await prisma.parentCommunication.findMany({
      include: {
        student: true,
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json({ success: true, comms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { studentId, channel, reason, notes } = await req.json();

    if (!studentId || !reason || !notes) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const comm = await prisma.parentCommunication.create({
      data: {
        studentId,
        method: channel.includes('WhatsApp') || channel.includes('WHATSAPP') ? 'WHATSAPP' : 'PHONE',
        reason,
        notes,
        date: new Date()
      },
      include: { student: true }
    });

    return NextResponse.json({ success: true, comm });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
