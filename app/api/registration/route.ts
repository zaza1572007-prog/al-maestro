import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Submit new registration request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentName,
      studentPhone,
      studentGender,
      birthDate,
      school,
      academicStageId,
      groupId,
      parentName,
      parentRelation,
      parentPhone,
      parentWhatsapp,
      parentExtraPhone,
      isParentExisting,
    } = body;

    // Double check registration setting
    const settings = await prisma.systemSettings.findFirst();
    if (settings && !settings.isRegistrationOpen) {
      return NextResponse.json(
        { error: 'التسجيل غير متاح حاليًا، سيتم فتح باب الحجز قريبًا.' },
        { status: 400 }
      );
    }

    const registration = await prisma.registrationRequest.create({
      data: {
        studentName,
        studentPhone,
        studentGender,
        birthDate,
        school,
        academicStageId,
        groupId,
        parentName,
        parentRelation: parentRelation || 'Father',
        parentPhone,
        parentWhatsapp,
        parentExtraPhone,
        isParentExisting: Boolean(isParentExisting),
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, registration });
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إرسال طلب التسجيل' },
      { status: 500 }
    );
  }
}

// Get all registration requests for teacher
export async function GET() {
  try {
    const requests = await prisma.registrationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        academicStage: true,
        group: true,
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    return NextResponse.json({ requests: [] });
  }
}
