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
    const monthStr = searchParams.get('month') || undefined;
    const yearStr = searchParams.get('year') || undefined;

    // Build date filter if month is specified
    let monthFilter: { gte: Date; lte: Date } | undefined = undefined;
    if (monthStr && monthStr !== 'all' && monthStr !== '') {
      const monthNum = parseInt(monthStr, 10);
      const yearNum = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        const startDate = new Date(yearNum, monthNum - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
        monthFilter = {
          gte: startDate,
          lte: endDate,
        };
      }
    }

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
          where: monthFilter ? {
            OR: [
              { createdAt: monthFilter },
              { session: { date: monthFilter } },
            ],
          } : undefined,
          select: { status: true },
        },
        examResults: {
          where: monthFilter ? {
            OR: [
              { gradedAt: monthFilter },
              { createdAt: monthFilter },
              { exam: { examDate: monthFilter } },
            ],
          } : undefined,
          select: {
            score: true,
            percentage: true,
            exam: {
              select: { maxScore: true },
            },
          },
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

      // Exam average calculation with normalized clamping
      const examResults = student.examResults;
      const totalExams = examResults.length;
      const totalPercentage = examResults.reduce((sum, r) => {
        let cleanPct = 0;
        if (r.exam?.maxScore && r.exam.maxScore > 0 && typeof r.score === 'number') {
          cleanPct = (r.score / r.exam.maxScore) * 100;
        } else if (typeof r.percentage === 'number') {
          cleanPct = r.percentage;
        }
        // Clamp strictly between 0 and 100
        cleanPct = Math.min(100, Math.max(0, cleanPct));
        return sum + cleanPct;
      }, 0);

      const avgExamPercentage = totalExams > 0 ? Math.round(totalPercentage / totalExams) : 0;

      return {
        id: student.id,
        code: student.code,
        name: student.name,
        stageName: student.academicStage?.name || '—',
        groupName: student.group?.name || '—',
        attendanceRate: Math.min(100, Math.max(0, attendanceRate)),
        avgExamPercentage: Math.min(100, Math.max(0, avgExamPercentage)),
        totalSessions: totalAtt,
        presentSessions: presentCount,
        absentSessions: Math.max(0, totalAtt - presentCount),
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

