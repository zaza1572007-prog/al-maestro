'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, QrCode, UserCheck, UserX, Clock, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { get, set } from 'idb-keyval';
import { generateDirectWhatsAppLink } from '@/lib/whatsapp-direct';

function playBeepSuccess() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 high beep
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function playBeepWarning() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

interface AttendanceRecord {
  id: string;
  student: { name: string; code: string };
  session: { title: string; group: { id: string; name: string } };
  status: string;
  checkInTime?: string;
  notes?: string;
  createdAt: string;
}

interface Session {
  id: string;
  title: string;
  group: { name: string };
  date: string;
  status: string;
}

const statusColors: Record<string, string> = {
  PRESENT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ABSENT: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  LATE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  LEFT_EARLY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  EXCUSED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  VACATION: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

const statusLabels: Record<string, string> = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  LEFT_EARLY: 'انصرف مبكراً',
  EXCUSED: 'غياب بعذر',
  VACATION: 'إجازة',
};

export default function AttendancePage() {
  const [code, setCode] = useState('');
  const [lastScan, setLastScan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [manualStatus, setManualStatus] = useState('PRESENT');
  const [scanMode, setScanMode] = useState<'ATTENDANCE_ONLY' | 'PAY_ONLY' | 'BOTH'>('ATTENDANCE_ONLY');

  const [recentAttendances, setRecentAttendances] = useState<AttendanceRecord[]>([]);
  const [homeworkStatus, setHomeworkStatus] = useState('NONE');
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Today's groups and sheet modal states
  const [todayGroups, setTodayGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectedGroupSheet, setSelectedGroupSheet] = useState<any>(null);

  // Tab control in right panel: 'history' or 'absentees'
  const [rightPanelTab, setRightPanelTab] = useState<'history' | 'absentees'>('history');
  const [absenteesGroup, setAbsenteesGroup] = useState<string>('');
  const [historyGroup, setHistoryGroup] = useState<string>('');
  const [absentees, setAbsentees] = useState<any[]>([]);
  const [loadingAbsentees, setLoadingAbsentees] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  
  // Autocomplete search states
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [warningData, setWarningData] = useState<{
    warningType: 'DUPLICATE' | 'DIFFERENT_GROUP';
    error: string;
    studentCode: string;
    targetGroupId?: string;
  } | null>(null);

  // Scanner status: starts RED 🔴 only goes GREEN when barcode input is focused
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [whatsappTemplates, setWhatsappTemplates] = useState<any>(null);

  const fetchAbsentees = async (groupId: string) => {
    if (!groupId) {
      setAbsentees([]);
      return;
    }
    setLoadingAbsentees(true);
    try {
      const res = await fetch(`/api/attendance/today-groups/absentees?groupId=${groupId}`);
      const data = await res.json();
      if (data.success) {
        setAbsentees(data.absentees || []);
      } else {
        toast.error(data.error || 'فشل جلب الغائبين');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setLoadingAbsentees(false);
    }
  };

  useEffect(() => {
    if (rightPanelTab === 'absentees' && absenteesGroup) {
      fetchAbsentees(absenteesGroup);
    }
  }, [rightPanelTab, absenteesGroup]);

  useEffect(() => {
    fetch('/api/settings/whatsapp')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setWhatsappTemplates(data.settings.templates);
        }
      })
      .catch((err) => console.error('Failed to load WhatsApp settings:', err));
  }, []);

  // Debounced search for student names
  useEffect(() => {
    if (code.trim().length > 1 && !code.startsWith('STU-') && !code.startsWith('QR-')) {
      const delayDebounce = setTimeout(async () => {
        try {
          const res = await fetch(`/api/students?search=${encodeURIComponent(code)}`);
          const data = await res.json();
          if (data.success) {
            setSearchResults(data.students || []);
            setShowDropdown(true);
          }
        } catch (err) {
          console.error(err);
        }
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [code]);

  const handleScanRef = useRef<any>(null);
  useEffect(() => {
    handleScanRef.current = handleScan;
  });

  useEffect(() => {
    // Refocus barcode input on any non-interactive click (for HID scanners)
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('button, input, select, a, textarea');
      if (!isInteractive && inputRef.current) {
        inputRef.current.focus();
      }
    };
    // Go Red when tab/window loses visibility
    const handleVisibility = () => {
      if (document.hidden) setIsFocused(false);
    };

    // Global barcode scanner detection
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();

      // Ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      // If key timing is too slow, reset buffer (means a human typed it)
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }

      lastKeyTime = currentTime;

      // Handle Enter (which standard scanners send at the end of output)
      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          const scannedCode = buffer.trim();
          buffer = '';
          handleScanRef.current(undefined, { targetCode: scannedCode });
        }
        return;
      }

      // Buffer the character
      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('keydown', handleKeyDown, true); // Capture phase to intercept input
    
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);


  const fetchHistory = async (groupId?: string) => {
    setLoadingHistory(true);
    try {
      const activeGroup = groupId !== undefined ? groupId : historyGroup;
      const url = activeGroup ? `/api/attendance?groupId=${activeGroup}` : '/api/attendance';
      const attRes = await fetch(url);
      const attData = await attRes.json();
      if (attData.success && Array.isArray(attData.attendances)) {
        setRecentAttendances(attData.attendances);
        await set('almaestro_cached_attendances', attData.attendances);
        setLoadingHistory(false);
        return;
      }
    } catch (err) {
      console.warn('Offline: Loading attendances from IndexedDB cache');
    }

    try {
      const cached = await get('almaestro_cached_attendances');
      if (cached && Array.isArray(cached)) {
        setRecentAttendances(cached);
      }
    } catch (err) {
      console.error('Failed to load cached attendances:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const to12h = (time24: string): string => {
    if (!time24) return time24;
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const period = h >= 12 ? 'م' : 'ص';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${m} ${period}`;
  };

  const fetchTodayGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/attendance/today-groups');
      const data = await res.json();
      if (data.success && Array.isArray(data.groups) && data.groups.length > 0) {
        setTodayGroups(data.groups);
        await set('almaestro_cached_today_groups', data.groups);
        if (selectedGroupSheet) {
          const updated = data.groups.find((g: any) => g.id === selectedGroupSheet.id);
          if (updated) setSelectedGroupSheet(updated);
        }
        setLoadingGroups(false);
        return;
      }
    } catch (err) {
      console.warn('Offline: Loading groups from IndexedDB cache');
    }

    // Offline fallback: load cached groups from IndexedDB
    try {
      const cachedToday = await get('almaestro_cached_today_groups');
      if (cachedToday && Array.isArray(cachedToday) && cachedToday.length > 0) {
        setTodayGroups(cachedToday);
        setLoadingGroups(false);
        return;
      }

      const cachedAllGroups = await get('almaestro_cached_groups');
      if (cachedAllGroups && Array.isArray(cachedAllGroups) && cachedAllGroups.length > 0) {
        setTodayGroups(cachedAllGroups);
        setLoadingGroups(false);
        return;
      }
    } catch (err) {
      console.error('Failed to load offline groups from IndexedDB:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Background caching of all groups & students when online
  useEffect(() => {
    async function cacheOfflineData() {
      if (typeof window === 'undefined' || !navigator.onLine) return;
      try {
        const [groupsRes, studentsRes] = await Promise.all([
          fetch('/api/groups'),
          fetch('/api/students?limit=2000'),
        ]);

        if (groupsRes.ok) {
          const gData = await groupsRes.json();
          if (gData.groups) {
            await set('almaestro_cached_groups', gData.groups);
          }
        }

        if (studentsRes.ok) {
          const sData = await studentsRes.json();
          if (sData.students) {
            await set('almaestro_cached_students', sData.students);
          }
        }
      } catch (err) {
        console.warn('Background caching failed:', err);
      }
    }

    cacheOfflineData();
  }, []);

  // Auto-sync offline queued attendances when internet returns
  useEffect(() => {
    async function syncOfflineQueue() {
      if (typeof window === 'undefined' || !navigator.onLine) return;
      try {
        const queue: any[] = (await get('almaestro_offline_queue')) || [];
        if (queue.length === 0) return;

        toast.info(`جارٍ رفع ${queue.length} سجل حضور تم تسجيلهم في وضع الأوفلاين... 🔄`);

        for (const item of queue) {
          try {
            await fetch('/api/attendance/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentCode: item.studentCode,
                status: item.status,
                homeworkStatus: item.homeworkStatus,
              }),
            });
          } catch (e) {
            console.error('Failed to sync offline attendance item:', e);
          }
        }

        await set('almaestro_offline_queue', []);
        toast.success('تمت مزامنة جميع سجلات الحضور الأوفلاين مع السيرفر بنجاح! ✅');
        fetchHistory();
        fetchTodayGroups();
      } catch (err) {
        console.error('Error syncing offline queue:', err);
      }
    }

    window.addEventListener('online', syncOfflineQueue);
    syncOfflineQueue();

    return () => window.removeEventListener('online', syncOfflineQueue);
  }, []);

  const handleOpenGroupEarly = async (groupId: string) => {
    try {
      const res = await fetch('/api/attendance/today-groups/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم فتح مجموعة تسجيل الحضور بنجاح');
        await fetchTodayGroups();
      } else {
        toast.error(data.error || 'فشل فتح المجموعة');
      }
    } catch {
      toast.error('حدث خطأ بالاتصال');
    }
  };

  const handleCloseGroupEarly = async (groupId: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في إغلاق الحضور لهذه المجموعة الآن؟ سيتم تسجيل غياب لجميع الطلاب الذين لم يحضروا.')) return;
    try {
      const res = await fetch('/api/attendance/today-groups/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم إغلاق حضور المجموعة بنجاح وتثبيت الغياب');
        await fetchTodayGroups();
      } else {
        toast.error(data.error || 'فشل إغلاق الحضور');
      }
    } catch {
      toast.error('حدث خطأ بالاتصال');
    }
  };

  useEffect(() => {
    fetchTodayGroups();
  }, []);

  useEffect(() => {
    fetchHistory(historyGroup);
  }, [historyGroup]);

  const handleScan = async (e?: React.FormEvent, bypassFlags?: { forceDuplicate?: boolean; forceDifferentGroup?: boolean; targetCode?: string }) => {
    if (e) e.preventDefault();
    const scanCode = bypassFlags?.targetCode || code;
    if (!scanCode.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: scanCode,
          status: manualStatus,
          homeworkStatus,
          forceDuplicate: bypassFlags?.forceDuplicate || false,
          forceDifferentGroup: bypassFlags?.forceDifferentGroup || false,
          scanMode,
        }),
      });
      const data = await res.json();
      setLastScan(data);
      if (data.success) {
        playBeepSuccess();
        toast.success(data.message || 'تم تسجيل الحضور بنجاح');
        setWarningData(null);
        await fetchHistory();
        await fetchTodayGroups();
        if (absenteesGroup) fetchAbsentees(absenteesGroup);
        setCode('');
      } else if (data.warningType) {
        playBeepWarning();
        setWarningData({
          warningType: data.warningType,
          error: data.error,
          studentCode: scanCode,
          targetGroupId: data.targetGroupId,
        });
      } else {
        playBeepWarning();
        toast.error(data.error || 'فشل تسجيل الحضور');
      }
    } catch (err: any) {
      // 📡 OFFLINE SCAN FALLBACK
      console.warn('Network offline, performing offline scan fallback');
      try {
        const cachedStudents: any[] = (await get('almaestro_cached_students')) || [];
        const cleanCode = scanCode.trim().toLowerCase();

        const student = cachedStudents.find(
          (s: any) =>
            s.code?.toLowerCase() === cleanCode ||
            s.qrCode?.toLowerCase() === cleanCode ||
            s.name?.toLowerCase().includes(cleanCode) ||
            s.id === cleanCode
        );

        if (student) {
          const offlineRecord: AttendanceRecord = {
            id: `OFFLINE-${Date.now()}`,
            student: { name: student.name, code: student.code || student.id },
            session: {
              title: 'حضور أوفلاين',
              group: { id: student.groupId || '', name: student.group?.name || 'المجموعة الحالية' },
            },
            status: manualStatus,
            checkInTime: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };

          const updatedAttendances = [offlineRecord, ...recentAttendances];
          setRecentAttendances(updatedAttendances);
          await set('almaestro_cached_attendances', updatedAttendances);

          // Queue offline attendance for background sync
          const queue: any[] = (await get('almaestro_offline_queue')) || [];
          queue.push({
            studentCode: student.code || scanCode,
            status: manualStatus,
            homeworkStatus,
            scannedAt: new Date().toISOString(),
          });
          await set('almaestro_offline_queue', queue);

          setLastScan({ success: true, message: `[أوفلاين] تم تسجيل حضور الطالب: ${student.name}` });
          toast.success(`تم تسجيل حضور الطالب (${student.name}) محلياً في وضع الأوفلاين 📲`);
          setCode('');
        } else {
          setLastScan({ success: false, error: `[أوفلاين] الطالب برقم (${scanCode}) غير موجود في الحافظة المحلية` });
          toast.error(`الكود (${scanCode}) غير موجود في الحافظة المحلية للأوفلاين`);
        }
      } catch (offlineErr: any) {
        setLastScan({ success: false, error: offlineErr.message });
        toast.error('حدث خطأ في التسجيل المحلي');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmWarning = async () => {
    if (!warningData) return;
    const bypassFlags = {
      forceDuplicate: warningData.warningType === 'DUPLICATE',
      forceDifferentGroup: warningData.warningType === 'DIFFERENT_GROUP',
      targetCode: warningData.studentCode,
    };
    await handleScan(undefined, bypassFlags);
  };

  const todayStr = new Date().toLocaleDateString('ar-EG');
  const todayAttendances = recentAttendances.filter((a) => {
    const d = new Date(a.createdAt).toLocaleDateString('ar-EG');
    return d === todayStr;
  });
  const presentCount = todayAttendances.filter((a) => a.status === 'PRESENT').length;

  const filteredAttendances = historyGroup
    ? recentAttendances.filter((att) => att.session?.group?.id === historyGroup)
    : recentAttendances;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white">📱 ماسح الباركود وتسجيل الحضور</h1>
          <p className="text-slate-400 text-sm mt-1">تسجيل حضور الطلاب عبر مسح الباركود أو الكود اليدوي</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            🖨️ طباعة كشف اليوم
          </button>
          <button onClick={() => fetchHistory()} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
            <h2 className="font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-400" />
              الماسح الضوئي (Barcode)
            </h2>
            <div className="flex items-center gap-2">
              {/* Hardware Scanner Status Badge */}
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className={`text-[11px] px-2.5 py-1 rounded-full font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isFocused
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                }`}
                title={isFocused ? 'الماسح نشط وجاهز لاستقبال قراءة الكروت' : 'الماسح غير نشط - اضغط للتركيز والتشغيل'}
              >
                <span className={`w-2 h-2 rounded-full ${isFocused ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span>{isFocused ? 'الماسح متصل ونشط 🟢' : 'الماسح غير نشط (اضغط هنا) 🔴'}</span>
              </button>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                أتمتة الجلسات نشطة
              </span>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">حالة الحضور</label>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(statusLabels).map(([key, label]) => (
                <button
                  key={key}
                  disabled={scanMode === 'PAY_ONLY'}
                  onClick={() => setManualStatus(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition disabled:opacity-30 ${manualStatus === key && scanMode !== 'PAY_ONLY' ? statusColors[key] : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'}`}
                >
                  {label}
                </button>
              ))}

              {/* Divider */}
              <div className="w-[1px] bg-slate-800 self-stretch min-h-[28px] my-1 mx-1 hidden sm:block" />

              {/* Scan Mode Segment Selector */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
                <button
                  type="button"
                  onClick={() => setScanMode('ATTENDANCE_ONLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scanMode === 'ATTENDANCE_ONLY'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📋 الحضور فقط
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('هل تريد تفعيل وضع دفع الاشتراك الشهري فقط للطلاب عند مسح الباركود؟ (لن يتم تسجيل الحضور اليوم لهذا الإجراء)')) {
                      setScanMode('PAY_ONLY');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scanMode === 'PAY_ONLY'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  💰 دفع الاشتراك فقط
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('هل تريد تفعيل وضع تسجيل الحضور وسداد اشتراك الشهر معاً للطلاب عند مسح الباركود؟')) {
                      setScanMode('BOTH');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scanMode === 'BOTH'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ✨ الحضور ودفع الشهر معاً
                </button>
              </div>
            </div>
          </div>

          {/* Homework Status */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">حالة الواجب (اختياري)</label>
            <div className="flex gap-2">
              <button
                onClick={() => setHomeworkStatus('NONE')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${homeworkStatus === 'NONE' ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-800/50 text-slate-400 border-slate-700'}`}
              >
                بدون تقييم
              </button>
              <button
                onClick={() => setHomeworkStatus('DONE')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${homeworkStatus === 'DONE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800/50 text-slate-400 border-slate-700'}`}
              >
                مكتمل 🟢
              </button>
              <button
                onClick={() => setHomeworkStatus('NOT_DONE')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${homeworkStatus === 'NOT_DONE' ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' : 'bg-slate-800/50 text-slate-400 border-slate-700'}`}
              >
                غير مكتمل 🔴
              </button>
            </div>
          </div>

          {/* Scanner Input */}
          <form onSubmit={(e) => handleScan(e)} className="space-y-3">
            <div className="relative">
              <label className="block text-xs text-slate-400 mb-1.5">باركود الطالب أو البحث بالاسم</label>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  setTimeout(() => setShowDropdown(false), 200);
                }}
                placeholder="مرر الباركود أو اكتب اسم الطالب للبحث..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 focus:outline-none"
              />

              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl max-h-60 overflow-y-auto shadow-2xl shadow-black/80 divide-y divide-slate-800">
                  {searchResults.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setCode(student.name);
                        handleScan(undefined, { targetCode: student.code });
                        setShowDropdown(false);
                      }}
                      className="w-full text-right p-3 hover:bg-slate-800/80 text-xs text-slate-300 hover:text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-white text-sm">{student.name}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">المجموعة: {student.group?.name || 'بدون مجموعة'}</p>
                      </div>
                      <span className="font-mono bg-slate-800 px-2 py-1 rounded text-[10px] text-blue-400">
                        {student.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20"
            >
              {loading ? 'جارٍ التسجيل...' : 'تسجيل الحضور 📲'}
            </button>
          </form>

          {/* Result */}
          {lastScan && (
            <div className={`p-4 rounded-2xl border text-sm ${lastScan.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
              <div className="space-y-2">
                <p className="font-bold flex items-center gap-2">
                  {lastScan.success ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  {lastScan.success ? lastScan.message : (lastScan.error || 'لم يتم التعرف على الكود')}
                </p>

                {lastScan.student && (
                  <div className="pt-2 mt-2 border-t border-dashed border-slate-700/80 space-y-1.5 text-xs">
                    <p className="opacity-90">الطالب: <span className="font-bold text-white text-sm">{lastScan.student.name}</span> ({lastScan.student.code})</p>
                    <p className="opacity-85">المرحلة: <span className="text-slate-200 font-medium">{lastScan.student.stageName || '—'}</span> (الاشتراك: <span className="text-amber-400 font-bold">{lastScan.student.monthlyPrice || 350} ج.م</span>)</p>
                    <p className="opacity-80">المجموعة: {lastScan.student.groupName}</p>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/40">
                      <span className="font-semibold">{lastScan.student.hasActiveSub ? '✅ اشتراك نشط' : '⚠️ لا يوجد اشتراك نشط'}</span>
                      <div className="flex items-center gap-2">
                        {lastScan.student.phone && (
                          <a
                            href={generateDirectWhatsAppLink({
                              phone: lastScan.student.phone,
                              studentName: lastScan.student.name,
                              type: 'ATTENDANCE',
                              details: { status: statusLabels[manualStatus] || 'حاضر ✅' },
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                            title="تواصل مباشر عبر الواتساب"
                          >
                            <MessageSquare className="w-3 h-3" /> واتساب ولي الأمر
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`هل أنت متأكد من تسجيل دفع الاشتراك الشهري بقيمة ${lastScan.student.monthlyPrice || 350} ج.م للطالب (${lastScan.student.name}) وإرسال رسالة لولي أمره؟`)) {
                              try {
                                const response = await fetch('/api/attendance/pay-month', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ studentId: lastScan.student.id }),
                                });
                                const result = await response.json();
                                if (result.success) {
                                  toast.success(result.message);
                                  setLastScan((prev: any) => ({
                                    ...prev,
                                    student: {
                                      ...prev.student,
                                      hasActiveSub: true
                                    }
                                  }));
                                  await fetchTodayGroups();
                                } else {
                                  toast.error(result.error || 'فشل تسجيل الدفع');
                                }
                              } catch {
                                toast.error('حدث خطأ في الاتصال بالخادم');
                              }
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                        >
                          💰 دفع الشهر
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Today Stats & History */}
        <div className="space-y-4">
          {/* Today Summary */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              إحصائيات اليوم
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                <p className="text-2xl font-black text-emerald-400">{presentCount}</p>
                <p className="text-xs text-slate-400 mt-1">حاضر</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
                <p className="text-2xl font-black text-rose-400">
                  {todayAttendances.filter((a) => a.status === 'ABSENT').length}
                </p>
                <p className="text-xs text-slate-400 mt-1">غائب</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
                <p className="text-2xl font-black text-amber-400">
                  {todayAttendances.filter((a) => a.status === 'LATE').length}
                </p>
                <p className="text-xs text-slate-400 mt-1">متأخر</p>
              </div>
            </div>
          </div>

          {/* Tabs Header */}
          <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 gap-1.5">
            <button
              onClick={() => setRightPanelTab('history')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                rightPanelTab === 'history'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              أحدث سجلات الحضور 🕒
            </button>
            <button
              onClick={() => {
                setRightPanelTab('absentees');
                if (!absenteesGroup && todayGroups.length > 0) {
                  const openGrp = todayGroups.find(g => g.sessionStatus === 'OPEN' || g.sessionStatus === 'IN_PROGRESS');
                  setAbsenteesGroup(openGrp ? openGrp.id : todayGroups[0].id);
                }
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                rightPanelTab === 'absentees'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الطلاب الغائبون 👥
            </button>
          </div>

          {/* Tab Content 1: History */}
          {rightPanelTab === 'history' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <h2 className="font-bold text-white text-sm">آخر سجلات الحضور</h2>
              
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">اختر المجموعة لعرض الحضور:</label>
                <select
                  value={historyGroup}
                  onChange={(e) => setHistoryGroup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-bold focus:border-purple-500 focus:outline-none"
                >
                  <option value="">-- كل المجموعات --</option>
                  {todayGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {loadingHistory ? (
                <p className="text-slate-400 text-sm text-center py-4">جارٍ التحميل...</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredAttendances.slice(0, 20).map((att) => (
                    <div key={att.id} className="flex items-center justify-between text-xs p-2.5 bg-slate-950/60 rounded-xl">
                      <div>
                        <p className="font-semibold text-white">{att.student?.name}</p>
                        <p className="text-slate-500">{att.session?.group?.name}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full border text-xs ${statusColors[att.status] || ''}`}>
                          {statusLabels[att.status] || att.status}
                        </span>
                        {att.checkInTime && (
                          <p className="text-slate-500 mt-0.5">
                            {new Date(att.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredAttendances.length === 0 && (
                    <p className="text-slate-500 text-center py-4">لا توجد سجلات حضور</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab Content 2: Absentees */}
          {rightPanelTab === 'absentees' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">اختر المجموعة لعرض الغائبين:</label>
                <select
                  value={absenteesGroup}
                  onChange={(e) => setAbsenteesGroup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-bold focus:border-purple-500 focus:outline-none"
                >
                  <option value="">-- اختر مجموعة --</option>
                  {todayGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.stats.present} / {g.stats.total} طالب)
                    </option>
                  ))}
                </select>
              </div>

              {absenteesGroup && (
                <>
                  {/* Bulk WhatsApp Absence Alert Button */}
                  {absentees.length > 0 && (
                    <button
                      onClick={async () => {
                        if (confirm(`هل تريد إرسال تنبيهات غياب عبر الواتس اب لجميع الطلاب الغائبين في هذه المجموعة (${absentees.length} طالب)؟`)) {
                          setBulkSending(true);
                          try {
                            const res = await fetch('/api/attendance/today-groups/send-absent', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ groupId: absenteesGroup }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              toast.success(data.message || 'تم إرسال رسائل الغياب بنجاح 🎉');
                              await fetchAbsentees(absenteesGroup);
                              await fetchHistory();
                              await fetchTodayGroups();
                            } else {
                              toast.error(data.error || 'فشل إرسال تنبيهات الغياب');
                            }
                          } catch {
                            toast.error('خطأ في الاتصال بالخادم');
                          } finally {
                            setBulkSending(false);
                          }
                        }
                      }}
                      disabled={bulkSending}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow disabled:opacity-50"
                    >
                      {bulkSending ? 'جاري إرسال الرسائل...' : `✉️ إرسال الغياب للكل (${absentees.length} طالب)`}
                    </button>
                  )}

                  {/* Absentees List */}
                  {loadingAbsentees ? (
                    <p className="text-slate-400 text-sm text-center py-4 font-bold animate-pulse">جاري جلب قائمة الغائبين...</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {absentees.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs p-2.5 bg-slate-950/60 rounded-xl hover:bg-slate-950 transition">
                          <div>
                            <p className="font-bold text-white text-sm">{s.name}</p>
                            <p className="text-slate-500 text-[10px] mt-0.5">الكود: {s.code}</p>
                          </div>
                          <div className="flex gap-1.5 items-center">
                            <button
                              onClick={async () => {
                                if (confirm(`هل أنت متأكد من تسجيل حضور الطالب "${s.name}" يدوياً الآن؟ سيتم إرسال إشعار فوري لولي أمره بالواتساب.`)) {
                                  try {
                                    const res = await fetch('/api/attendance/scan', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        studentCode: s.code,
                                        status: 'PRESENT',
                                        homeworkStatus,
                                        scanMode,
                                      }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      toast.success(`تم تسجيل حضور ${s.name} بنجاح 🟢`);
                                      await fetchAbsentees(absenteesGroup);
                                      await fetchHistory();
                                      await fetchTodayGroups();
                                    } else {
                                      toast.error(data.error || 'فشل تسجيل الحضور اليدوي');
                                    }
                                  } catch {
                                    toast.error('خطأ في الاتصال بالخادم');
                                  }
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              🙋‍♂️ حضور
                            </button>
                            <button
                              onClick={() => {
                                const tpl = whatsappTemplates?.absent || '📅 تنبيه غياب\nالطالب: [student_name]\nتغيب عن حضور حصة اليوم بالمجموعة.\nمنصة المايسترو 🏫';
                                const msg = tpl.replace('[student_name]', s.name).replace('[time]', new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
                                
                                const phone = s.parent?.whatsapp || s.parent?.phone || s.phone || '';
                                let cleanPhone = phone.replace(/[^\d]/g, '').trim();
                                if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
                                  cleanPhone = '20' + cleanPhone.slice(1);
                                } else if (cleanPhone.startsWith('1') && cleanPhone.length === 10) {
                                  cleanPhone = '20' + cleanPhone;
                                }
                                
                                const text = encodeURIComponent(msg);
                                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                              }}
                              className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              title="إرسال إنذار غياب يدوي عبر واتساب"
                            >
                              ✉️ غياب يدوي
                            </button>
                          </div>
                        </div>
                      ))}
                      {absentees.length === 0 && (
                        <p className="text-slate-500 text-center py-4">ممتاز! لا يوجد أي طلاب غائبين في هذه المجموعة اليوم 🎉</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Warning confirmation Modal */}
      {warningData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl text-amber-500">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-white">تنبيه تسجيل الحضور</h3>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                {warningData.error}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setWarningData(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء ❌
              </button>
              <button
                type="button"
                onClick={handleConfirmWarning}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 transition cursor-pointer"
              >
                تأكيد وتسجيل الحضور ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Sheet View (Visible only during printing) */}
      <div className="hidden print-area text-slate-900 bg-white p-6 direction-rtl text-right font-sans">
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
          <h1 className="text-2xl font-black">منصة المايسترو - الأستاذ أحمد راضي كحلة</h1>
          <p className="text-sm font-semibold mt-1">كشف حضور وغياب الطلاب اليوم بتاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
        <table className="w-full border-collapse border border-slate-800 text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-800 p-2 text-center">م</th>
              <th className="border border-slate-800 p-2 text-center">كود الطالب</th>
              <th className="border border-slate-800 p-2 text-right">اسم الطالب</th>
              <th className="border border-slate-800 p-2 text-center">المجموعة</th>
              <th className="border border-slate-800 p-2 text-center">حالة الحضور</th>
              <th className="border border-slate-800 p-2 text-center">وقت الحضور</th>
              <th className="border border-slate-800 p-2 text-center">حالة الواجب</th>
            </tr>
          </thead>
          <tbody>
            {todayAttendances.map((att, idx) => (
              <tr key={att.id} className="text-center">
                <td className="border border-slate-800 p-2">{idx + 1}</td>
                <td className="border border-slate-800 p-2 font-mono">{att.student?.code}</td>
                <td className="border border-slate-800 p-2 text-right">{att.student?.name}</td>
                <td className="border border-slate-800 p-2">{att.session?.group?.name}</td>
                <td className="border border-slate-800 p-2 font-bold">{statusLabels[att.status] || att.status}</td>
                <td className="border border-slate-800 p-2 font-mono">
                  {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td className="border border-slate-800 p-2">{att.notes || '—'}</td>
              </tr>
            ))}
            {todayAttendances.length === 0 && (
              <tr>
                <td colSpan={7} className="border border-slate-800 p-4 text-center">لا توجد سجلات حضور اليوم</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-8 flex justify-between text-xs font-semibold">
          <p>إجمالي حضور اليوم: {presentCount} طالب</p>
          <p>توقيع المشرف: .............................</p>
        </div>
      </div>

      {/* Today's Groups Cards Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 mt-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            مجموعات اليوم ({todayGroups.length})
          </h2>
          <button
            onClick={fetchTodayGroups}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث الحالات
          </button>
        </div>

        {loadingGroups ? (
          <p className="text-slate-400 text-sm text-center py-4">جارٍ تحميل مجموعات اليوم...</p>
        ) : todayGroups.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">لا توجد مجموعات مجدولة لليوم</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayGroups.map((group) => {
              const isNotStarted = group.sessionStatus === 'NOT_STARTED' || group.sessionStatus === 'SCHEDULED';
              const isOpen = group.sessionStatus === 'OPEN' || group.sessionStatus === 'IN_PROGRESS';
              const isCompleted = group.sessionStatus === 'COMPLETED';

              return (
                <div
                  key={group.id}
                  onClick={() => {
                    if (isNotStarted) {
                      toast.error('لم يتم تسجيل حضور لأن وقت المجموعة لم يبدأ بعد');
                    } else {
                      setSelectedGroupSheet(group);
                    }
                  }}
                  className={`group cursor-pointer rounded-2xl border p-4 transition-all hover:scale-[1.01] flex flex-col justify-between h-44 ${
                    isOpen
                      ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                      : isCompleted
                      ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition">
                          {group.name}
                        </h3>
                        <p className="text-slate-500 text-[11px] mt-0.5">{group.stageName}</p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          isOpen
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isCompleted
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isOpen ? 'مفتوحة الآن 🟢' : isCompleted ? 'مغلقة (انتهت) 🔒' : 'لم تبدأ بعد ⏳'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{to12h(group.startTime)} - {to12h(group.endTime)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500">حضور اليوم</p>
                      <p className="text-xs font-bold text-white">
                        {group.stats.present} / {group.stats.total} طالب
                      </p>
                    </div>
                    
                    {/* Action Button inside card */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {isNotStarted && (
                        <button
                          onClick={() => handleOpenGroupEarly(group.id)}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          فتح الحضور مبكرًا ✓
                        </button>
                      )}
                      {isOpen && (
                        <button
                          onClick={() => handleCloseGroupEarly(group.id)}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          إنهاء وإغلاق 🔒
                        </button>
                      )}
                      {isCompleted && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          📋 عرض الكشف
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Group Sheet Modal */}
      {selectedGroupSheet && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  📊 كشف حضور وغياب: {selectedGroupSheet.name}
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  مرحلة: {selectedGroupSheet.stageName} | وقت المجموعة: {to12h(selectedGroupSheet.startTime)} - {to12h(selectedGroupSheet.endTime)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const todayStr = new Date().toLocaleDateString('ar-EG');
                      const rows = selectedGroupSheet.students.map((student: any, idx: number) => `
                        <tr style="text-align: center;">
                          <td style="border: 1px solid #333; padding: 8px;">${idx + 1}</td>
                          <td style="border: 1px solid #333; padding: 8px; font-family: monospace;">${student.code}</td>
                          <td style="border: 1px solid #333; padding: 8px; text-align: right;">${student.name}</td>
                          <td style="border: 1px solid #333; padding: 8px; font-weight: bold; color: ${student.status === 'ABSENT' ? 'red' : student.status === 'VACATION' ? 'indigo' : 'green'};">
                            ${student.status === 'PRESENT' ? 'حاضر ✅' : student.status === 'LATE' ? 'متأخر ⚠️' : student.status === 'VACATION' ? 'إجازة 📅' : student.status === 'ABSENT' ? 'غائب ❌' : student.status === 'LEFT_EARLY' ? 'انصرف مبكراً 🔔' : 'لم يحضر بعد'}
                          </td>
                          <td style="border: 1px solid #333; padding: 8px; font-family: monospace;">
                            ${student.checkInTime ? new Date(student.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style="border: 1px solid #333; padding: 8px;">${student.notes || '—'}</td>
                        </tr>
                      `).join('');

                      printWindow.document.write(`
                        <html dir="rtl">
                          <head>
                            <title>كشف حضور وغياب - ${selectedGroupSheet.name}</title>
                            <style>
                              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #111; }
                              h1 { text-align: center; font-size: 20px; margin-bottom: 5px; }
                              p { text-align: center; font-size: 14px; margin-top: 0; color: #555; }
                              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                              th { background-color: #f2f2f2; border: 1px solid #333; padding: 10px; }
                            </style>
                          </head>
                          <body>
                            <h1>منصة المايسترو - الأستاذ أحمد راضي كحلة</h1>
                            <p>كشف حضور وغياب اليوم للمجموعة: <strong>${selectedGroupSheet.name}</strong> (${selectedGroupSheet.stageName}) | تاريخ: ${todayStr}</p>
                            <table>
                              <thead>
                                <tr>
                                  <th>م</th>
                                  <th>كود الطالب</th>
                                  <th>اسم الطالب</th>
                                  <th>حالة الحضور</th>
                                  <th>وقت الحضور</th>
                                  <th>ملاحظات</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${rows}
                              </tbody>
                            </table>
                            <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px;">
                              <span>إجمالي الطلاب: ${selectedGroupSheet.stats.total} | الحضور: ${selectedGroupSheet.stats.present} | الغياب: ${selectedGroupSheet.stats.absent}</span>
                              <span>توقيع المشرف: .............................</span>
                            </div>
                            <script>
                              window.onload = function() { window.print(); window.close(); }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  🖨️ طباعة الكشف
                </button>
                <button
                  onClick={() => setSelectedGroupSheet(null)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  ❌
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                  <p className="text-xl font-black text-emerald-400">{selectedGroupSheet.stats.present}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">إجمالي الحضور</p>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
                  <p className="text-xl font-black text-rose-400">{selectedGroupSheet.stats.absent}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">إجمالي الغياب</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl">
                  <p className="text-xl font-black text-slate-300">{selectedGroupSheet.stats.total}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">إجمالي مقيدين</p>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="p-3 text-center">م</th>
                      <th className="p-3">اسم الطالب</th>
                      <th className="p-3 text-center">الكود</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-center">وقت الحضور</th>
                      <th className="p-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedGroupSheet.students.map((student: any, idx: number) => {
                      const isPresent = student.status === 'PRESENT' || student.status === 'LATE' || student.status === 'LEFT_EARLY';
                      const isAbsent = student.status === 'ABSENT';

                      return (
                        <tr key={student.id} className="hover:bg-slate-900/30 text-slate-300">
                          <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{student.name}</td>
                          <td className="p-3 text-center font-mono text-blue-400">{student.code}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                                isPresent
                                  ? student.status === 'LATE'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : student.status === 'VACATION'
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                  : isAbsent
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-slate-800 text-slate-500 border-slate-700'
                              }`}
                            >
                              {student.status === 'PRESENT'
                                ? 'حاضر ✅'
                                : student.status === 'LATE'
                                ? 'متأخر ⚠️'
                                : student.status === 'VACATION'
                                ? 'إجازة 📅'
                                : student.status === 'ABSENT'
                                ? 'غائب ❌'
                                : student.status === 'LEFT_EARLY'
                                ? 'انصرف مبكراً 🔔'
                                : 'لم يحضر بعد'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-400">
                            {student.checkInTime
                              ? new Date(student.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                          <td className="p-3 text-slate-400 italic">{student.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-area, .print-area * {
            visibility: visible !important;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
            background-color: white !important;
            color: black !important;
          }
        }
      `}} />
    </div>
  );
}
