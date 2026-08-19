import { get, set, del } from 'idb-keyval';

export const DIR_HANDLE_KEY = 'almaestro_backup_dir_handle';
export const DIR_NAME_KEY = 'almaestro_backup_dir_name';
export const LAST_BACKUP_TIME_KEY = 'almaestro_last_backup_time';

export interface SavedBackupDirectoryInfo {
  handle: any | null;
  folderName: string | null;
  lastBackupTime: string | null;
  isSupported: boolean;
}

export interface WriteBackupResult {
  success: boolean;
  timestamp?: string;
  datedFileName?: string;
  latestFileName?: string;
  permissionDenied?: boolean;
  error?: string;
}

/**
 * Checks whether the File System Access API (showDirectoryPicker) is supported in the current browser/PWA environment.
 */
export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Verifies or requests readwrite permission for a stored FileSystemDirectoryHandle.
 */
export async function verifyDirectoryPermission(
  handle: any,
  readWrite: boolean = true
): Promise<boolean> {
  if (!handle) return false;
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  try {
    if (typeof handle.queryPermission === 'function') {
      const status = await handle.queryPermission(options);
      if (status === 'granted') {
        return true;
      }
    }
    if (typeof handle.requestPermission === 'function') {
      const status = await handle.requestPermission(options);
      return status === 'granted';
    }
  } catch (err) {
    console.warn('Error verifying handle permission:', err);
  }
  return false;
}

/**
 * Opens the native directory picker (window.showDirectoryPicker) and persists the handle in IndexedDB.
 * Handles AbortError silently when user cancels picker dialog.
 */
export async function pickAndSaveBackupDirectory(): Promise<{
  handle: any | null;
  folderName?: string;
  cancelled?: boolean;
  error?: string;
}> {
  if (!isDirectoryPickerSupported()) {
    return {
      handle: null,
      error: 'ميزة اختيار المجلدات غير مدعومة على هذا المتصفح. يرجى استخدام متصفح يدعم File System Access API مثل Chrome أو Edge.',
    };
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
    });

    if (handle) {
      const folderName = handle.name || 'مجلد مخصص';
      await set(DIR_HANDLE_KEY, handle);
      await set(DIR_NAME_KEY, folderName);

      return { handle, folderName };
    }

    return { handle: null };
  } catch (err: any) {
    if (err.name === 'AbortError' || err.code === 20) {
      // User cancelled picker window
      return { handle: null, cancelled: true };
    }
    console.error('Error selecting directory:', err);
    return {
      handle: null,
      error: err.message || 'حدث خطأ غير متوقع أثناء اختيار المجلد',
    };
  }
}

/**
 * Retrieves the persisted FileSystemDirectoryHandle, folder name, and last backup timestamp from IndexedDB.
 */
export async function getSavedBackupDirectory(): Promise<SavedBackupDirectoryInfo> {
  const supported = isDirectoryPickerSupported();
  if (typeof window === 'undefined') {
    return { handle: null, folderName: null, lastBackupTime: null, isSupported: supported };
  }

  try {
    const handle = await get(DIR_HANDLE_KEY);
    const folderName = await get(DIR_NAME_KEY);
    const lastBackupTime = await get(LAST_BACKUP_TIME_KEY);

    return {
      handle: handle || null,
      folderName: folderName || (handle?.name ? handle.name : null),
      lastBackupTime: lastBackupTime || null,
      isSupported: supported,
    };
  } catch (err) {
    console.error('Error retrieving directory handle from IndexedDB:', err);
    return { handle: null, folderName: null, lastBackupTime: null, isSupported: supported };
  }
}

/**
 * Removes the saved directory handle from IndexedDB (for changing/resetting folder).
 */
export async function clearSavedBackupDirectory(): Promise<void> {
  try {
    await del(DIR_HANDLE_KEY);
    await del(DIR_NAME_KEY);
  } catch (err) {
    console.error('Error clearing directory handle:', err);
  }
}

/**
 * Writes backup JSON data into the given directory handle, creating:
 * 1. almaestro_backup_YYYY-MM-DD.json
 * 2. latest_backup.json
 * Updates last backup timestamp in IndexedDB.
 */
export async function writeBackupToDirectory(
  dirHandle: any,
  backupData: any
): Promise<WriteBackupResult> {
  if (!dirHandle) {
    return { success: false, error: 'لم يتم تزويد مجلد النسخ الاحتياطي' };
  }

  // Ensure permission is granted
  const hasPermission = await verifyDirectoryPermission(dirHandle, true);
  if (!hasPermission) {
    return {
      success: false,
      permissionDenied: true,
      error: 'لم يتم إعطاء صلاحية الكتابة للمجلد المختار. يرجى إعادة الموافقة على الإذن.',
    };
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const datedFileName = `almaestro_backup_${dateStr}.json`;
    const latestFileName = `latest_backup.json`;

    const jsonString =
      typeof backupData === 'string' ? backupData : JSON.stringify(backupData, null, 2);

    // 1. Write dated backup file
    const datedFileHandle = await dirHandle.getFileHandle(datedFileName, { create: true });
    const writable1 = await datedFileHandle.createWritable();
    await writable1.write(jsonString);
    await writable1.close();

    // 2. Write latest backup file
    const latestFileHandle = await dirHandle.getFileHandle(latestFileName, { create: true });
    const writable2 = await latestFileHandle.createWritable();
    await writable2.write(jsonString);
    await writable2.close();

    // Format Arabic date & time for UI display
    const formattedTimestamp = now.toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    await set(LAST_BACKUP_TIME_KEY, formattedTimestamp);

    return {
      success: true,
      timestamp: formattedTimestamp,
      datedFileName,
      latestFileName,
    };
  } catch (err: any) {
    console.error('Error writing backup files to directory:', err);
    return {
      success: false,
      error: err.message || 'حدث خطأ أثناء كتابة ملفات النسخة الاحتياطية في المجلد',
    };
  }
}
