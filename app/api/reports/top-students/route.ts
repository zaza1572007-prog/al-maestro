import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get('stageId') || undefined;
    const groupId = searchParams.get('groupId') || undefined;
    const grade = searchParams.get('grade') || undefined;
    const level = searchParams.get('level') || undefined;

    // Build the query filter for students
    const where: any = {};
    if (groupId) where.groupId = groupId;
    if (stageId) where.academicStageId = stageId;
    
    // Filter by grade or level inside academicStage relation
    if (grade || level) {
      where.academicStage = {
        grade: grade || undefined,
        level: level || undefined,
      };
    }

    // Fetch matching students with their attendances and exam results
    const students = await prisma.student.findMany({
      where,
      include: {
        academicStage: true,
        group: true,
        attendances: {
          select: { status: true },
        },
        examResults: {
          select: { percentage: true },
        },
      },
    });

    // Map and calculate rates
    const mappedStudents = students.map((student) => {
      // Attendance rate calculation
      const attendances = student.attendances;
      const totalAtt = attendances.length;
      const presentCount = attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'LEFT_EARLY'
      ).length;
      const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;

      // Exam average calculation
      const examResults = student.examResults;
      const totalExams = examResults.length;
      const totalPercentage = examResults.reduce((sum, r) => sum + r.percentage, 0);
      const avgExamPercentage = totalExams > 0 ? Math.round(totalPercentage / totalExams) : 0;

      return {
        id: student.id,
        code: student.code,
        name: student.name,
        stageName: student.academicStage?.name || '—',
        groupName: student.group?.name || '—',
        attendanceRate,
        avgExamPercentage,
        totalSessions: totalAtt,
        presentSessions: presentCount,
        absentSessions: totalAtt - presentCount,
        totalExams,
      };
    });

    // 1. Top committed: Sort by attendanceRate descending
    const topCommitted = [...mappedStudents]
      .filter((s) => s.totalSessions > 0)
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 10);

    // 2. Top performing: Sort by avgExamPercentage descending
    const topPerforming = [...mappedStudents]
      .filter((s) => s.avgExamPercentage > 0)
      .sort((a, b) => b.avgExamPercentage - a.avgExamPercentage)
      .slice(0, 10);

    // 3. Bottom performing (lowest scores): Sort by avgExamPercentage ascending
    const bottomPerforming = [...mappedStudents]
      .filter((s) => s.totalExams > 0)
      .sort((a, b) => a.avgExamPercentage - b.avgExamPercentage)
      .slice(0, 10);

    // 4. Most absent: Sort by absentSessions descending
    const mostAbsent = [...mappedStudents]
      .filter((s) => s.absentSessions > 0)
      .sort((a, b) => b.absentSessions - a.absentSessions)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      topCommitted,
      topPerforming,
      bottomPerforming,
      mostAbsent,
    });
  } catch (error: any) {
    console.error('Error fetching top students:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
