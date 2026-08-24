import { prisma } from './prisma';

export interface AuditLogOptions {
  userId?: string | null;
  action: string; // e.g. 'ATTENDANCE_RECORDED', 'GRADE_MUTATED', 'STUDENT_SOFT_DELETED'
  entity: string; // e.g. 'Student', 'Attendance', 'ExamResult'
  entityId: string;
  changes?: Record<string, any> | string;
  ipAddress?: string | null;
}

/**
 * Audit Logger Service to track all sensitive operations across the platform.
 */
export async function logAuditAction(options: AuditLogOptions): Promise<void> {
  try {
    const changesString = typeof options.changes === 'object' 
      ? JSON.stringify(options.changes) 
      : options.changes || null;

    await prisma.activityLog.create({
      data: {
        userId: options.userId || null,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        changes: changesString,
        ipAddress: options.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('[AUDIT_LOG_ERROR] Failed to write audit log entry:', err);
  }
}
