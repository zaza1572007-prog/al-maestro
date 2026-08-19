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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">👥 إدارة المجموعات (Groups Module)</h1>
          <p className="text-slate-400 text-sm mt-1">
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
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
        >
          <span>➕</span> إضافة مجموعة جديدة
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
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
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Groups List Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">جارٍ تحميل المجموعات الحقيقية من قاعدة البيانات...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((grp) => (
            <div key={grp.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{grp.name}</h3>
                  <p className="text-xs text-blue-400 font-medium mt-0.5">{grp.stage}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(grp)}
                    className="px-2.5 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(grp.id, grp.name)}
                    className="px-2.5 py-1 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>

              {/* Schedule timing section */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span>🗓️</span> مواعيد الحصص:
                  </span>
                  {grp.isDifferentSchedule ? (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px] font-bold border border-purple-500/30">
                      مواعيد مختلفة لكل يوم
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold border border-blue-500/30">
                      موعد موحد
                    </span>
                  )}
                </div>
                {grp.schedule && grp.schedule.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {grp.schedule.map((slot, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs border border-slate-700 font-medium"
                      >
                        <strong className="text-blue-400">{slot.day}:</strong>
                        <span>{to12h(slot.startTime)} - {to12h(slot.endTime)}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-300 font-semibold">{grp.time}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <p className="text-slate-400">عدد الطلاب</p>
                  <p className="text-sm font-bold text-white mt-1">{grp.studentsCount}</p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <p className="text-slate-400">متوسط الحضور</p>
                  <p className="text-sm font-bold text-emerald-400 mt-1">{grp.attendanceAvg}</p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <p className="text-slate-400">المساعد</p>
                  <p className="text-sm font-bold text-slate-300 mt-1">{grp.assistant}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-400">أيام الدراسة: <strong className="text-slate-200">{grp.days}</strong></span>
                <Link href={`/students?groupId=${grp.id}`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold rounded-lg transition text-xs">
                  إدارة الطلاب والمجموعة ←
                </Link>
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="col-span-2 text-center py-12 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              لا توجد مجموعات مسجلة لهذا الصف الدراسي حالياً
            </div>
          )}
        </div>
      )}

      {/* Add Group Modal */}
      {isAddingGroup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">➕ إضافة مجموعة تعليمية جديدة</h3>
              <button onClick={() => setIsAddingGroup(false)} className="text-slate-400 hover:text-white text-lg cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">اسم المجموعة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مجموعة التفوق (السبت والثلاثاء)"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">المرحلة الدراسية *</label>
                <select
                  value={newGroup.stageId}
                  onChange={(e) => setNewGroup({ ...newGroup, stageId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-blue-500 outline-none"
                >
                  {stagesList.map((stg) => (
                    <option key={stg.id} value={stg.id}>{stg.name}</option>
                  ))}
                </select>
              </div>

              {/* Days of Attendance input */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">أيام الحضور</label>
                <input
                  type="text"
                  placeholder="مثال: السبت والثلاثاء أو الخميس"
                  value={newGroup.days}
                  onChange={(e) => handleNewGroupDaysChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-blue-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">اكتب أسماء الأيام تفصلها "و" (مثال: السبت و الثلاثاء)</p>
              </div>

              {/* Timing Mode Switch */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <span className="font-bold text-white text-xs">نوع التوقيت للمجموعة:</span>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setNewGroup({ ...newGroup, timingMode: 'UNIFIED' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        newGroup.timingMode === 'UNIFIED'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
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
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🔀 توقيت مختلف لكل يوم
                    </button>
                  </div>
                </div>

                {/* Case 1: Unified Timing */}
                {newGroup.timingMode === 'UNIFIED' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-slate-300 font-medium">مواعيد التوقيت (يطبق على كل الأيام)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">وقت البدء</span>
                        <input
                          type="time"
                          value={newGroup.startTime}
                          onChange={(e) => setNewGroup({ ...newGroup, startTime: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">وقت الانتهاء</span>
                        <input
                          type="time"
                          value={newGroup.endTime}
                          onChange={(e) => setNewGroup({ ...newGroup, endTime: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-400 pt-1">
                      ✅ المعاد الموحد: {to12h(newGroup.startTime)} إلى {to12h(newGroup.endTime)}
                    </p>
                  </div>
                )}

                {/* Case 2: Different Timing for each day */}
                {newGroup.timingMode === 'DIFFERENT' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-medium">مواعيد كل يوم على حدة:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const available = ALL_WEEK_DAYS.find((d) => !newGroup.slots.some((s) => s.day === d)) || 'الخميس';
                          setNewGroup({
                            ...newGroup,
                            slots: [...newGroup.slots, { day: available, startTime: '16:00', endTime: '18:00' }],
                          });
                        }}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                      >
                        ➕ إضافة يوم آخر
                      </button>
                    </div>

                    <div className="space-y-2">
                      {newGroup.slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                          {/* Day selector */}
                          <div className="w-1/3 min-w-[100px]">
                            <select
                              value={slot.day}
                              onChange={(e) => {
                                const nextSlots = [...newGroup.slots];
                                nextSlots[idx].day = e.target.value;
                                setNewGroup({ ...newGroup, slots: nextSlots });
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs font-bold"
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
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs font-semibold"
                            />
                          </div>

                          <span className="text-slate-500 text-xs">إلى</span>

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
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs font-semibold"
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
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg cursor-pointer disabled:opacity-50"
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">✏️ تعديل بيانات المجموعة: {editingGroup.name}</h3>
              <button onClick={() => setEditingGroup(null)} className="text-slate-400 hover:text-white text-lg cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">اسم المجموعة</label>
                <input
                  type="text"
                  required
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* Days of Attendance */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">أيام الحضور</label>
                <input
                  type="text"
                  value={editingGroup.days}
                  onChange={(e) => handleEditDaysChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-blue-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">اكتب أسماء الأيام تفصلها "و" (مثال: السبت و الثلاثاء)</p>
              </div>

              {/* Timing Mode Selector */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <span className="font-bold text-white text-xs">نوع التوقيت للمجموعة:</span>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setEditTimingMode('UNIFIED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        editTimingMode === 'UNIFIED'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
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
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🔀 توقيت مختلف لكل يوم
                    </button>
                  </div>
                </div>

                {/* Case 1: Unified Timing */}
                {editTimingMode === 'UNIFIED' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-slate-300 font-medium">مواعيد التوقيت (يطبق على كل الأيام)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">وقت البدء</span>
                        <input
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">وقت الانتهاء</span>
                        <input
                          type="time"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-400 pt-1">
                      ✅ المعاد الموحد: {to12h(editStartTime)} إلى {to12h(editEndTime)}
                    </p>
                  </div>
                )}

                {/* Case 2: Different Timing for each day */}
                {editTimingMode === 'DIFFERENT' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-medium">مواعيد كل يوم على حدة:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const available = ALL_WEEK_DAYS.find((d) => !editSlots.some((s) => s.day === d)) || 'الخميس';
                          setEditSlots([...editSlots, { day: available, startTime: '16:00', endTime: '18:00' }]);
                        }}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                      >
                        ➕ إضافة يوم آخر
                      </button>
                    </div>

                    <div className="space-y-2">
                      {editSlots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                          {/* Day selector */}
                          <div className="w-1/3 min-w-[100px]">
                            <select
                              value={slot.day}
                              onChange={(e) => {
                                const nextSlots = [...editSlots];
                                nextSlots[idx].day = e.target.value;
                                setEditSlots(nextSlots);
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs font-bold"
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
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs font-semibold"
                            />
                          </div>

                          <span className="text-slate-500 text-xs">إلى</span>

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
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs font-semibold"
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
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg cursor-pointer disabled:opacity-50"
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
