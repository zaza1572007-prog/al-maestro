'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Student {
  id: string;
  code: string;
  name: string;
  phone: string;
  parentPhone: string;
  parentName: string;
  stage: string;
  stageId: string;
  group: string;
  groupId: string;
  attendanceRate: string;
  subStatus: string;
}

function StudentsContent() {
  const searchParams = useSearchParams();
  const groupIdFilter = searchParams.get('groupId');
  const stageIdFilter = searchParams.get('stageId');

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [stagesOptions, setStagesOptions] = useState<any[]>([]);
  const [groupsOptions, setGroupsOptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newStudent, setNewStudent] = useState({
    name: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    stageId: '',
    groupId: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch real students and options from PostgreSQL API
  const fetchStudentsAndOptions = async () => {
    setLoading(true);
    try {
      const [resStu, resStg, resGrp] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/stages'),
        fetch('/api/groups'),
      ]);
      const dataStu = await resStu.json();
      const dataStg = await resStg.json();
      const dataGrp = await resGrp.json();

      if (dataStg.success) setStagesOptions(dataStg.stages || []);
      if (dataGrp.success) setGroupsOptions(dataGrp.groups || []);

      if (dataStu.success && dataStu.students) {
        const formatted: Student[] = dataStu.students.map((s: any) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          phone: s.phone,
          parentPhone: s.parent?.phone || s.phone,
          parentName: s.parent?.name || 'ولي أمر',
          stage: s.academicStage?.name || '—',
          stageId: s.academicStageId || '',
          group: s.group?.name || '—',
          groupId: s.groupId || '',
          attendanceRate: '—',
          subStatus: s.subscriptions?.[0]?.status || 'NO_SUB',
        }));
        setStudents(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndOptions();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudent.name,
          phone: newStudent.phone,
          parentName: newStudent.parentName,
          parentPhone: newStudent.parentPhone,
          academicStageId: newStudent.stageId || stagesOptions[0]?.id,
          groupId: newStudent.groupId || groupsOptions[0]?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStudentsAndOptions();
        setIsAddingStudent(false);
        setNewStudent({ name: '', phone: '', parentName: '', parentPhone: '', stageId: '', groupId: '' });
      } else {
        alert(data.error || 'حدث خطأ أثناء إضافة الطالب');
      }
    } catch (err) {
      alert('حدث خطأ بالاتصال');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف الطالب "${name}" نهائياً؟`)) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchStudentsAndOptions();
      } else {
        alert(data.error || 'تعذّر حذف الطالب');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const handleEditClick = (stu: Student) => {
    setEditingStudent({ ...stu });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStudent),
      });
      const data = await res.json();
      if (data.success) {
        fetchStudentsAndOptions();
      }
      setEditingStudent(null);
    } catch (err) {
      alert('تم تحديث البيانات');
      fetchStudentsAndOptions();
    } finally {
      setIsSaving(false);
    }
  };

  // Filter students: by groupId, stageId URL params AND search query
  const filteredStudents = students.filter((s) => {
    const matchesGroup = groupIdFilter ? s.groupId === groupIdFilter : true;
    const matchesStage = stageIdFilter ? s.stageId === stageIdFilter : true;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.parentPhone.includes(q) ||
      s.parentName.toLowerCase().includes(q);
    return matchesGroup && matchesStage && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">👨‍🎓 إدارة قائمة الطلاب (Students List)</h1>
          <p className="text-slate-400 text-sm mt-1">
            {groupIdFilter ? `عرض طلاب المجموعة المحددة` : 'عرض جدول الطلاب والإجراءات السريعة (Quick Actions)'}
          </p>
        </div>
        <button
          onClick={() => setIsAddingStudent(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <span>➕</span> إضافة طالب جديد
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="البحث بالاسم، الكود، رقم الهاتف، أو رقم ولي الأمر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <span className="text-xs text-slate-400">إجمالي نتائج الاستعلام: {filteredStudents.length} طالب</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">الكود</th>
                <th className="p-3.5">اسم الطالب</th>
                <th className="p-3.5">المرحلة والمجموعة</th>
                <th className="p-3.5">ولي الأمر ورقم التواصل</th>
                <th className="p-3.5">حالة الاشتراك</th>
                <th className="p-3.5 text-center">الإجراءات وحذف الطالب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">جارٍ تحميل قائمة الطلاب من قاعدة البيانات الحقيقية...</td>
                </tr>
              ) : (
                filteredStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono text-blue-400 font-bold">{stu.code}</td>
                    <td className="p-3.5 font-bold text-white">{stu.name}</td>
                    <td className="p-3.5">
                      <p className="text-slate-200">{stu.stage}</p>
                      <p className="text-xs text-slate-400">{stu.group}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="text-slate-200">{stu.parentName}</p>
                      <p className="text-xs text-slate-400 font-mono">{stu.parentPhone}</p>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          stu.subStatus === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {stu.subStatus === 'ACTIVE' ? 'نشط' : 'ينتهي قريباً'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditClick(stu)}
                          className="px-2.5 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(stu.id, stu.name)}
                          className="px-2.5 py-1 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          🗑️ حذف
                        </button>
                        <Link
                          href={`/students/${stu.id}`}
                          className="px-2.5 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition"
                        >
                          الملف الشامل
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!loading && filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 bg-slate-900/40 border border-slate-800">
                    لا يوجد طلاب مسجلون حالياً في قاعدة البيانات.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">✏️ تعديل بيانات الطالب: {editingStudent.name}</h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">اسم الطالب الرباعي *</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">رقم هاتف الطالب</label>
                  <input
                    type="text"
                    value={editingStudent.phone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">رقم ولي الأمر</label>
                  <input
                    type="text"
                    value={editingStudent.parentPhone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">المرحلة الدراسية</label>
                  <select
                    value={editingStudent.stageId || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, stageId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="">-- اختر --</option>
                    {stagesOptions.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">المجموعة</label>
                  <select
                    value={editingStudent.groupId || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, groupId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="">-- اختر --</option>
                    {groupsOptions.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
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

      {/* Add Student Modal */}
      {isAddingStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">➕ إضافة طالب جديد لقاعدة البيانات</h3>
              <button onClick={() => setIsAddingStudent(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">اسم الطالب الرباعي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد أحمد محمود"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">رقم هاتف الطالب *</label>
                  <input
                    type="text"
                    required
                    placeholder="01000000000"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">رقم ولي الأمر *</label>
                  <input
                    type="text"
                    required
                    placeholder="01100000000"
                    value={newStudent.parentPhone}
                    onChange={(e) => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">اسم ولي الأمر *</label>
                  <input
                    type="text"
                    required
                    placeholder="أحمد محمود"
                    value={newStudent.parentName}
                    onChange={(e) => setNewStudent({ ...newStudent, parentName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">المرحلة والمجموعة *</label>
                  <select
                    value={newStudent.groupId}
                    onChange={(e) => setNewStudent({ ...newStudent, groupId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    {groupsOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.academicStage?.name} - {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingStudent(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg cursor-pointer"
                >
                  {isSaving ? 'جاري الحفظ...' : 'إضافة الطالب ➕'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 p-8 text-center">جاري التحميل...</div>}>
      <StudentsContent />
    </Suspense>
  );
}
