import { Vacation } from '@prisma/client';

export function getVacationChecker(
  vacations: Vacation[],
  student: { id: string; academicStageId: string; groupId: string }
) {
  const vacationDateStrings = new Set<string>();

  for (const vac of vacations) {
    const applies =
      vac.scope === 'all' ||
      (vac.scope === 'stage' && vac.academicStageId === student.academicStageId) ||
      (vac.scope === 'group' && vac.groupId === student.groupId) ||
      (vac.scope === 'student' && vac.studentId === student.id);

    if (applies) {
      // Normalize to YYYY-MM-DD
      const dateStr = new Date(vac.date).toISOString().split('T')[0];
      vacationDateStrings.add(dateStr);
    }
  }

  return (date: Date | string) => {
    if (!date) return false;
    const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
    return vacationDateStrings.has(dateStr);
  };
}
