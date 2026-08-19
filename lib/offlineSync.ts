import { get, set } from 'idb-keyval';

export const QUEUE_STUDENTS_KEY = 'almaestro_offline_students_queue';
export const QUEUE_GROUPS_KEY = 'almaestro_offline_groups_queue';
export const QUEUE_PAYMENTS_KEY = 'almaestro_offline_payments_queue';
export const QUEUE_ATTENDANCE_KEY = 'almaestro_offline_queue';

export const CACHE_STUDENTS_KEY = 'almaestro_cached_students';
export const CACHE_GROUPS_KEY = 'almaestro_cached_groups';
export const CACHE_PAYMENTS_KEY = 'almaestro_cached_payments';

export interface QueueStats {
  total: number;
  students: number;
  groups: number;
  payments: number;
  attendances: number;
}

export interface SyncProgressInfo {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
  error?: string;
}

/**
 * Emits a custom DOM event so UI components can re-render queue counts in real-time.
 */
export function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('maestro-offline-queue-changed'));
  }
}

/**
 * Gets the total count of pending items across all offline queues.
 */
export async function getOfflineQueueStats(): Promise<QueueStats> {
  if (typeof window === 'undefined') {
    return { total: 0, students: 0, groups: 0, payments: 0, attendances: 0 };
  }
  try {
    const studentsQueue: any[] = (await get(QUEUE_STUDENTS_KEY)) || [];
    const groupsQueue: any[] = (await get(QUEUE_GROUPS_KEY)) || [];
    const paymentsQueue: any[] = (await get(QUEUE_PAYMENTS_KEY)) || [];
    const attendancesQueue: any[] = (await get(QUEUE_ATTENDANCE_KEY)) || [];

    const total =
      studentsQueue.length +
      groupsQueue.length +
      paymentsQueue.length +
      attendancesQueue.length;

    return {
      total,
      students: studentsQueue.length,
      groups: groupsQueue.length,
      payments: paymentsQueue.length,
      attendances: attendancesQueue.length,
    };
  } catch (err) {
    console.error('Error getting queue stats:', err);
    return { total: 0, students: 0, groups: 0, payments: 0, attendances: 0 };
  }
}

/**
 * Saves a new Student locally in IndexedDB queue & cache when offline.
 */
export async function addOfflineStudent(studentData: any): Promise<{ student: any }> {
  const queue: any[] = (await get(QUEUE_STUDENTS_KEY)) || [];
  const cachedStudents: any[] = (await get(CACHE_STUDENTS_KEY)) || [];

  const tempCode = `STU-OFF-${Date.now().toString().slice(-4)}`;
  const offlineStudent = {
    ...studentData,
    id: `OFFLINE-STUDENT-${Date.now()}`,
    code: studentData.code || tempCode,
    qrCode: `QR-${tempCode}`,
    createdAt: new Date().toISOString(),
    isOffline: true,
  };

  queue.push({
    id: offlineStudent.id,
    data: studentData,
    createdAt: offlineStudent.createdAt,
  });

  cachedStudents.unshift(offlineStudent);

  await set(QUEUE_STUDENTS_KEY, queue);
  await set(CACHE_STUDENTS_KEY, cachedStudents);

  notifyQueueChange();
  return { student: offlineStudent };
}

/**
 * Saves a new Group locally in IndexedDB queue & cache when offline.
 */
export async function addOfflineGroup(groupData: any): Promise<{ group: any }> {
  const queue: any[] = (await get(QUEUE_GROUPS_KEY)) || [];
  const cachedGroups: any[] = (await get(CACHE_GROUPS_KEY)) || [];

  const offlineGroup = {
    ...groupData,
    id: `OFFLINE-GROUP-${Date.now()}`,
    studentsCount: 0,
    attendanceAvg: '100%',
    createdAt: new Date().toISOString(),
    isOffline: true,
  };

  queue.push({
    id: offlineGroup.id,
    data: groupData,
    createdAt: offlineGroup.createdAt,
  });

  cachedGroups.unshift(offlineGroup);

  await set(QUEUE_GROUPS_KEY, queue);
  await set(CACHE_GROUPS_KEY, cachedGroups);

  notifyQueueChange();
  return { group: offlineGroup };
}

/**
 * Saves a new Payment locally in IndexedDB queue & cache when offline.
 */
