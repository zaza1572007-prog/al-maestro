import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch up-to-date user details
    const dbUser = await prisma.user.findUnique({
      where: { id: staff.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        profileImage: true,
        isActive: true,
        permissions: true,
        assignedGroupIds: true,
        notes: true,
        createdAt: true,
      }
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (!dbUser.isActive) {
      return NextResponse.json({ success: false, error: 'الحساب معطل حالياً' }, { status: 403 });
    }

    const hasAllGroups = !dbUser.assignedGroupIds || dbUser.assignedGroupIds.length === 0;

    // Fetch assigned groups
    const groupsWhere: any = hasAllGroups ? {} : { id: { in: dbUser.assignedGroupIds } };
    const assignedGroups = await prisma.group.findMany({
      where: groupsWhere,
      include: {
        academicStage: {
          select: { id: true, name: true, level: true }
        },
        _count: {
          select: { students: true, lessonSessions: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Today's date range (UTC / local)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Fetch today's sessions
    const sessionWhere: any = {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      }
    };
    if (!hasAllGroups) {
      sessionWhere.groupId = { in: dbUser.assignedGroupIds };
    }

    const todaySessions = await prisma.lessonSession.findMany({
      where: sessionWhere,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            academicStage: { select: { name: true } }
          }
        },
        _count: {
          select: { attendances: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // Fetch tasks assigned to this assistant
    const myTasks = await prisma.task.findMany({
      where: {
        assignedToId: dbUser.id,
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 10
    });

    // Count today's attendances recorded
    const todayAttendancesCount = await prisma.attendance.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        ...(hasAllGroups ? {} : { student: { groupId: { in: dbUser.assignedGroupIds } } })
      }
    });

    return NextResponse.json({
      success: true,
      assistant: dbUser,
      assignedGroups,
      todaySessions,
      tasks: myTasks,
      stats: {
        assignedGroupsCount: assignedGroups.length,
        todaySessionsCount: todaySessions.length,
        todayAttendancesCount,
        pendingTasksCount: myTasks.filter(t => t.status !== 'COMPLETED').length,
        totalPermissionsCount: dbUser.permissions?.length || 0,
      }
    });
  } catch (error: any) {
    console.error('Error fetching assistant summary:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
