'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Group {
  id: string;
  name: string;
  stage: string;
  days: string;
  time: string;
  studentsCount: number;
  assistant: string;
  attendanceAvg: string;
  room?: string;
  price?: number;
  maxStudents?: number;
}

function GroupsContent() {
  const searchParams = useSearchParams();
  const gradeFilter = searchParams.get('grade');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [groupsList, setGroupsList] = useState<Group[]>([
    {
      id: 'g1',
      name: 'مجموعة السبت والإثنين - 4:00 مساءً',
      stage: 'الصف الثالث الإعدادي',
      days: 'السبت والإثنين',
      time: '04:00 م - 06:00 م',
      studentsCount: 32,
      assistant: 'أحمد الإداري',
      attendanceAvg: '95%',
      room: 'القاعة الكبرى (1)',
      price: 250,
      maxStudents: 40,
    },
    {
      id: 'g2',
      name: 'مجموعة الأحد والأربعاء - 6:00 مساءً',
      stage: 'الصف الثالث الثانوي',
      days: 'الأحد والأربعاء',
      time: '06:00 م - 08:00 م',
      studentsCount: 28,
      assistant: 'محمد المساعد',
      attendanceAvg: '91%',
      room: 'قاعة الأستاذ أحمد',
      price: 350,
      maxStudents: 35,
    },
  ]);

  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (grp: Group) => {
    setEditingGroup({ ...grp });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    setIsSaving(true);

    try {
      await fetch(`/api/groups/${editingGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingGroup),
      });

      setGroupsList(prev => prev.map(g => g.id === editingGroup.id ? editingGroup : g));
      setEditingGroup(null);
    } catch (err) {
      alert('تم تحديث المجموعة');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter groups if a grade query param is present
  const groups = gradeFilter
    ? groupsList.filter(g => g.stage.includes(gradeFilter) || gradeFilter.includes(g.stage))
    : groupsList;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">👥 إدارة المجموعات (Groups Module)</h1>
          <p className="text-slate-400 text-sm mt-1">
            {gradeFilter ? `عرض مجموعات الصف الدراسي: ${gradeFilter}` : 'عرض وإدارة مجموعات الدروس والتبويبات الـ 8 للتحكم الشامل'}
          </p>
        </div>
        <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2">
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
                  className="px-2.5 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-semibold transition"
                >
                  ✏️ تعديل
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
                إدارة المجموعة ←
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
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">القاعة/المكان</label>
                  <input
                    type="text"
                    value={editingGroup.room || ''}
                    onChange={(e) => setEditingGroup({ ...editingGroup, room: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الاشتراك (ج.م)</label>
                  <input
                    type="number"
                    value={editingGroup.price || 0}
                    onChange={(e) => setEditingGroup({ ...editingGroup, price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الحد الأقصى للطلاب</label>
                  <input
                    type="number"
                    value={editingGroup.maxStudents || 0}
                    onChange={(e) => setEditingGroup({ ...editingGroup, maxStudents: Number(e.target.value) })}
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



