'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Group {
  id: string;
  name: string;
  stage: string;
  stageId: string;
  days: string;
  time: string;
  studentsCount: number;
  assistant: string;
  attendanceAvg: string;
  maxStudents: number;
}

// تحويل التوقيت من 24 ساعة إلى 12 ساعة (عربي)
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

function GroupsContent() {
  const searchParams = useSearchParams();
  const gradeFilter = searchParams.get('grade');
  const stageIdFilter = searchParams.get('stageId');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [stagesList, setStagesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    stageId: '',
    days: 'السبت والثلاثاء',
    startTime: '16:00',
    endTime: '18:00',
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
        const formatted: Group[] = (grpData.groups || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          stage: g.academicStage?.name || 'مرحلة دراسية',
          stageId: g.academicStageId,
          days: g.scheduleDays?.join(' و ') || 'السبت والثلاثاء',
          time: `${to12h(g.startTime)} - ${to12h(g.endTime)}`,
          studentsCount: g._count?.students || 0,
          assistant: g.assistant?.name || '—',
          attendanceAvg: '—',
          maxStudents: g.maxCapacity || 30,
        }));
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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine the actual stageId to use
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
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroup.name.trim(),
          academicStageId: actualStageId,
          scheduleDays: newGroup.days.split(' و '),
          startTime: newGroup.startTime,
          endTime: newGroup.endTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRealGroupsAndStages();
        setIsAddingGroup(false);
        setNewGroup({ name: '', stageId: '', days: 'السبت والثلاثاء', startTime: '16:00', endTime: '18:00', maxCapacity: 30 });
      } else {
        alert(data.error || 'حدث خطأ أثناء إنشاء المجموعة');
      }
    } catch (err) {
      alert('حدث خطأ بالاتصال بالخادم');
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

  const handleEditClick = (grp: Group) => {
    setEditingGroup({ ...grp });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/groups/${editingGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingGroup.name,
          days: editingGroup.days,
          time: editingGroup.time,
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
            {gradeFilter ? `عرض مجموعات الصف الدراسي: ${gradeFilter}` : 'عرض وإدارة مجموعات الدروس والتبويبات الـ 8 للتحكم الشامل'}
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
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700">
                    {grp.time}
                  </span>
                </div>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">➕ إضافة مجموعة تعليمية جديدة</h3>
              <button onClick={() => setIsAddingGroup(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">اسم المجموعة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مجموعة التفوق (السبت والثلاثاء)"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">المرحلة الدراسية *</label>
                <select
                  value={newGroup.stageId}
                  onChange={(e) => setNewGroup({ ...newGroup, stageId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {stagesList.map((stg) => (
                    <option key={stg.id} value={stg.id}>{stg.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">أيام الحضور</label>
                  <input
                    type="text"
                    value={newGroup.days}
                    onChange={(e) => setNewGroup({ ...newGroup, days: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">وقت البداية والانتهاء</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={newGroup.startTime}
                      onChange={(e) => setNewGroup({ ...newGroup, startTime: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                    />
                    <input
                      type="time"
                      value={newGroup.endTime}
                      onChange={(e) => setNewGroup({ ...newGroup, endTime: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingGroup(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg cursor-pointer"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">✏️ تعديل بيانات المجموعة: {editingGroup.name}</h3>
              <button onClick={() => setEditingGroup(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">اسم المجموعة</label>
                <input
                  type="text"
                  required
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">أيام الحضور</label>
                  <input
                    type="text"
                    value={editingGroup.days}
                    onChange={(e) => setEditingGroup({ ...editingGroup, days: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">مواعيد التوقيت</label>
                  <input
                    type="text"
                    value={editingGroup.time}
                    onChange={(e) => setEditingGroup({ ...editingGroup, time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg"
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