export async function addOfflinePayment(paymentData: any): Promise<{ payment: any }> {
  const queue: any[] = (await get(QUEUE_PAYMENTS_KEY)) || [];
  const cachedPayments: any[] = (await get(CACHE_PAYMENTS_KEY)) || [];

  const offlinePayment = {
    ...paymentData,
    id: `OFFLINE-PAYMENT-${Date.now()}`,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isOffline: true,
  };

  queue.push({
    id: offlinePayment.id,
    data: paymentData,
    createdAt: offlinePayment.createdAt,
  });

  cachedPayments.unshift(offlinePayment);

  await set(QUEUE_PAYMENTS_KEY, queue);
  await set(CACHE_PAYMENTS_KEY, cachedPayments);

  notifyQueueChange();
  return { payment: offlinePayment };
}

/**
 * Performs full sequential sync of all offline queues with progress reporting.
 */
export async function syncAllOfflineQueues(
  onProgress?: (info: SyncProgressInfo) => void
): Promise<SyncProgressInfo> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    const errorInfo: SyncProgressInfo = {
      status: 'error',
      current: 0,
      total: 0,
      percentage: 0,
      error: 'لا يوجد اتصال بالإنترنت لبدء المزامنة',
    };
    if (onProgress) onProgress(errorInfo);
    return errorInfo;
  }

  const studentsQueue: any[] = (await get(QUEUE_STUDENTS_KEY)) || [];
  const groupsQueue: any[] = (await get(QUEUE_GROUPS_KEY)) || [];
  const paymentsQueue: any[] = (await get(QUEUE_PAYMENTS_KEY)) || [];
  const attendancesQueue: any[] = (await get(QUEUE_ATTENDANCE_KEY)) || [];

  const total =
    studentsQueue.length +
    groupsQueue.length +
    paymentsQueue.length +
    attendancesQueue.length;

  if (total === 0) {
    const emptyInfo: SyncProgressInfo = {
      status: 'completed',
      current: 0,
      total: 0,
      percentage: 100,
    };
    if (onProgress) onProgress(emptyInfo);
    return emptyInfo;
  }

  let current = 0;

  const updateProgress = (itemName: string) => {
    current++;
    const percentage = Math.round((current / total) * 100);
    const info: SyncProgressInfo = {
      status: 'syncing',
      current,
      total,
      percentage,
      currentItem: itemName,
    };
    if (onProgress) onProgress(info);
  };

  // 1. Sync Groups Queue First
  const remainingGroups: any[] = [];
  for (const item of groupsQueue) {
    try {
      updateProgress(`مجموعة: ${item.data?.name || 'مجموعة جديدة'}`);
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      if (!res.ok) remainingGroups.push(item);
    } catch {
      remainingGroups.push(item);
    }
  }
  await set(QUEUE_GROUPS_KEY, remainingGroups);

  // 2. Sync Students Queue
  const remainingStudents: any[] = [];
  for (const item of studentsQueue) {
    try {
      updateProgress(`طالب: ${item.data?.name || 'طالب جديد'}`);
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      if (!res.ok) remainingStudents.push(item);
    } catch {
      remainingStudents.push(item);
    }
  }
  await set(QUEUE_STUDENTS_KEY, remainingStudents);

  // 3. Sync Payments Queue
  const remainingPayments: any[] = [];
  for (const item of paymentsQueue) {
    try {
      updateProgress(`دفع اشتراك: ${item.data?.studentName || 'اشتراك شهر'}`);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      if (!res.ok) remainingPayments.push(item);
    } catch {
      remainingPayments.push(item);
    }
  }
  await set(QUEUE_PAYMENTS_KEY, remainingPayments);

  // 4. Sync Attendances Queue
  const remainingAttendances: any[] = [];
  for (const item of attendancesQueue) {
    try {
      updateProgress(`حضور طالب كود: ${item.studentCode || ''}`);
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: item.studentCode,
          status: item.status,
          homeworkStatus: item.homeworkStatus,
        }),
      });
      if (!res.ok) remainingAttendances.push(item);
    } catch {
      remainingAttendances.push(item);
    }
  }
  await set(QUEUE_ATTENDANCE_KEY, remainingAttendances);

  notifyQueueChange();

  const finalInfo: SyncProgressInfo = {
    status: 'completed',
    current: total,
    total,
    percentage: 100,
  };
  if (onProgress) onProgress(finalInfo);
  return finalInfo;
}
