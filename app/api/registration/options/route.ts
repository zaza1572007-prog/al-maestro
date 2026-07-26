import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const stageOrder = [
      'الصف الرابع الابتدائي',
      'الصف الخامس الابتدائي',
      'الصف السادس الابتدائي',
      'الصف الأول الإعدادي',
      'الصف الثاني الإعدادي',
      'الصف الثالث الإعدادي',
      'الصف الأول الثانوي',
      'الصف الثاني الثانوي',
      'الصف الثالث الثانوي',
    ];

    const [allStages, allGroups] = await Promise.all([
      prisma.academicStage.findMany(),
      prisma.group.findMany({
        include: {
          academicStage: true,
          _count: { select: { students: true } },
        },
      }),
    ]);

    // Sort stages properly in educational sequence
    const stages = allStages.sort((a, b) => {
      const indexA = stageOrder.indexOf(a.name);
      const indexB = stageOrder.indexOf(b.name);
      return (indexA !== -1 ? indexA : 99) - (indexB !== -1 ? indexB : 99);
    });

    // Filter out groups that have 0 remaining capacity or no stage
    const groups = allGroups;

    return NextResponse.json({ success: true, stages, groups });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
