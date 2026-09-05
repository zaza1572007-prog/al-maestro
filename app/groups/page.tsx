'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { addOfflineGroup } from '@/lib/offlineSync';

interface ScheduleSlot {
  day: string;
  startTime: string;
  endTime: string;
}

interface Group {
  id: string;
  name: string;
  stage: string;
  stageId: string;
  days: string;
  time: string;
  schedule?: ScheduleSlot[];
  isDifferentSchedule?: boolean;
  studentsCount: number;
  assistant: string;
  attendanceAvg: string;
  maxStudents: number;
}

const ALL_WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

// تحويل التوقيت من 24 ساعة إلى 12 ساعة (عربي)
function to12h(time24: string): string {
  if (!time24) return time24;
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const m = mStr ? mStr.slice(0, 2) : '00';
  const period = h >= 12 ? 'م' : 'ص';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

// دالة استخراج الأيام من النص العربي
function parseDaysFromText(text: string): string[] {
  if (!text) return [];
  const possibleDays = [
    { key: 'السبت', patterns: [/السبت/] },
    { key: 'الأحد', patterns: [/الأحد/, /الاحد/, /الحد/] },
    { key: 'الاثنين', patterns: [/الاثنين/, /الإثنين/, /الاتنين/] },
    { key: 'الثلاثاء', patterns: [/الثلاثاء/, /التلات/, /التلاتاء/] },
    { key: 'الأربعاء', patterns: [/الأربعاء/, /الاربعاء/, /الاربع/] },
    { key: 'الخميس', patterns: [/الخميس/] },
    { key: 'الجمعة', patterns: [/الجمعة/, /الجمعه/] },
  ];
  const matched: string[] = [];
  for (const day of possibleDays) {
    if (day.patterns.some((p) => p.test(text))) {
      matched.push(day.key);
    }
  }
  if (matched.length > 0) return matched;
  return text
    .split(/[،,و+&]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// دالة تحويل نص الوقت مثل "4:00 م" أو "16:00" إلى "16:00"
function parseArabicTimeTo24h(tStr: string, fallback = '16:00'): string {
  if (!tStr) return fallback;
  let clean = tStr.trim();
  const isPM = clean.includes('م') || clean.toLowerCase().includes('pm');
  const isAM = clean.includes('ص') || clean.toLowerCase().includes('am');
  clean = clean.replace(/[^\d:]/g, '');
  const parts = clean.split(':');
  if (parts.length >= 1 && parts[0]) {
    let h = parseInt(parts[0], 10);
    const m = parts[1] ? parts[1].padStart(2, '0') : '00';
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  return fallback;
}

function GroupsContent() {
  const searchParams = useSearchParams();
  const gradeFilter = searchParams.get('grade');
  const stageIdFilter = searchParams.get('stageId');
  const [activeTab, setActiveTab] = useState('overview');

  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [stagesList, setStagesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editTimingMode, setEditTimingMode] = useState<'UNIFIED' | 'DIFFERENT'>('UNIFIED');
  const [editStartTime, setEditStartTime] = useState('16:00');
  const [editEndTime, setEditEndTime] = useState('18:00');
  const [editSlots, setEditSlots] = useState<ScheduleSlot[]>([]);

  // Add modal state
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    stageId: '',
    days: 'السبت والثلاثاء',
    timingMode: 'UNIFIED' as 'UNIFIED' | 'DIFFERENT',
    startTime: '16:00',
    endTime: '18:00',
    slots: [
      { day: 'السبت', startTime: '16:00', endTime: '18:00' },
      { day: 'الثلاثاء', startTime: '16:00', endTime: '18:00' },
    ] as ScheduleSlot[],
    maxCapacity: 30,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Real Groups & Stages from PostgreSQL API
  const fetchRealGroupsAndStages = async () => {
    setLoading(true);
    try {
      const [grpRes, stgRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/stages'),
      ]);
      const grpData = await grpRes.json();
      const stgData = await stgRes.json();
      if (stgData.success) setStagesList(stgData.stages || []);
      if (grpData.success) {
        const formatted: Group[] = (grpData.groups || []).map((g: any) => {
          const rawSchedule: ScheduleSlot[] = Array.isArray(g.schedule) && g.schedule.length > 0
            ? g.schedule
            : (g.scheduleDays || []).map((d: string) => ({
                day: d,
                startTime: g.startTime || '16:00',
                endTime: g.endTime || '18:00',
              }));

          // Check if timings differ between days
          const firstStart = rawSchedule[0]?.startTime;
          const firstEnd = rawSchedule[0]?.endTime;
          const hasDifferentTimes = rawSchedule.length > 1 && rawSchedule.some(
            (s) => s.startTime !== firstStart || s.endTime !== firstEnd
          );

          let displayTime = `${to12h(g.startTime)} - ${to12h(g.endTime)}`;
          if (hasDifferentTimes) {
            displayTime = rawSchedule.map((s) => `${s.day} (${to12h(s.startTime)} - ${to12h(s.endTime)})`).join(' • ');
          }

          return {
            id: g.id,
            name: g.name,
            stage: g.academicStage?.name || 'مرحلة دراسية',
            stageId: g.academicStageId,
            days: g.scheduleDays?.join(' و ') || 'السبت والثلاثاء',
            time: displayTime,
            schedule: rawSchedule,
            isDifferentSchedule: hasDifferentTimes,
            studentsCount: g._count?.students || 0,
            assistant: g.assistant?.name || '—',
            attendanceAvg: '—',
            maxStudents: g.maxCapacity || 30,
          };
        });
        setGroupsList(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealGroupsAndStages();
  }, []);

  // When adding a new group: update slots when days text changes
  const handleNewGroupDaysChange = (daysStr: string) => {
    const parsedDays = parseDaysFromText(daysStr);
    const updatedSlots = parsedDays.map((day) => {
      const existing = newGroup.slots.find((s) => s.day === day);
      return existing || { day, startTime: newGroup.startTime, endTime: newGroup.endTime };
    });
    setNewGroup({
      ...newGroup,
      days: daysStr,
      slots: updatedSlots.length > 0 ? updatedSlots : [{ day: 'السبت', startTime: newGroup.startTime, endTime: newGroup.endTime }],
    });
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    const actualStageId = newGroup.stageId || stagesList[0]?.id;
    if (!actualStageId) {
      alert('يرجى إضافة مرحلة دراسية أولاً من شاشة المراحل قبل إنشاء مجموعة.');
      return;
    }
    if (!newGroup.name.trim()) {
      alert('يرجى إدخال اسم المجموعة.');
      return;
    }

    setIsSaving(true);
    let payloadSchedule: ScheduleSlot[] = [];
    if (newGroup.timingMode === 'DIFFERENT' && newGroup.slots.length > 0) {
      payloadSchedule = newGroup.slots;
    } else {
      const parsedDays = parseDaysFromText(newGroup.days);
      const daysToUse = parsedDays.length > 0 ? parsedDays : ['السبت', 'الثلاثاء'];
      payloadSchedule = daysToUse.map((day) => ({
        day,
        startTime: newGroup.startTime,
        endTime: newGroup.endTime,
      }));
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroup.name.trim(),
          academicStageId: actualStageId,
          scheduleDays: payloadSchedule.map((s) => s.day),
          startTime: payloadSchedule[0]?.startTime || '16:00',
          endTime: payloadSchedule[0]?.endTime || '18:00',
          schedule: payloadSchedule,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRealGroupsAndStages();
        setIsAddingGroup(false);
        setNewGroup({
          name: '',
          stageId: '',
          days: 'السبت والثلاثاء',
          timingMode: 'UNIFIED',
          startTime: '16:00',
          endTime: '18:00',
          slots: [
            { day: 'السبت', startTime: '16:00', endTime: '18:00' },
            { day: 'الثلاثاء', startTime: '16:00', endTime: '18:00' },
          ],
          maxCapacity: 30,
        });
      } else {
        alert(data.error || 'حدث خطأ أثناء إنشاء المجموعة');
      }
    } catch (err) {
      try {
        const groupPayload = {
          name: newGroup.name.trim(),
          academicStageId: actualStageId,
          scheduleDays: payloadSchedule.map((s: any) => s.day),
          startTime: payloadSchedule[0]?.startTime || '16:00',
          endTime: payloadSchedule[0]?.endTime || '18:00',
          schedule: payloadSchedule,
        };

        const { group: addedOffline } = await addOfflineGroup(groupPayload);
        setGroupsList((prev) => [addedOffline, ...prev]);
        setIsAddingGroup(false);
        setNewGroup({
          name: '',
          stageId: '',
          days: 'السبت والثلاثاء',
          timingMode: 'UNIFIED',
          startTime: '16:00',
          endTime: '18:00',
          slots: [
            { day: 'السبت', startTime: '16:00', endTime: '18:00' },
            { day: 'الثلاثاء', startTime: '16:00', endTime: '18:00' },
          ],
          maxCapacity: 30,
        });
        alert(`[أوفلاين] تم حفظ المجموعة (${newGroup.name.trim()}) محلياً بجهازك! 📲 وستنرفع فور توفر النت.`);
      } catch (offlineErr) {
        alert('حدث خطأ في الحفظ المحلي للمجموعة');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف مجموعة "${name}" نهائياً؟`)) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchRealGroupsAndStages();
      } else {
        alert(data.error || 'لا يمكن حذف المجموعة');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  // Open Edit Modal with intelligent detection of uniform vs different schedules
  const handleEditClick = (grp: Group) => {
    setEditingGroup({ ...grp });
    
    // Determine schedule slots
    const parsedDays = parseDaysFromText(grp.days);
    let initialSlots: ScheduleSlot[] = [];
    if (grp.schedule && grp.schedule.length > 0) {
      initialSlots = [...grp.schedule];
    } else {
      const parts = grp.time.split(/[-–—]+/);
      const st = parseArabicTimeTo24h(parts[0], '16:00');
      const et = parseArabicTimeTo24h(parts[1], '18:00');
      initialSlots = parsedDays.map((d) => ({ day: d, startTime: st, endTime: et }));
    }

    if (initialSlots.length === 0) {
      initialSlots = [{ day: 'السبت', startTime: '16:00', endTime: '18:00' }];
    }

    const firstStart = initialSlots[0]?.startTime || '16:00';
    const firstEnd = initialSlots[0]?.endTime || '18:00';
    setEditStartTime(firstStart);
    setEditEndTime(firstEnd);
    setEditSlots(initialSlots);

    // If grp has different times, switch to DIFFERENT mode, else UNIFIED
    if (grp.isDifferentSchedule) {
      setEditTimingMode('DIFFERENT');
    } else {
      setEditTimingMode('UNIFIED');
    }
  };

  // When editing: sync days text with slots
  const handleEditDaysChange = (daysStr: string) => {
    if (!editingGroup) return;
    const parsedDays = parseDaysFromText(daysStr);
    const updatedSlots = parsedDays.map((day) => {
      const existing = editSlots.find((s) => s.day === day);
      return existing || { day, startTime: editStartTime, endTime: editEndTime };
    });
    setEditingGroup({ ...editingGroup, days: daysStr });
    if (updatedSlots.length > 0) {
      setEditSlots(updatedSlots);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    setIsSaving(true);

    try {
      let payloadSchedule: ScheduleSlot[] = [];
      let finalStartTime = editStartTime;
      let finalEndTime = editEndTime;

      if (editTimingMode === 'DIFFERENT' && editSlots.length > 0) {
        payloadSchedule = editSlots;
        finalStartTime = editSlots[0].startTime;
        finalEndTime = editSlots[0].endTime;
      } else {
        const parsedDays = parseDaysFromText(editingGroup.days);
        const daysToUse = parsedDays.length > 0 ? parsedDays : ['السبت'];
        payloadSchedule = daysToUse.map((day) => ({
          day,
          startTime: editStartTime,
          endTime: editEndTime,
        }));
      }

      const res = await fetch(`/api/groups/${editingGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingGroup.name,
          days: payloadSchedule.map((s) => s.day).join(' و '),
          scheduleDays: payloadSchedule.map((s) => s.day),
          startTime: finalStartTime,
          endTime: finalEndTime,
          schedule: payloadSchedule,
          time: `${to12h(finalStartTime)} - ${to12h(finalEndTime)}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchRealGroupsAndStages();
        setEditingGroup(null);
      } else {
        alert(data.error || 'حدث خطأ أثناء تحديث بيانات المجموعة');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter groups by grade name OR stageId
  const groups = groupsList.filter((g) => {
    if (stageIdFilter) return g.stageId === stageIdFilter;
    if (gradeFilter) return g.stage.includes(gradeFilter) || gradeFilter.includes(g.stage);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white flex items-center gap-2">
            <span>👥</span>
            <span>إدارة المجموعات (Groups Module)</span>
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
            {gradeFilter ? `عرض مجموعات الصف الدراسي: ${gradeFilter}` : 'عرض وإدارة مجموعات الدروس وجداول المواعيد اليومية'}
          </p>
        </div>
        <button
          onClick={() => {
            if (stagesList.length === 0) {
              alert('يرجى إضافة مرحلة دراسية أولاً من شاشة المراحل قبل إنشاء مجموعة.');
              return;
            }
            setIsAddingGroup(true);
          }}
          className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl text-sm transition flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-98"
        >
          <span>➕</span> إضافة مجموعة جديدة
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 overflow-x-auto no-scrollbar scrollbar-none">
        {[
          { id: 'overview', label: 'نظرة عامة (Overview)' },
          { id: 'students', label: 'الطلاب (Students)' },
          { id: 'attendance', label: 'الحضور (Attendance)' },
          { id: 'homework', label: 'الواجبات (Homework)' },
          { id: 'exams', label: 'الامتحانات (Exams)' },
          { id: 'payments', label: 'المدفوعات (Payments)' },
          { id: 'files', label: 'الملفات (Files)' },
          { id: 'activity', label: 'سجل النشاط (Activity)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground font-bold shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Groups List Grid */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 font-medium">جارٍ تحميل المجموعات الحقيقية من قاعدة البيانات...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((grp) => (
            <div
              key={grp.id}
              className="glass-card bg-gradient-to-br from-white/95 via-white/85 to-purple-50/40 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-indigo-950/30 border border-zinc-200/90 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-md dark:shadow-2xl space-y-4 transition-all duration-300 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/15 relative overflow-hidden backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-white/10 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] flex items-center justify-center font-black text-base">
                    🎓
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">{grp.name}</h3>
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-bold mt-0.5">{grp.stage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(grp)}
                    className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-700 hover:text-white dark:text-amber-300 dark:hover:text-white border border-amber-500/30 shadow-xs hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(grp.id, grp.name)}
                    className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500 text-rose-700 hover:text-white dark:text-rose-300 dark:hover:text-white border border-rose-500/30 shadow-xs hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>

              {/* Schedule timing section */}
              <div className="bg-white/60 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-white/10 space-y-2 text-xs backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 font-semibold">
                    <span className="text-sm">🗓️</span> مواعيد الحصص:
                  </span>
                  {grp.isDifferentSchedule ? (
                    <span className="px-2.5 py-0.5 bg-purple-500/15 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black border border-purple-500/30 shadow-xs">
                      مواعيد مختلفة لكل يوم
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-primary/15 text-primary dark:text-purple-300 rounded-full text-[10px] font-black border border-primary/30 shadow-xs">
                      موعد موحد
                    </span>
                  )}
                </div>
                {grp.schedule && grp.schedule.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {grp.schedule.map((slot, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 text-zinc-800 dark:text-zinc-200 text-xs border border-zinc-200/90 dark:border-white/10 font-medium shadow-xs"
                      >
                        <strong className="text-primary font-bold">{slot.day}:</strong>
                        <span dir="ltr" className="font-mono tabular-nums">{to12h(slot.startTime)} - {to12h(slot.endTime)}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-800 dark:text-zinc-200 font-bold font-mono" dir="ltr">{grp.time}</p>
                )}
              </div>

              {/* 3-column stats grid with Vibrant Glowing Colored Glass Pills */}
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                {/* Column 1: Students (Purple Glass) */}
                <div className="bg-gradient-to-br from-purple-500/15 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-900/10 p-3 rounded-2xl border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.12)]">
                  <p className="text-purple-700 dark:text-purple-300 text-[11px] font-bold">عدد الطلاب</p>
                  <p className="text-lg font-black text-purple-700 dark:text-white mt-1 font-mono tabular-nums">{grp.studentsCount}</p>
                </div>

                {/* Column 2: Attendance Avg (Emerald Glass) */}
                <div className="bg-gradient-to-br from-emerald-500/15 to-teal-600/5 dark:from-emerald-500/20 dark:to-teal-900/10 p-3 rounded-2xl border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.12)]">
                  <p className="text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">متوسط الحضور</p>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono tabular-nums">{grp.attendanceAvg}</p>
                </div>

                {/* Column 3: Assistant (Blue Glass) */}
                <div className="bg-gradient-to-br from-blue-500/15 to-cyan-600/5 dark:from-blue-500/20 dark:to-cyan-900/10 p-3 rounded-2xl border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.12)]">
                  <p className="text-blue-700 dark:text-blue-300 text-[11px] font-bold">المساعد</p>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-200 mt-1.5 truncate">{grp.assistant || 'غير محدد'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2.5 border-t border-zinc-200/70 dark:border-white/10">
                <span className="text-zinc-600 dark:text-zinc-300">أيام الدراسة: <strong className="text-zinc-950 dark:text-white font-bold">{grp.days}</strong></span>
                <Link
                  href={`/students?groupId=${grp.id}`}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition text-xs shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-98"
                >
                  <span>إدارة الطلاب والمجموعة</span>
                  <span>←</span>
                </Link>
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="col-span-2 text-center py-12 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              لا توجد مجموعات مسجلة لهذا الصف الدراسي حالياً
            </div>
          )}
        </div>
      )}

      {/* Add Group Modal */}
      {isAddingGroup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">➕ إضافة مجموعة تعليمية جديدة</h3>
              <button onClick={() => setIsAddingGroup(false)} className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white text-lg cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-semibold">اسم المجموعة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مجموعة التفوق (السبت والثلاثاء)"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-semibold">المرحلة الدراسية *</label>
                <select
                  value={newGroup.stageId}
                  onChange={(e) => setNewGroup({ ...newGroup, stageId: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white focus:border-primary outline-none"
                >
                  {stagesList.map((stg) => (
                    <option key={stg.id} value={stg.id}>{stg.name}</option>
                  ))}
                </select>
              </div>

              {/* Days of Attendance input */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-semibold">أيام الحضور</label>
                <input
                  type="text"
                  placeholder="مثال: السبت والثلاثاء أو الخميس"
                  value={newGroup.days}
                  onChange={(e) => handleNewGroupDaysChange(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white focus:border-primary outline-none"
                />
                <p className="text-[11px] text-zinc-500 dark:text-slate-400 mt-1">اكتب أسماء الأيام تفصلها "و" (مثال: السبت و الثلاثاء)</p>
              </div>

              {/* Timing Mode Switch */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-2.5">
                  <span className="font-bold text-zinc-950 dark:text-white text-xs">نوع التوقيت للمجموعة:</span>
                  <div className="flex items-center gap-1.5 bg-zinc-200/80 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-300 dark:border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() => setNewGroup({ ...newGroup, timingMode: 'UNIFIED' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        newGroup.timingMode === 'UNIFIED'
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-slate-200'
                      }`}
                    >
                      ⏱️ توقيت موحد
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewGroup({ ...newGroup, timingMode: 'DIFFERENT' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        newGroup.timingMode === 'DIFFERENT'
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-slate-200'
                      }`}
                    >
                      🔀 توقيت مختلف لكل يوم
                    </button>
                  </div>
                </div>

                {/* Case 1: Unified Timing */}
                {newGroup.timingMode === 'UNIFIED' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-zinc-700 dark:text-zinc-300 font-medium">مواعيد التوقيت (يطبق على كل الأيام)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mb-1">وقت البدء</span>
                        <input
                          type="time"
                          value={newGroup.startTime}
                          onChange={(e) => setNewGroup({ ...newGroup, startTime: e.target.value })}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mb-1">وقت الانتهاء</span>
                        <input
                          type="time"
                          value={newGroup.endTime}
                          onChange={(e) => setNewGroup({ ...newGroup, endTime: e.target.value })}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white text-xs font-bold"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 pt-1 font-semibold">
                      ✅ المعاد الموحد: {to12h(newGroup.startTime)} إلى {to12h(newGroup.endTime)}
                    </p>
                  </div>
                )}

                {/* Case 2: Different Timing for each day */}
                {newGroup.timingMode === 'DIFFERENT' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">مواعيد كل يوم على حدة:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const available = ALL_WEEK_DAYS.find((d) => !newGroup.slots.some((s) => s.day === d)) || 'الخميس';
                          setNewGroup({
                            ...newGroup,
                            slots: [...newGroup.slots, { day: available, startTime: '16:00', endTime: '18:00' }],
                          });
                        }}
                        className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                      >
                        ➕ إضافة يوم آخر
                      </button>
                    </div>

                    <div className="space-y-2">
                      {newGroup.slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white dark:bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          {/* Day selector */}
                          <div className="w-1/3 min-w-[100px]">
                            <select
                              value={slot.day}
                              onChange={(e) => {
                                const nextSlots = [...newGroup.slots];
                                nextSlots[idx].day = e.target.value;
                                setNewGroup({ ...newGroup, slots: nextSlots });
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 text-zinc-950 dark:text-white text-xs font-bold"
                            >
                              {ALL_WEEK_DAYS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          {/* Start time */}
                          <div className="flex-1">
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => {
                                const nextSlots = [...newGroup.slots];
                                nextSlots[idx].startTime = e.target.value;
                                setNewGroup({ ...newGroup, slots: nextSlots });
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 text-zinc-950 dark:text-white text-xs font-semibold"
                            />
                          </div>

                          <span className="text-zinc-500 text-xs">إلى</span>

                          {/* End time */}
                          <div className="flex-1">
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => {
                                const nextSlots = [...newGroup.slots];
                                nextSlots[idx].endTime = e.target.value;
                                setNewGroup({ ...newGroup, slots: nextSlots });
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 text-zinc-950 dark:text-white text-xs font-semibold"
                            />
                          </div>

                          {/* Delete button */}
                          {newGroup.slots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextSlots = newGroup.slots.filter((_, i) => i !== idx);
                                setNewGroup({ ...newGroup, slots: nextSlots });
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                              title="حذف اليوم"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingGroup(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'جاري الحفظ...' : 'إضافة المجموعة ➕'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">✏️ تعديل بيانات المجموعة: {editingGroup.name}</h3>
              <button onClick={() => setEditingGroup(null)} className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white text-lg cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-semibold">اسم المجموعة</label>
                <input
                  type="text"
                  required
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white focus:border-primary outline-none"
                />
              </div>

              {/* Days of Attendance */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-semibold">أيام الحضور</label>
                <input
                  type="text"
                  value={editingGroup.days}
                  onChange={(e) => handleEditDaysChange(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white focus:border-primary outline-none"
                />
                <p className="text-[11px] text-zinc-500 dark:text-slate-400 mt-1">اكتب أسماء الأيام تفصلها "و" (مثال: السبت و الثلاثاء)</p>
              </div>

              {/* Timing Mode Selector */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-2.5">
                  <span className="font-bold text-zinc-950 dark:text-white text-xs">نوع التوقيت للمجموعة:</span>
                  <div className="flex items-center gap-1.5 bg-zinc-200/80 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-300 dark:border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() => setEditTimingMode('UNIFIED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        editTimingMode === 'UNIFIED'
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-slate-200'
                      }`}
                    >
                      ⏱️ توقيت موحد
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditTimingMode('DIFFERENT');
                        if (editSlots.length === 0) {
                          const parsedDays = parseDaysFromText(editingGroup.days);
                          const daysToUse = parsedDays.length > 0 ? parsedDays : ['السبت', 'الثلاثاء'];
                          setEditSlots(daysToUse.map((day) => ({ day, startTime: editStartTime, endTime: editEndTime })));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        editTimingMode === 'DIFFERENT'
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-slate-200'
                      }`}
                    >
                      🔀 توقيت مختلف لكل يوم
                    </button>
                  </div>
                </div>

                {/* Case 1: Unified Timing */}
                {editTimingMode === 'UNIFIED' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-zinc-700 dark:text-zinc-300 font-medium">مواعيد التوقيت (يطبق على كل الأيام)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mb-1">وقت البدء</span>
                        <input
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-zinc-500 dark:text-slate-400 block mb-1">وقت الانتهاء</span>
                        <input
                          type="time"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white text-xs font-bold"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 pt-1 font-semibold">
                      ✅ المعاد الموحد: {to12h(editStartTime)} إلى {to12h(editEndTime)}
                    </p>
                  </div>
                )}

                {/* Case 2: Different Timing for each day */}
                {editTimingMode === 'DIFFERENT' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">مواعيد كل يوم على حدة:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const available = ALL_WEEK_DAYS.find((d) => !editSlots.some((s) => s.day === d)) || 'الخميس';
                          setEditSlots([...editSlots, { day: available, startTime: '16:00', endTime: '18:00' }]);
                        }}
                        className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                      >
                        ➕ إضافة يوم آخر
                      </button>
                    </div>

                    <div className="space-y-2">
                      {editSlots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white dark:bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          {/* Day selector */}
                          <div className="w-1/3 min-w-[100px]">
                            <select
                              value={slot.day}
                              onChange={(e) => {
                                const nextSlots = [...editSlots];
                                nextSlots[idx].day = e.target.value;
                                setEditSlots(nextSlots);
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 text-zinc-950 dark:text-white text-xs font-bold"
                            >
                              {ALL_WEEK_DAYS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          {/* Start time */}
                          <div className="flex-1">
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => {
                                const nextSlots = [...editSlots];
                                nextSlots[idx].startTime = e.target.value;
                                setEditSlots(nextSlots);
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 text-zinc-950 dark:text-white text-xs font-semibold"
                            />
                          </div>

                          <span className="text-zinc-500 text-xs">إلى</span>

                          {/* End time */}
                          <div className="flex-1">
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => {
                                const nextSlots = [...editSlots];
                                nextSlots[idx].endTime = e.target.value;
                                setEditSlots(nextSlots);
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 text-zinc-950 dark:text-white text-xs font-semibold"
                            />
                          </div>

                          {/* Delete slot button */}
                          {editSlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextSlots = editSlots.filter((_, i) => i !== idx);
                                setEditSlots(nextSlots);
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                              title="حذف اليوم"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 p-8 text-center">جاري التحميل...</div>}>
      <GroupsContent />
    </Suspense>
  );
}
