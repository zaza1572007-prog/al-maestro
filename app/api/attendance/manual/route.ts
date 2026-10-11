import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { verifyStaff } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { sessionId, attendanceRecords } = body;

    if (!sessionId || !attendanceRecords || !Array.isArray(attendanceRecords)) {
      return NextResponse.json(
        { error: 'Session ID and attendance records array are required' },
        { status: 400 }
      );
    }

    // Fallback: get the first user (owner) id for recordedById
    const owner = await prisma.user.findFirst();
    const recordedById = owner?.id || null;

    // Verify session exists
    const session = await prisma.lessonSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }


    // Process attendance records in batch
    const studentIds = Array.from(
      new Set(attendanceRecords.map((r: any) => r.studentId).filter(Boolean))
    );

    // 1. Bulk fetch students with active subscriptions
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    // 2. Bulk fetch existing attendances for this session
    const existingAttendances = await prisma.attendance.findMany({
      where: {
        sessionId: sessionId,
        studentId: { in: studentIds },
      },
    });
    const existingMap = new Map(existingAttendances.map((a) => [a.studentId, a]));

    const results = [];
    const errors = [];
    const txOps: any[] = [];

    for (const record of attendanceRecords) {
      const { studentId, status, notes } = record;

      if (!studentId || !status) {
        errors.push({
          studentId,
          error: 'Missing studentId or status',
        });
        continue;
      }

      const student = studentMap.get(studentId);
      if (!student) {
        errors.push({
          studentId,
          error: 'Student not found',
        });
        continue;
      }

      const existingAttendance = existingMap.get(studentId);
      const activeSubscription = student.subscriptions[0];

      if (existingAttendance) {
        txOps.push(
          prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
              status,
              notes,
              recordedById: recordedById,
              ...(status === 'PRESENT' && !existingAttendance.checkInTime ? { checkInTime: new Date() } : {}),
            },
          })
        );

        if (activeSubscription && status === 'PRESENT' && existingAttendance.status !== 'PRESENT') {
          txOps.push(
            prisma.subscription.update({
              where: { id: activeSubscription.id },
              data: {
                usedSessions: {
                  increment: 1,
                },
              },
            })
          );
        }

        results.push({
          studentId,
          studentName: student.name,
          action: 'updated',
        });
      } else {
        txOps.push(
          prisma.attendance.create({
            data: {
              studentId,
              sessionId,
              status,
              notes,
              recordedById: recordedById,
              checkInTime: new Date(),
            },
          })
        );

        if (activeSubscription && status === 'PRESENT') {
          txOps.push(
            prisma.subscription.update({
              where: { id: activeSubscription.id },
              data: {
                usedSessions: {
                  increment: 1,
                },
              },
            })
          );
        }

        results.push({
          studentId,
          studentName: student.name,
          action: 'created',
        });
      }
    }

    if (txOps.length > 0) {
      await prisma.$transaction(txOps);
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      errorCount: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error('Error recording manual attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
