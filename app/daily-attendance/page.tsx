'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  RefreshCw,
  Trash2,
  Users,
  MessageSquare,
  UserCheck,
  ChevronLeft,
  Clock,
  ClipboardList,
  Send,
  X,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import EmptyState from '@/components/EmptyState';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface StudentSheet {
  id: string;
  name: string;
  code: string;
  phone?: string;
  parent?: { name?: string; phone?: string; whatsapp?: string };
  stageName?: string;
  status: string;
  checkInTime?: string | null;
  notes?: string;
}

interface GroupData {
  id: string;
  name: string;
  stageName?: string;
  startTime: string;
  endTime: string;
  sessionStatus: string;
  sessionId: string | null;
  stats: { present: number; absent: number; total: number };
  students: StudentSheet[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  ABSENT: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  LATE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  LEFT_EARLY: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  EXCUSED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  VACATION: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  LEFT_EARLY: 'انصرف مبكراً',
  EXCUSED: 'غياب بعذر',
  VACATION: 'إجازة',
};

function to12h(time24: string): string {
  if (!time24) return time24;
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const period = h >= 12 ? 'م' : 'ص';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

function getTodayDateString(): string {
  // Returns YYYY-MM-DD in local time
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function formatDateArabic(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// LocalStorage key for clearing viewed history (NOT attendance data)
const HISTORY_KEY = 'daily_attendance_history';

function getViewedHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function addToHistory(date: string) {
  const history = getViewedHistory();
  if (!history.includes(date)) {
    history.unshift(date);
    // Keep only last 30
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
  }
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function DailyAttendancePage() {
  const toast = useToast();
  const today = getTodayDateString();

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  const [sendingAbsent, setSendingAbsent] = useState<string | null>(null); // studentId
  const [markingPresent, setMarkingPresent] = useState<string | null>(null); // studentId
  const [bulkSending, setBulkSending] = useState(false);

  const [viewedHistory, setViewedHistory] = useState<string[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<any>(null);

  // Load WA templates
  useEffect(() => {
    fetch('/api/settings/whatsapp')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) setWhatsappTemplates(data.settings.templates);
      })
      .catch(() => {});
  }, []);

  // Load local history
  useEffect(() => {
    setViewedHistory(getViewedHistory());
  }, []);

  // ── Fetch groups for a date ──
  const fetchGroups = useCallback(
    async (date: string) => {
      setLoading(true);
      setGroups([]);
      setHasData(false);
      try {
        const res = await fetch(`/api/attendance/by-date?date=${date}`);
        const data = await res.json();
        if (data.success) {
          setGroups(data.groups || []);
          setHasData(true);
          addToHistory(date);
          setViewedHistory(getViewedHistory());
          // If the modal is open, refresh it
          if (selectedGroup) {
            const updated = (data.groups as GroupData[]).find((g) => g.id === selectedGroup.id);
            if (updated) setSelectedGroup(updated);
          }
        } else {
          toast.error(data.error || 'فشل تحميل بيانات اليوم');
        }
      } catch {
        toast.error('خطأ في الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedGroup]
  );

  // Auto-fetch on mount and date change
  useEffect(() => {
    fetchGroups(selectedDate);
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send absence WhatsApp alert manually ──
  const handleSendAbsentAlert = (student: StudentSheet, groupName: string) => {
    const tpl =
      whatsappTemplates?.absent ||
      '📅 تنبيه غياب\nالطالب: [student_name]\nتغيب عن حضور حصة اليوم بالمجموعة: [group_name].\nمنصة المايسترو 🏫';
    const msg = tpl
      .replace('[student_name]', student.name)
      .replace('[group_name]', groupName)
      .replace(
        '[time]',
        new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      );

    const phone = student.parent?.whatsapp || student.parent?.phone || student.phone || '';
    let clean = phone.replace(/[^\d]/g, '').trim();
    if (clean.startsWith('01') && clean.length === 11) clean = '20' + clean.slice(1);
    else if (clean.startsWith('1') && clean.length === 10) clean = '20' + clean;

    if (!clean) {
      toast.error(`لا يوجد رقم هاتف لولي أمر ${student.name}`);
      return;
    }

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Mark student present (even after session closed) ──
  const handleMarkPresent = async (student: StudentSheet, groupId: string) => {
    if (
      !confirm(
        `هل أنت متأكد من تسجيل حضور الطالب "${student.name}" يدوياً الآن؟`
      )
    )
      return;

    setMarkingPresent(student.id);
    try {
      // First open the session if it's closed
      if (selectedGroup?.sessionStatus === 'COMPLETED' || selectedGroup?.sessionStatus === 'NOT_STARTED') {
        const openRes = await fetch('/api/attendance/today-groups/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId }),
        });
        const openData = await openRes.json();
        if (!openData.success) {
          toast.error(openData.error || 'فشل إعادة فتح المجموعة');
          return;
        }
      }

      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: student.code,
          status: 'PRESENT',
          homeworkStatus: 'NONE',
          forceDuplicate: true,
          scanMode: 'ATTENDANCE_ONLY',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ تم تسجيل حضور ${student.name} بنجاح`);
        await fetchGroups(selectedDate);
      } else {
        toast.error(data.error || 'فشل تسجيل الحضور');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setMarkingPresent(null);
    }
  };

  // ── Bulk send absence alerts ──
  const handleBulkSendAbsent = async () => {
    if (!selectedGroup) return;
    const absentStudents = selectedGroup.students.filter((s) => s.status === 'ABSENT' || s.status === '');
    if (absentStudents.length === 0) {
      toast.info('لا يوجد طلاب غائبون في هذه المجموعة');
      return;
    }
    if (
      !confirm(
        `هل تريد إرسال تنبيهات غياب لـ ${absentStudents.length} طالب غائب عبر الواتساب؟`
      )
    )
      return;

    setBulkSending(true);
    try {
      const res = await fetch('/api/attendance/today-groups/send-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroup.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'تم إرسال رسائل الغياب بنجاح 🎉');
        await fetchGroups(selectedDate);
      } else {
        toast.error(data.error || 'فشل إرسال تنبيهات الغياب');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setBulkSending(false);
    }
  };

  // ── Print sheet ──
  const handlePrintSheet = () => {
    if (!selectedGroup) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateLabel = formatDateArabic(selectedDate);
    const rows = selectedGroup.students
      .map(
        (s, idx) => `
        <tr style="text-align: center;">
          <td style="border: 1px solid #333; padding: 8px;">${idx + 1}</td>
          <td style="border: 1px solid #333; padding: 8px; font-family: monospace;">${s.code}</td>
          <td style="border: 1px solid #333; padding: 8px; text-align: right;">${s.name}</td>
          <td style="border: 1px solid #333; padding: 8px; font-weight: bold; color: ${
            s.status === 'ABSENT'
              ? 'red'
              : s.status === 'VACATION'
              ? 'indigo'
              : 'green'
          };">
            ${
              s.status === 'PRESENT'
                ? 'حاضر ✅'
                : s.status === 'LATE'
                ? 'متأخر ⚠️'
                : s.status === 'VACATION'
                ? 'إجازة 📅'
                : s.status === 'ABSENT'
                ? 'غائب ❌'
                : s.status === 'LEFT_EARLY'
                ? 'انصرف مبكراً 🔔'
                : 'لم يحضر بعد'
            }
          </td>
          <td style="border: 1px solid #333; padding: 8px; font-family: monospace;">
            ${s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </td>
          <td style="border: 1px solid #333; padding: 8px;">${s.notes || '—'}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>كشف حضور وغياب - ${selectedGroup.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #111; }
            h1 { text-align: center; font-size: 20px; margin-bottom: 5px; }
            p { text-align: center; font-size: 14px; margin-top: 0; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background-color: #f2f2f2; border: 1px solid #333; padding: 10px; }
          </style>
        </head>
        <body>
          <h1>منصة المايسترو</h1>
          <p>كشف حضور وغياب: <strong>${selectedGroup.name}</strong> (${selectedGroup.stageName || ''}) | تاريخ: ${dateLabel}</p>
          <p>وقت المجموعة: ${to12h(selectedGroup.startTime)} - ${to12h(selectedGroup.endTime)}</p>
          <table>
            <thead>
              <tr>
                <th>م</th><th>كود الطالب</th><th>اسم الطالب</th><th>حالة الحضور</th><th>وقت الحضور</th><th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px;">
            <span>إجمالي الطلاب: ${selectedGroup.stats.total} | الحضور: ${selectedGroup.stats.present} | الغياب: ${selectedGroup.stats.absent}</span>
            <span>توقيع المشرف: .............................</span>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  const isToday = selectedDate === today;

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-purple-400" />
            تحصيل غياب اليوم
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            استعراض كشوف الحضور والغياب حسب التاريخ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear local history button */}
          <button
            onClick={() => {
              if (
                confirm(
                  'هل تريد مسح سجل الأيام التي شاهدتها سابقاً؟\n⚠️ لن يتم مسح بيانات الحضور والغياب — فقط سجل التصفح المحلي.'
                )
              ) {
                clearHistory();
                setViewedHistory([]);
                toast.success('تم مسح سجل التصفح المحلي بنجاح');
              }
            }}
            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="مسح سجل الأيام المشاهدة محلياً (لا يمسح بيانات الحضور)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            مسح السجل
          </button>

          <button
            onClick={() => fetchGroups(selectedDate)}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition disabled:opacity-50 cursor-pointer"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Date Picker Card ── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              <CalendarDays className="w-3.5 h-3.5 inline ml-1" />
              اختر التاريخ
            </label>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="w-full sm:w-72 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none transition"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-slate-400 text-xs">
              📅 {formatDateArabic(selectedDate)}
            </p>
            {isToday && (
              <span className="text-[10px] px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-bold w-fit">
                اليوم الحالي 🟢
              </span>
            )}
          </div>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(today)}
              className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              العودة لليوم 🗓️
            </button>
          )}
        </div>

        {/* Viewed history chips */}
        {viewedHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 mb-2 font-semibold">الأيام المشاهدة سابقاً:</p>
            <div className="flex flex-wrap gap-2">
              {viewedHistory.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold transition cursor-pointer ${
                    d === selectedDate
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {d === today ? '📅 اليوم' : d}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Groups Section ── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            المجموعات في هذا اليوم
            {hasData && (
              <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-full">
                {groups.length} مجموعة
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
            <span className="text-sm font-semibold animate-pulse">جارٍ تحميل البيانات...</span>
          </div>
        ) : !hasData ? (
          <EmptyState
            variant="attendance"
            title="حدد تاريخ الكشف"
            description="اختر تاريخاً من الأعلى لاستعراض المجموعات المسجلة وكشوفات الحضور والغياب الخاصة بها."
          />
        ) : groups.length === 0 ? (
          <EmptyState
            variant="groups"
            title="لا توجد مجموعات مسجلة في هذا اليوم"
            description="يتم فتح الجلسات وتسجيل الحضور تلقائياً عند بدء حصص المجموعة في هذا اليوم."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => {
              const isOpen =
                group.sessionStatus === 'OPEN' || group.sessionStatus === 'IN_PROGRESS';
              const isCompleted = group.sessionStatus === 'COMPLETED';
              const absentCount = group.stats.absent;
              const attendanceRate =
                group.stats.total > 0
                  ? Math.round((group.stats.present / group.stats.total) * 100)
                  : 0;

              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`group cursor-pointer rounded-2xl border p-4 transition-all hover:scale-[1.01] flex flex-col justify-between min-h-[160px] ${
                    isOpen
                      ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                      : isCompleted
                      ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-900/40 border-slate-800/60'
                  }`}
                >
                  {/* Top row */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm group-hover:text-purple-400 transition truncate">
                          {group.name}
                        </h3>
                        <p className="text-slate-500 text-[11px] mt-0.5">{group.stageName}</p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                          isOpen
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isCompleted
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isOpen ? 'مفتوحة 🟢' : isCompleted ? 'مغلقة 🔒' : 'لم تبدأ ⏳'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {to12h(group.startTime)} - {to12h(group.endTime)}
                      </span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-xs">
                        <span className="text-emerald-400 font-bold">
                          ✅ {group.stats.present}
                        </span>
                        {absentCount > 0 && (
                          <span className="text-rose-400 font-bold">
                            ❌ {absentCount}
                          </span>
                        )}
                        <span className="text-slate-500">/ {group.stats.total}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-bold text-slate-400">
                          {attendanceRate}%
                        </div>
                        <span className="text-[10px] text-purple-400 font-semibold group-hover:underline flex items-center gap-0.5">
                          عرض الكشف <ChevronLeft className="w-3 h-3" />
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-400 transition-all"
                        style={{ width: `${attendanceRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────
          Attendance Sheet Modal
      ────────────────────────────────────────────── */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[95] flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="truncate">كشف حضور وغياب: {selectedGroup.name}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {selectedGroup.stageName} | {to12h(selectedGroup.startTime)} -{' '}
                  {to12h(selectedGroup.endTime)} | {formatDateArabic(selectedDate)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Print */}
                <button
                  onClick={handlePrintSheet}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  طباعة
                </button>

                {/* Bulk send absent alerts */}
                {selectedGroup.students.some((s) => s.status === 'ABSENT' || s.status === '') && (
                  <button
                    onClick={handleBulkSendAbsent}
                    disabled={bulkSending}
                    className="px-3 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {bulkSending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        جارٍ الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        إرسال غياب الكل
                      </>
                    )}
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="px-5 pt-5 shrink-0">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                  <p className="text-2xl font-black text-emerald-400">
                    {selectedGroup.stats.present}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">إجمالي الحضور</p>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
                  <p className="text-2xl font-black text-rose-400">
                    {selectedGroup.stats.absent}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">إجمالي الغياب</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl">
                  <p className="text-2xl font-black text-slate-300">
                    {selectedGroup.stats.total}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">إجمالي مقيدين</p>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="p-5 overflow-y-auto flex-1">
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="p-3 text-center">م</th>
                      <th className="p-3">اسم الطالب</th>
                      <th className="p-3 text-center hidden sm:table-cell">الكود</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-center hidden md:table-cell">وقت الحضور</th>
                      <th className="p-3 text-center hidden lg:table-cell">ملاحظات</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedGroup.students.map((student, idx) => {
                      const isPresent =
                        student.status === 'PRESENT' ||
                        student.status === 'LATE' ||
                        student.status === 'LEFT_EARLY';
                      const isAbsent =
                        student.status === 'ABSENT' || student.status === '';
                      const isVacation = student.status === 'VACATION';

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-slate-900/30 transition ${
                            isAbsent ? 'bg-rose-950/5' : ''
                          }`}
                        >
                          <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{student.name}</td>
                          <td className="p-3 text-center font-mono text-blue-400 hidden sm:table-cell">
                            {student.code}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                                isPresent
                                  ? student.status === 'LATE'
                                    ? STATUS_COLORS.LATE
                                    : STATUS_COLORS.PRESENT
                                  : isVacation
                                  ? STATUS_COLORS.VACATION
                                  : isAbsent
                                  ? STATUS_COLORS.ABSENT
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
                          <td className="p-3 text-center font-mono text-slate-400 hidden md:table-cell">
                            {student.checkInTime
                              ? new Date(student.checkInTime).toLocaleTimeString('ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="p-3 text-slate-400 italic hidden lg:table-cell">
                            {student.notes || '—'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Mark Present button (for absent students) */}
                              {isAbsent && (
                                <button
                                  onClick={() =>
                                    handleMarkPresent(student, selectedGroup.id)
                                  }
                                  disabled={markingPresent === student.id}
                                  title="تسجيل حضور يدوي"
                                  className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer disabled:opacity-50"
                                >
                                  {markingPresent === student.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <UserCheck className="w-3 h-3 inline ml-0.5" />
                                      حضور
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Send WhatsApp absence alert */}
                              {(isAbsent || !student.status) && (
                                <button
                                  onClick={() =>
                                    handleSendAbsentAlert(student, selectedGroup.name)
                                  }
                                  title="إرسال إنذار غياب يدوي عبر الواتساب"
                                  className="px-2 py-1 bg-green-700/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                >
                                  <MessageSquare className="w-3 h-3 inline ml-0.5" />
                                  واتساب
                                </button>
                              )}

                              {isPresent && (
                                <span className="text-[10px] text-emerald-500 font-semibold">
                                  ✓ حضر
                                </span>
                              )}
                              {isVacation && (
                                <span className="text-[10px] text-indigo-400 font-semibold">
                                  📅 إجازة
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Alert about manual attendance after session ends */}
              {(selectedGroup.sessionStatus === 'COMPLETED' ||
                selectedGroup.sessionStatus === 'NOT_STARTED') && (
                <div className="mt-4 flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-300 text-xs leading-relaxed">
                    {selectedGroup.sessionStatus === 'COMPLETED'
                      ? 'هذه المجموعة منتهية — يمكنك تسجيل حضور الطلاب يدوياً وستُعاد فتح الجلسة تلقائياً.'
                      : 'هذه المجموعة لم تبدأ بعد — سيتم فتحها تلقائياً عند تسجيل الحضور.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
