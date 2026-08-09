'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

interface Student {
  id: string;
  code: string;
  name: string;
  phone: string;
  passwordPlain?: string;
  parentPhone: string;
  parentName: string;
  parentPasswordPlain?: string;
  stage: string;
  stageId: string;
  group: string;
  groupId: string;
  attendanceRate: string;
  subStatus: string;
  qrCode?: string;
}

function StudentsContent() {
  const searchParams = useSearchParams();
  const groupIdFilter = searchParams.get('groupId');
  const stageIdFilter = searchParams.get('stageId');
  const searchParam = searchParams.get('search');

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [stagesOptions, setStagesOptions] = useState<any[]>([]);
  const [groupsOptions, setGroupsOptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParam || '');
  
  const [newStudent, setNewStudent] = useState({
    name: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    parentRelation: 'Father',
    parentWhatsapp: '',
    parentExtraPhone: '',
    stageId: '',
    groupId: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{id: string, name: string} | null>(null);
  const [credentialsStudent, setCredentialsStudent] = useState<Student | null>(null);
  const [credentialsForm, setCredentialsForm] = useState({ studentPassword: '', parentPassword: '' });
  const [showStudentPass, setShowStudentPass] = useState(true);
  const [showParentPass, setShowParentPass] = useState(true);
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [newStudentCredentials, setNewStudentCredentials] = useState<{studentName: string; studentCode: string; studentPhone: string; studentPassword: string; parentName: string; parentPhone: string; parentPassword: string} | null>(null);
  
  const toast = useToast();

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
          id: s.id || '',
          code: s.code || '',
          name: s.name || '',
          phone: s.phone || '',
          passwordPlain: s.passwordPlain || '',
          parentPhone: s.parent?.phone || s.phone || '',
          parentName: s.parent?.name || 'ولي أمر',
          parentPasswordPlain: s.parent?.passwordPlain || '',
          stage: s.academicStage?.name || '—',
          stageId: s.academicStageId || '',
          group: s.group?.name || '—',
          groupId: s.groupId || '',
          attendanceRate: '—',
          subStatus: s.subscriptions?.[0]?.status || 'NO_SUB',
          qrCode: s.qrCode || '—',
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

    // Determine the actual IDs to use
    const actualStageId = newStudent.stageId || stagesOptions[0]?.id;
    const actualGroupId = newStudent.groupId || groupsOptions[0]?.id;

    if (!actualStageId) {
      toast.error('يرجى اختيار المرحلة الدراسية أو إضافة مرحلة أولاً.');
      return;
    }
    if (!actualGroupId) {
      toast.error('يرجى اختيار المجموعة أو إضافة مجموعة أولاً.');
      return;
    }
    if (!newStudent.name.trim()) {
      toast.error('يرجى إدخال اسم الطالب.');
      return;
    }
    if (!newStudent.parentPhone.trim()) {
      toast.error('يرجى إدخال رقم هاتف ولي الأمر.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudent.name.trim(),
          phone: newStudent.phone.trim(),
          parentName: newStudent.parentName.trim(),
          parentPhone: newStudent.parentPhone.trim(),
          parentRelation: newStudent.parentRelation,
          parentWhatsapp: newStudent.parentWhatsapp.trim() || undefined,
          parentExtraPhone: newStudent.parentExtraPhone.trim() || undefined,
          academicStageId: actualStageId,
          groupId: actualGroupId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تمت إضافة الطالب بنجاح');
        fetchStudentsAndOptions();
        setIsAddingStudent(false);
        // Show credentials modal with plain text passwords
        if (data.credentials) {
          setNewStudentCredentials({
            studentName: newStudent.name.trim(),
            studentCode: data.credentials.studentCode,
            studentPhone: newStudent.phone.trim(),
            studentPassword: data.credentials.studentPassword,
            parentName: newStudent.parentName.trim() || `ولي أمر ${newStudent.name.trim()}`,
            parentPhone: newStudent.parentPhone.trim(),
            parentPassword: data.credentials.parentPassword,
          });
        }
        setNewStudent({ name: '', phone: '', parentName: '', parentPhone: '', parentRelation: 'Father', parentWhatsapp: '', parentExtraPhone: '', stageId: '', groupId: '' });
      } else {
        toast.error(data.error || 'حدث خطأ أثناء إضافة الطالب');
      }
    } catch (err) {
      toast.error('حدث خطأ بالاتصال');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      const res = await fetch(`/api/students/${studentToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('تم حذف الطالب بنجاح');
        fetchStudentsAndOptions();
      } else {
        toast.error(data.error || 'تعذّر حذف الطالب');
      }
    } catch (err) {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setStudentToDelete(null);
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
        toast.success('تم تحديث البيانات بنجاح');
        fetchStudentsAndOptions();
      } else {
        toast.error(data.error || 'حدث خطأ أثناء التحديث');
      }
      setEditingStudent(null);
    } catch (err) {
      toast.error('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter students: by groupId, stageId URL params AND search query
  const filteredStudents = students.filter((s) => {
    const matchesGroup = groupIdFilter ? s.groupId === groupIdFilter : true;
    const matchesStage = stageIdFilter ? s.stageId === stageIdFilter : true;
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return matchesGroup && matchesStage;

    const matchesSearch =
      (s.name || '').toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.parentPhone || '').toLowerCase().includes(q) ||
      (s.parentName || '').toLowerCase().includes(q) ||
      (s.qrCode || '').toLowerCase().includes(q) ||
      (s.stage || '').toLowerCase().includes(q) ||
      (s.group || '').toLowerCase().includes(q);

    return matchesGroup && matchesStage && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">👨‍🎓 إدارة قائمة الطلاب (Students List)</h1>
          <p className="text-slate-400 text-sm mt-1">
            {groupIdFilter ? `عرض طلاب المجموعة المحددة` : 'عرض جدول الطلاب والإجراءات السريعة (Quick Actions)'}
          </p>
        </div>
        <button
          onClick={() => {
            if (groupsOptions.length === 0) {
              toast.error('يجب إضافة مجموعة ومرحلة دراسية أولاً من شاشة المجموعات.');
              return;
            }
            setIsAddingStudent(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <span>➕</span> إضافة طالب جديد
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                <th className="p-3.5">الباركود (Barcode)</th>
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
                  <td colSpan={7} className="text-center py-12 text-slate-400">جارٍ تحميل قائمة الطلاب من قاعدة البيانات الحقيقية...</td>
                </tr>
              ) : (
                filteredStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono text-blue-400 font-bold">{stu.code}</td>
                    <td className="p-3.5 font-mono text-purple-400 font-semibold">{stu.qrCode}</td>
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
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleEditClick(stu)}
                          className="px-2.5 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          onClick={() => { setCredentialsStudent(stu); setCredentialsForm({ studentPassword: '', parentPassword: '' }); }}
                          className="px-2.5 py-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          🔑 الاعتماديات
                        </button>
                        <button
                          onClick={() => setStudentToDelete({id: stu.id, name: stu.name})}
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
                  <td colSpan={7} className="text-center py-12 text-slate-500 bg-slate-900/40 border border-slate-800">
                    {searchQuery.trim()
                      ? `لا توجد نتائج مطابقة للبحث عن "${searchQuery}"`
                      : 'لا يوجد طلاب مسجلون حالياً في قاعدة البيانات.'}
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
              <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/20">
                <p className="text-xs text-purple-400 font-semibold mb-2">🔐 لإدارة كلمات المرور، استخدم زر "الاعتماديات" في جدول الطلاب</p>
                <p className="text-[10px] text-slate-500">كلمات المرور مشفرة بـ bcrypt ولا يمكن عرضها كنص. يمكنك إعادة تعيينها عبر موديل الاعتماديات.</p>
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
                  <label className="block text-slate-300 mb-1">رقم هاتف الطالب (اختياري)</label>
                  <input
                    type="text"
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
                  <label className="block text-slate-300 mb-1">صلة القرابة</label>
                  <select
                    value={newStudent.parentRelation}
                    onChange={(e) => setNewStudent({ ...newStudent, parentRelation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="Father">والد (أب)</option>
                    <option value="Mother">والدة (أم)</option>
                    <option value="Guardian">ولي أمر (قريب)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">واتساب ولي الأمر</label>
                  <input
                    type="text"
                    placeholder="01xxxxxxxxx (اختياري)"
                    value={newStudent.parentWhatsapp}
                    onChange={(e) => setNewStudent({ ...newStudent, parentWhatsapp: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">رقم هاتف إضافي</label>
                  <input
                    type="text"
                    placeholder="رقم احتياطي (اختياري)"
                    value={newStudent.parentExtraPhone}
                    onChange={(e) => setNewStudent({ ...newStudent, parentExtraPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">المرحلة الدراسية *</label>
                  <select
                    value={newStudent.stageId}
                    onChange={(e) => setNewStudent({ ...newStudent, stageId: e.target.value, groupId: '' })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="">-- اختر المرحلة --</option>
                    {stagesOptions.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">المجموعة *</label>
                  <select
                    value={newStudent.groupId}
                    onChange={(e) => setNewStudent({ ...newStudent, groupId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="">-- اختر المجموعة --</option>
                    {groupsOptions
                      .filter((g: any) => !newStudent.stageId || g.academicStageId === newStudent.stageId)
                      .map((g: any) => (
                        <option key={g.id} value={g.id}>
                          {g.name} {g.academicStage?.name ? `(${g.academicStage.name})` : ''}
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

      {/* Credentials Manager Modal */}
      {credentialsStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-purple-500/10 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🔑</span>
                إدارة اعتماديات: {credentialsStudent.name}
              </h3>
              <button onClick={() => setCredentialsStudent(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            {/* Student Info */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2 text-xs">
              <p className="font-semibold text-purple-400 mb-2">👨‍🎓 معلومات حساب الطالب</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-slate-500">كود الحساب</p>
                  <p className="font-mono text-blue-400 font-bold">{credentialsStudent.code}</p>
                </div>
                <div>
                  <p className="text-slate-500">رقم الهاتف</p>
                  <p className="font-mono text-blue-400 font-bold">{credentialsStudent.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">الباركود</p>
                  <p className="font-mono text-purple-400 font-bold">{credentialsStudent.qrCode}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-slate-500">كلمة المرور</p>
                    {credentialsStudent.passwordPlain && (
                      <button
                        type="button"
                        onClick={() => setShowStudentPass(v => !v)}
                        className="text-[10px] text-purple-400 hover:text-purple-300 transition"
                      >
                        {showStudentPass ? 'إخفاء' : 'إظهار'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="font-mono text-emerald-400 font-bold text-xs select-all bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {credentialsStudent.passwordPlain
                        ? (showStudentPass ? credentialsStudent.passwordPlain : '••••••••')
                        : 'لم تُحفظ (أعد تعيينها بالأسفل)'}
                    </p>
                    {credentialsStudent.passwordPlain && (
                      <button
                        type="button"
                        title="نسخ كلمة مرور الطالب"
                        onClick={() => {
                          navigator.clipboard.writeText(credentialsStudent.passwordPlain!);
                          toast.success('تم نسخ كلمة مرور الطالب 📋');
                        }}
                        className="text-xs p-1 text-slate-400 hover:text-emerald-400 transition"
                      >
                        📋
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Parent Info */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2 text-xs">
              <p className="font-semibold text-emerald-400 mb-2">👨‍👩‍👦 معلومات حساب ولي الأمر</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-slate-500">اسم ولي الأمر</p>
                  <p className="font-bold text-white">{credentialsStudent.parentName}</p>
                </div>
                <div>
                  <p className="text-slate-500">رقم الهاتف</p>
                  <p className="font-mono text-emerald-400 font-bold">{credentialsStudent.parentPhone || '—'}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-500">كلمة المرور</p>
                    {credentialsStudent.parentPasswordPlain && (
                      <button
                        type="button"
                        onClick={() => setShowParentPass(v => !v)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 transition"
                      >
                        {showParentPass ? 'إخفاء' : 'إظهار'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="font-mono text-emerald-400 font-bold text-xs select-all bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {credentialsStudent.parentPasswordPlain
                        ? (showParentPass ? credentialsStudent.parentPasswordPlain : '••••••••')
                        : 'لم تُحفظ (أعد تعيينها بالأسفل)'}
                    </p>
                    {credentialsStudent.parentPasswordPlain && (
                      <button
                        type="button"
                        title="نسخ كلمة مرور ولي الأمر"
                        onClick={() => {
                          navigator.clipboard.writeText(credentialsStudent.parentPasswordPlain!);
                          toast.success('تم نسخ كلمة مرور ولي الأمر 📋');
                        }}
                        className="text-xs p-1 text-slate-400 hover:text-emerald-400 transition"
                      >
                        📋
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
              <p className="text-xs font-semibold text-rose-400">🔁 إعادة تعيين كلمة المرور (يتطلب إدخال كلمة المرور الجديدة يدوياً)</p>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">كلمة مرور جديدة للطالب</label>
                <input
                  type="text"
                  placeholder="اترك فارغاً إن لم ترد التغيير..."
                  value={credentialsForm.studentPassword}
                  onChange={(e) => setCredentialsForm(prev => ({ ...prev, studentPassword: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">كلمة مرور جديدة لولي الأمر</label>
                <input
                  type="text"
                  placeholder="اترك فارغاً إن لم ترد التغيير..."
                  value={credentialsForm.parentPassword}
                  onChange={(e) => setCredentialsForm(prev => ({ ...prev, parentPassword: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCredentialsStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition"
              >
                إغلاق
              </button>
              <button
                type="button"
                disabled={isSavingCreds || (!credentialsForm.studentPassword && !credentialsForm.parentPassword)}
                onClick={async () => {
                  if (!credentialsForm.studentPassword && !credentialsForm.parentPassword) return;
                  setIsSavingCreds(true);
                  try {
                    const res = await fetch(`/api/students/${credentialsStudent.id}/credentials`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        studentPassword: credentialsForm.studentPassword || undefined,
                        parentPassword: credentialsForm.parentPassword || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      toast.success('تم تحديث بيانات الدخول بنجاح!');
                      fetchStudentsAndOptions();
                      setCredentialsStudent(null);
                    } else {
                      toast.error(data.error || 'حدث خطأ أثناء الحفظ');
                    }
                  } catch {
                    toast.error('خطأ في الاتصال');
                  } finally {
                    setIsSavingCreds(false);
                  }
                }}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg transition cursor-pointer"
              >
                {isSavingCreds ? 'جارٍ الحفظ...' : '💾 حفظ وتحديث كلمات المرور'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Student Credentials Reveal Modal */}
      {newStudentCredentials && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-7 w-full max-w-md shadow-2xl shadow-emerald-500/10 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-xl font-black text-white">تم إنشاء حساب الطالب بنجاح!</h3>
              <p className="text-slate-400 text-xs mt-1">الطالب: <strong className="text-white">{newStudentCredentials.studentName}</strong></p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs">
                <p className="text-purple-300 font-semibold mb-2">🎓 بيانات حساب الطالب</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-slate-400">كود الحساب</p>
                    <p className="font-mono text-white font-bold text-sm">{newStudentCredentials.studentCode}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">رقم الهاتف (اسم المستخدم)</p>
                    <p className="font-mono text-white font-bold text-sm">{newStudentCredentials.studentPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400">كلمة المرور</p>
                    <p className="font-mono text-emerald-400 font-bold text-lg">{newStudentCredentials.studentPassword}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs">
                <p className="text-blue-300 font-semibold mb-2">👨‍👩‍👦 بيانات حساب ولي الأمر</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-slate-400">اسم ولي الأمر</p>
                    <p className="font-bold text-white">{newStudentCredentials.parentName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">رقم الهاتف (اسم المستخدم)</p>
                    <p className="font-mono text-white font-bold text-sm">{newStudentCredentials.parentPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400">كلمة المرور</p>
                    <p className="font-mono text-blue-400 font-bold text-lg">{newStudentCredentials.parentPassword}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[10px] text-amber-400">
                ⚠️ سيتم إرسال بيانات الدخول عبر الواتساب تلقائياً (إذا كان الواتساب مفعلاً). احتفظ بهذه البيانات في مكان آمن.
              </div>
            </div>

            <button
              onClick={() => setNewStudentCredentials(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm transition cursor-pointer"
            >
              تم الحفظ ✓
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-white">تأكيد الحذف</h3>
            <p className="text-slate-400 text-sm">
              هل أنت متأكد من حذف الطالب <strong className="text-rose-400">{studentToDelete.name}</strong> نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-600/20 transition"
              >
                نعم، احذف الطالب
              </button>
            </div>
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
