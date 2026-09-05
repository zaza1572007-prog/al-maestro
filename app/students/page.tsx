'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/components/ToastProvider';
import { ShieldCheck, Eye, Phone, UserCheck, Calendar, BookOpen, QrCode } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import Avatar from '@/components/Avatar';
import StatusIndicator from '@/components/StatusIndicator';
import { addOfflineStudent } from '@/lib/offlineSync';
import SplitView from '@/components/SplitView';
import ResizableTable from '@/components/ResizableTable';
import CollapsibleSection from '@/components/CollapsibleSection';



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
      // Offline fallback: save student to offline queue & cache
      try {
        const studentPayload = {
          name: newStudent.name.trim(),
          phone: newStudent.phone.trim(),
          parentName: newStudent.parentName.trim(),
          parentPhone: newStudent.parentPhone.trim(),
          parentRelation: newStudent.parentRelation,
          parentWhatsapp: newStudent.parentWhatsapp.trim() || undefined,
          parentExtraPhone: newStudent.parentExtraPhone.trim() || undefined,
          academicStageId: actualStageId,
          groupId: actualGroupId,
        };

        const { student: addedOffline } = await addOfflineStudent(studentPayload);
        setStudents((prev) => [addedOffline, ...prev]);
        setIsAddingStudent(false);
        setNewStudent({ name: '', phone: '', parentName: '', parentPhone: '', parentRelation: 'Father', parentWhatsapp: '', parentExtraPhone: '', stageId: '', groupId: '' });
        toast.success(`[أوفلاين] تم حفظ الطالب (${newStudent.name.trim()}) محلياً في جهازك! 📲 وسينرفع فور توفر النت.`);
      } catch (offlineErr) {
        toast.error('حدث خطأ أثناء الحفظ المحلي للطالب');
      }
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

  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Student | null>(null);

  const columns = [
    { key: 'code', label: 'الكود', defaultWidth: 90, minWidth: 80, align: 'right' as const },
    { key: 'qrCode', label: 'الباركود', defaultWidth: 110, minWidth: 90, align: 'right' as const },
    { key: 'name', label: 'اسم الطالب', defaultWidth: 200, minWidth: 160, align: 'right' as const },
    { key: 'stage', label: 'المرحلة والمجموعة', defaultWidth: 160, minWidth: 130, align: 'right' as const },
    { key: 'parent', label: 'ولي الأمر والتواصل', defaultWidth: 160, minWidth: 130, align: 'right' as const },
    { key: 'status', label: 'حالة الاشتراك', defaultWidth: 110, minWidth: 90, align: 'center' as const },
    { key: 'actions', label: 'الإجراءات والخيارات', defaultWidth: 360, minWidth: 320, align: 'center' as const },
  ];

  return (
    <div className="space-y-6 pb-28 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">👨‍🎓 إدارة قائمة الطلاب (Students List)</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1 font-medium">
            {groupIdFilter ? `عرض طلاب المجموعة المحددة` : 'عرض جدول الطلاب والإجراءات السريعة والعرض المجانب'}
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
          className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 cursor-pointer"
        >
          <span>➕</span> إضافة طالب جديد
        </button>
      </div>

      <CollapsibleSection
        title="تصفية وجدول الطلاب"
        subtitle={`إجمالي نتائج الاستعلام: ${filteredStudents.length} طالب`}
        storageKey="students_table_section"
        badge={filteredStudents.length}
      >
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="البحث بالاسم، الكود، رقم الهاتف، أو رقم ولي الأمر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-white/15 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-2.5 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs p-1"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-sm shrink-0">
            <span>👥</span>
            <span>إجمالي نتائج الاستعلام:</span>
            <span className="text-primary font-black text-sm">{filteredStudents.length}</span>
            <span>طالب</span>
          </div>
        </div>

        <SplitView
          isOpen={!!selectedDetailStudent}
          onClose={() => setSelectedDetailStudent(null)}
          title={`معاينة: ${selectedDetailStudent?.name || ''}`}
          master={
            <ResizableTable
              columns={columns}
              data={filteredStudents}
              storageKey="students_table"
              rowKey={(stu) => stu.id}
              selectedRowKey={selectedDetailStudent?.id}
              onRowClick={(stu) => setSelectedDetailStudent(stu)}
              emptyState={
                <EmptyState
                  variant={searchQuery.trim() ? 'search' : 'students'}
                  title={searchQuery.trim() ? `لا توجد نتائج لـ "${searchQuery}"` : 'لا يوجد طلاب مسجلون حالياً'}
                  description="تأكد من البحث بشكل صحيح أو أضف طالباً جديداً."
                  actionLabel={!searchQuery.trim() ? 'إضافة طالب جديد' : undefined}
                  onAction={!searchQuery.trim() ? () => setIsAddingStudent(true) : undefined}
                />
              }
              renderCell={(stu, colKey) => {
                if (colKey === 'code') return <span className="font-mono text-primary font-black text-xs">{stu.code}</span>;
                if (colKey === 'qrCode') return <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold text-xs">{stu.qrCode}</span>;
                if (colKey === 'name') return (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={stu.name} size="sm" />
                    <div>
                      <p className="font-bold text-zinc-950 dark:text-white text-sm leading-tight">{stu.name}</p>
                      {stu.phone && <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">{stu.phone}</p>}
                    </div>
                  </div>
                );
                if (colKey === 'stage') return (
                  <div>
                    <p className="text-zinc-950 dark:text-zinc-200 font-bold text-xs">{stu.stage}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">{stu.group}</p>
                  </div>
                );
                if (colKey === 'parent') return (
                  <div>
                    <p className="text-zinc-950 dark:text-zinc-200 font-medium text-xs">{stu.parentName}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">{stu.parentPhone}</p>
                  </div>
                );
                if (colKey === 'status') return (
                  <StatusIndicator
                    status={stu.subStatus === 'ACTIVE' ? 'active' : 'pending'}
                    label={stu.subStatus === 'ACTIVE' ? 'نشط' : 'ينتهي قريباً'}
                    size="sm"
                  />
                );
                if (colKey === 'actions') return (
                  <div className="flex items-center justify-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/students/${stu.id}`}
                      title="سجل الامتحانات والدرجات"
                      className="px-2.5 py-1.5 bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-1 cursor-pointer"
                    >
                      <span>📝</span>
                      <span>الامتحانات</span>
                    </Link>
                    <button
                      onClick={() => handleEditClick(stu)}
                      title="تعديل بيانات الطالب"
                      className="px-2.5 py-1.5 bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center gap-1 cursor-pointer"
                    >
                      <span>✏️</span>
                      <span>تعديل</span>
                    </button>
                    <button
                      onClick={() => { setCredentialsStudent(stu); setCredentialsForm({ studentPassword: '', parentPassword: '' }); }}
                      title="إدارة كلمات المرور وبيانات الدخول"
                      className="px-2.5 py-1.5 bg-purple-500/15 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500 hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] flex items-center gap-1 cursor-pointer"
                    >
                      <span>🔑</span>
                      <span>الاعتماديات</span>
                    </button>
                    <Link
                      href={`/students/${stu.id}`}
                      title="عرض الملف الشخصي الشامل"
                      className="px-2.5 py-1.5 bg-blue-500/15 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500 hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] flex items-center gap-1 cursor-pointer"
                    >
                      <span>👁️</span>
                      <span>الملف</span>
                    </Link>
                    <button
                      onClick={() => setStudentToDelete({ id: stu.id, name: stu.name })}
                      title="حذف الطالب من النظام"
                      className="px-2.5 py-1.5 bg-rose-500/15 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] flex items-center gap-1 cursor-pointer"
                    >
                      <span>🗑️</span>
                      <span>حذف</span>
                    </button>
                  </div>
                );
                return null;
              }}
            />
          }
          detail={
            selectedDetailStudent ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-sm">
                  <Avatar name={selectedDetailStudent.name} size="lg" />
                  <div>
                    <h4 className="font-bold text-zinc-950 dark:text-white text-base">{selectedDetailStudent.name}</h4>
                    <p className="text-xs text-primary font-mono font-bold mt-0.5">كود: {selectedDetailStudent.code} · QR: {selectedDetailStudent.qrCode}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-white/5">
                    <p className="text-zinc-500 dark:text-zinc-400 font-semibold mb-1">المرحلة الدراسية</p>
                    <p className="font-bold text-zinc-900 dark:text-zinc-200">{selectedDetailStudent.stage || 'غير محددة'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-white/5">
                    <p className="text-zinc-500 dark:text-zinc-400 font-semibold mb-1">المجموعة</p>
                    <p className="font-bold text-zinc-900 dark:text-zinc-200">{selectedDetailStudent.group || 'غير محددة'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-white/5">
                    <p className="text-zinc-500 dark:text-zinc-400 font-semibold mb-1">هاتف الطالب</p>
                    <p className="font-mono text-primary font-bold">{selectedDetailStudent.phone || 'غير مسجل'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-white/5">
                    <p className="text-zinc-500 dark:text-zinc-400 font-semibold mb-1">هاتف ولي الأمر</p>
                    <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{selectedDetailStudent.parentPhone}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs">
                  <p className="font-bold text-purple-700 dark:text-purple-300">👨‍👩‍👦 بيانات ولي الأمر</p>
                  <p className="text-zinc-700 dark:text-zinc-300">الاسم: <strong className="text-zinc-950 dark:text-white">{selectedDetailStudent.parentName}</strong></p>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex flex-col gap-2">
                  <Link href={`/students/${selectedDetailStudent.id}`}>
                    <button className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition shadow-md cursor-pointer">
                      فتح الملف الشامل والتقارير كاملة ←
                    </button>
                  </Link>
                  <button
                    onClick={() => handleEditClick(selectedDetailStudent)}
                    className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs transition cursor-pointer border border-zinc-200 dark:border-white/5"
                  >
                    ✏️ تعديل بيانات الطالب
                  </button>
                </div>
              </div>
            ) : null
          }
        />
      </CollapsibleSection>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">✏️ تعديل بيانات الطالب: {editingStudent.name}</h3>
              <button onClick={() => setEditingStudent(null)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">اسم الطالب الرباعي *</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">رقم هاتف الطالب</label>
                  <input
                    type="text"
                    value={editingStudent.phone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">رقم ولي الأمر</label>
                  <input
                    type="text"
                    value={editingStudent.parentPhone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">المرحلة الدراسية</label>
                  <select
                    value={editingStudent.stageId || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, stageId: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white"
                  >
                    <option value="">-- اختر --</option>
                    {stagesOptions.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">المجموعة</label>
                  <select
                    value={editingStudent.groupId || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, groupId: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white"
                  >
                    <option value="">-- اختر --</option>
                    {groupsOptions.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-purple-500/20">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-2">🔐 لإدارة كلمات المرور، استخدم زر "الاعتماديات" في جدول الطلاب</p>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">كلمات المرور مشفرة بـ bcrypt ولا يمكن عرضها كنص. يمكنك إعادة تعيينها عبر موديل الاعتماديات.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold shadow-lg transition"
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">➕ إضافة طالب جديد لقاعدة البيانات</h3>
              <button onClick={() => setIsAddingStudent(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">اسم الطالب الرباعي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد أحمد محمود"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">رقم هاتف الطالب (اختياري)</label>
                  <input
                    type="text"
                    placeholder="01000000000"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">رقم ولي الأمر *</label>
                  <input
                    type="text"
                    required
                    placeholder="01100000000"
                    value={newStudent.parentPhone}
                    onChange={(e) => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">اسم ولي الأمر *</label>
                  <input
                    type="text"
                    required
                    placeholder="أحمد محمود"
                    value={newStudent.parentName}
                    onChange={(e) => setNewStudent({ ...newStudent, parentName: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">صلة القرابة</label>
                  <select
                    value={newStudent.parentRelation}
                    onChange={(e) => setNewStudent({ ...newStudent, parentRelation: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white"
                  >
                    <option value="Father">والد (أب)</option>
                    <option value="Mother">والدة (أم)</option>
                    <option value="Guardian">ولي أمر (قريب)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">واتساب ولي الأمر</label>
                  <input
                    type="text"
                    placeholder="01xxxxxxxxx (اختياري)"
                    value={newStudent.parentWhatsapp}
                    onChange={(e) => setNewStudent({ ...newStudent, parentWhatsapp: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">رقم هاتف إضافي</label>
                  <input
                    type="text"
                    placeholder="رقم احتياطي (اختياري)"
                    value={newStudent.parentExtraPhone}
                    onChange={(e) => setNewStudent({ ...newStudent, parentExtraPhone: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">المرحلة الدراسية *</label>
                  <select
                    value={newStudent.stageId}
                    onChange={(e) => setNewStudent({ ...newStudent, stageId: e.target.value, groupId: '' })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white"
                  >
                    <option value="">-- اختر المرحلة --</option>
                    {stagesOptions.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">المجموعة *</label>
                  <select
                    value={newStudent.groupId}
                    onChange={(e) => setNewStudent({ ...newStudent, groupId: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 focus:border-primary rounded-xl p-2.5 text-zinc-950 dark:text-white"
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
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold shadow-lg transition cursor-pointer"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-purple-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-purple-500/10 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-4">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <span className="text-2xl">🔑</span>
                إدارة اعتماديات: {credentialsStudent.name}
              </h3>
              <button onClick={() => setCredentialsStudent(null)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xl font-bold">✕</button>
            </div>

            {/* Student Info */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-white/5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-purple-600 dark:text-purple-400">👨‍🎓 معلومات حساب الطالب والـ QR</p>
                <Link
                  href={`/qr-print`}
                  className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
                >
                  🖨️ طباعة الكرت
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="bg-white p-2 rounded-xl flex-shrink-0 shadow">
                  <QRCodeSVG
                    value={credentialsStudent.qrCode || `QR-${credentialsStudent.code}` || credentialsStudent.code}
                    size={76}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 flex-1 w-full">
                  <div>
                    <p className="text-zinc-500 dark:text-zinc-400">كود الحساب</p>
                    <p className="font-mono text-primary font-bold">{credentialsStudent.code}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 dark:text-zinc-400">رقم الهاتف</p>
                    <p className="font-mono text-primary font-bold">{credentialsStudent.phone || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-zinc-500 dark:text-zinc-400">الباركود / رمز الـ QR</p>
                    <p className="font-mono text-purple-600 dark:text-purple-400 font-bold break-all">{credentialsStudent.qrCode || `QR-${credentialsStudent.code}`}</p>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-zinc-500 dark:text-zinc-400">كلمة المرور</p>
                  {credentialsStudent.passwordPlain && (
                    <button
                      type="button"
                      onClick={() => setShowStudentPass(v => !v)}
                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline transition cursor-pointer"
                    >
                      {showStudentPass ? 'إخفاء' : 'إظهار'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs select-all bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 flex-1">
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
                      className="text-xs p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 rounded-lg transition cursor-pointer"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Parent Info */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-white/5 space-y-2 text-xs">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2">👨‍👩‍👦 معلومات حساب ولي الأمر</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">اسم ولي الأمر</p>
                  <p className="font-bold text-zinc-950 dark:text-white">{credentialsStudent.parentName}</p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">رقم الهاتف</p>
                  <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{credentialsStudent.parentPhone || '—'}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-zinc-500 dark:text-zinc-400">كلمة المرور</p>
                    {credentialsStudent.parentPasswordPlain && (
                      <button
                        type="button"
                        onClick={() => setShowParentPass(v => !v)}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline transition"
                      >
                        {showParentPass ? 'إخفاء' : 'إظهار'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs select-all bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
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
                        className="text-xs p-1 text-zinc-400 hover:text-emerald-500 transition"
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
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">🔁 إعادة تعيين كلمة المرور (يتطلب إدخال كلمة المرور الجديدة يدوياً)</p>
              <div>
                <label className="block text-[10px] text-zinc-600 dark:text-zinc-400 mb-1">كلمة مرور جديدة للطالب</label>
                <input
                  type="text"
                  placeholder="اترك فارغاً إن لم ترد التغيير..."
                  value={credentialsForm.studentPassword}
                  onChange={(e) => setCredentialsForm(prev => ({ ...prev, studentPassword: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-600 dark:text-zinc-400 mb-1">كلمة مرور جديدة لولي الأمر</label>
                <input
                  type="text"
                  placeholder="اترك فارغاً إن لم ترد التغيير..."
                  value={credentialsForm.parentPassword}
                  onChange={(e) => setCredentialsForm(prev => ({ ...prev, parentPassword: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-950 dark:text-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCredentialsStudent(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm transition"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-emerald-500/30 rounded-3xl p-7 w-full max-w-md shadow-2xl shadow-emerald-500/10 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-xl font-black text-zinc-950 dark:text-white">تم إنشاء حساب الطالب بنجاح!</h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-1">الطالب: <strong className="text-zinc-950 dark:text-white">{newStudentCredentials.studentName}</strong></p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs">
                <p className="text-purple-700 dark:text-purple-300 font-semibold mb-2">🎓 بيانات حساب الطالب</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-zinc-500 dark:text-zinc-400">كود الحساب</p>
                    <p className="font-mono text-zinc-950 dark:text-white font-bold text-sm">{newStudentCredentials.studentCode}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 dark:text-zinc-400">رقم الهاتف (اسم المستخدم)</p>
                    <p className="font-mono text-zinc-950 dark:text-white font-bold text-sm">{newStudentCredentials.studentPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-zinc-500 dark:text-zinc-400">كلمة المرور</p>
                    <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-lg">{newStudentCredentials.studentPassword}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs">
                <p className="text-blue-700 dark:text-blue-300 font-semibold mb-2">👨‍👩‍👦 بيانات حساب ولي الأمر</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-zinc-500 dark:text-zinc-400">اسم ولي الأمر</p>
                    <p className="font-bold text-zinc-950 dark:text-white">{newStudentCredentials.parentName}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 dark:text-zinc-400">رقم الهاتف (اسم المستخدم)</p>
                    <p className="font-mono text-zinc-950 dark:text-white font-bold text-sm">{newStudentCredentials.parentPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-zinc-500 dark:text-zinc-400">كلمة المرور</p>
                    <p className="font-mono text-primary font-bold text-lg">{newStudentCredentials.parentPassword}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[10px] text-amber-700 dark:text-amber-400">
                ⚠️ سيتم إرسال بيانات الدخول عبر الواتساب تلقائياً (إذا كان الواتساب مفعلاً). احتفظ بهذه البيانات في مكان آمن.
              </div>
            </div>

            <button
              onClick={() => setNewStudentCredentials(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm transition cursor-pointer shadow-lg"
            >
              تم الحفظ ✓
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-zinc-950 dark:text-white">تأكيد الحذف</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              هل أنت متأكد من حذف الطالب <strong className="text-rose-600 dark:text-rose-400">{studentToDelete.name}</strong> نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-600/20 transition cursor-pointer"
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
