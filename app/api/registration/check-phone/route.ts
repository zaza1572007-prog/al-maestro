import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parentPhone, studentPhone } = body;

    // Check if student phone already exists in registered active students
    if (studentPhone) {
      const existingStudent = await prisma.student.findFirst({
        where: { phone: studentPhone },
      });

      if (existingStudent) {
        return NextResponse.json({
          exists: true,
          type: 'STUDENT_EXISTS',
          message: 'هذا الرقم مسجل بالفعل لطالب آخر، يرجى استخدام رقم مختلف أو التواصل مع إدارة السنتر.',
        });
      }
    }

    // Check if there is a pending registration request for student or parent
    const pendingRequest = await prisma.registrationRequest.findFirst({
      where: {
        OR: [
          { studentPhone: studentPhone || '___' },
          { parentPhone: parentPhone || '___' },
        ],
        status: 'PENDING',
      },
    });

    if (pendingRequest) {
      return NextResponse.json({
        exists: true,
        type: 'PENDING_REQUEST_EXISTS',
        message: 'يوجد بالفعل طلب تسجيل قيد المراجعة بهذا الرقم.',
        requestStatus: pendingRequest.status,
      });
    }

    // Check if Parent exists in registered Parent database
    if (parentPhone) {
      const existingParent = await prisma.parent.findFirst({
        where: { phone: parentPhone },
        include: {
          students: {
            include: {
              group: true,
              academicStage: true,
            },
          },
        },
      });

      if (existingParent) {
        return NextResponse.json({
          exists: true,
          type: 'PARENT_EXISTS',
          parent: {
            id: existingParent.id,
            name: existingParent.name,
            phone: existingParent.phone,
            childrenCount: existingParent.students.length,
            children: existingParent.students.map((s) => ({
              id: s.id,
              name: s.name,
              stageName: s.academicStage.name,
              groupName: s.group.name,
            })),
          },
        });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('Error checking phone:', error);
    return NextResponse.json({ exists: false, error: 'فشل الفحص' });
  }
}
