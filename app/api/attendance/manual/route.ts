import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);

    if (!payload || (payload.role !== 'OWNER' && payload.role !== 'ASSISTANT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, attendanceRecords } = body;

    if (!sessionId || !attendanceRecords || !Array.isArray(attendanceRecords)) {
      return NextResponse.json(
        { error: 'Session ID and attendance records array are required' },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await prisma.lessonSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Process attendance records
    const results = [];
    const errors = [];

    for (const record of attendanceRecords) {
      const { studentId, status, notes } = record;

      if (!studentId || !status) {
        errors.push({
          studentId,
          error: 'Missing studentId or status',
        });
        continue;
      }

      try {
        // Check if student exists
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          include: {
            subscriptions: {
              where: {
                status: 'ACTIVE',
              },
              orderBy: {
                endDate: 'desc',
              },
              take: 1,
            },
          },
        });

        if (!student) {
          errors.push({
            studentId,
            error: 'Student not found',
          });
          continue;
        }

        // Check if attendance already exists
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            studentId: studentId,
            sessionId: sessionId,
          },
        });

        if (existingAttendance) {
          // Update existing attendance
          const updatedAttendance = await prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
              status,
              notes,
              recordedById: payload.userId,
            },
          });

          results.push({
            studentId,
            studentName: student.name,
            action: 'updated',
            attendance: updatedAttendance,
          });
        } else {
          // Create new attendance
          const attendance = await prisma.attendance.create({
            data: {
              studentId,
              sessionId,
              status,
              notes,
              recordedById: payload.userId,
              checkInTime: new Date(),
            },
          });

          // Update subscription if present and status is PRESENT
          const activeSubscription = student.subscriptions[0];
          if (activeSubscription && status === 'PRESENT') {
            await prisma.subscription.update({
              where: { id: activeSubscription.id },
              data: {
                usedSessions: {
                  increment: 1,
                },
              },
            });
          }

          results.push({
            studentId,
            studentName: student.name,
            action: 'created',
            attendance,
          });
        }
      } catch (error) {
        errors.push({
          studentId,
          error: 'Failed to process attendance',
        });
      }
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
