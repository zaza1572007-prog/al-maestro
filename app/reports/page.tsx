'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Download, FileText, BarChart3, TrendingUp } from 'lucide-react';

interface Group { id: string; name: string; }
interface Student { id: string; name: string; code: string; }
interface ReportStats {
  totalStudents: number;
  totalAttendances: number;
  totalPaymentsCollected: number;
  totalExams: number;
  totalHomeworks: number;
}

export default function ReportsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [grpRes, stuRes, dashRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/students'),
        fetch('/api/dashboard/stats'),
      ]);
      const grpData = await grpRes.json();
      const stuData = await stuRes.json();
      const dashData = await dashRes.json();

      if (grpData.success) setGroups(grpData.groups || []);
      if (stuData.success) setStudents(stuData.students || []);
      if (dashData.success) {
        setStats({
          totalStudents: dashData.stats.totalStudents,
          totalAttendances: dashData.stats.todayAttendanceRate,
          totalPaymentsCollected: 0,
          totalExams: 0,
          totalHomeworks: 0,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Export students as CSV
  const handleExportStudents = async () => {
    let url = '/api/students';
    if (selectedGroupId !== 'ALL') url += `?groupId=${selectedGroupId}`;
    const res = await fetch(url);
    const data = await res.json();
    const rows = (data.students || []).map((s: any) => [
      s.code,
      s.name,
      s.academicStage?.name || '',
      s.group?.name || '',
      s.phone || '',
      s.parent?.name || '',
      s.parent?.phone || '',
    ]);
    const headers = ['الكود', 'الاسم', 'المرحلة', 'المجموعة', 'هاتف الطالب', 'ولي الأمر', 'هاتف ولي الأمر'];
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadCSV(csvContent, `كشف_الطلاب_${selectedGroupId === 'ALL' ? 'الكل' : selectedGroupId}`);
  };

  const handleExportAttendance = async () => {
    const res = await fetch('/api/attendance');
    const data = await res.json();
    const rows = (data.attendances || []).map((a: any) => [
      a.student?.code,
      a.student?.name,
      a.session?.title || '',
      a.session?.group?.name || '',
      a.status,
      new Date(a.createdAt).toLocaleDateString('ar-EG'),
    ]);
    const headers = ['كود الطالب', 'اسم الطالب', 'الجلسة', 'المجموعة', 'الحالة', 'التاريخ'];
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadCSV(csvContent, 'كشف_الحضور_الكامل');
  };

  const handleExportPayments = async () => {
    const res = await fetch('/api/payments');
    const data = await res.json();
    const rows = (data.payments || []).map((p: any) => [
      p.student?.code,
      p.student?.name,
      p.totalAmount,
      p.paidAmount,
      p.remainingAmount,
      p.paymentMethod || 'CASH',
      new Date(p.createdAt).toLocaleDateString('ar-EG'),
    ]);
    const headers = ['كود الطالب', 'الاسم', 'إجمالي المبلغ', 'المدفوع', 'المتبقي', 'طريقة الدفع', 'التاريخ'];
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadCSV(csvContent, 'كشف_المدفوعات');
  };

  const handleExportExams = async () => {
    const res = await fetch('/api/exams');
    const data = await res.json();
    const rows = (data.exams || []).map((e: any) => [
      e.title,
      e.group?.name || '',
      e.type,
      e.maxScore,
      new Date(e.examDate).toLocaleDateString('ar-EG'),
      e.results?.length || 0,
    ]);
    const headers = ['عنوان الامتحان', 'المجموعة', 'النوع', 'الدرجة القصوى', 'التاريخ', 'عدد النتائج'];
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadCSV(csvContent, 'كشف_الامتحانات');
  };

  function downloadCSV(content: string, filename: string) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const handlePrint = () => window.print();

  const reportCards = [
    {
      icon: '📋',
      title: 'كشف الطلاب الكامل',
      desc: 'أسماء الطلاب وبيانات الاتصال والمجموعات',
      action: handleExportStudents,
      color: 'blue',
    },
    {
      icon: '✅',
      title: 'كشف الحضور والغياب',
      desc: 'جميع سجلات الحضور من قاعدة البيانات',
      action: handleExportAttendance,
      color: 'emerald',
    },
    {
      icon: '💰',
      title: 'كشف المدفوعات والمالية',
      desc: 'مدفوعات الطلاب والمتبقي لكل طالب',
      action: handleExportPayments,
      color: 'amber',
    },
    {
      icon: '📝',
      title: 'كشف الامتحانات والنتائج',
      desc: 'الامتحانات والاختبارات ودرجاتها',
      action: handleExportExams,
      color: 'purple',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:border-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:border-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:border-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:border-purple-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 مركز التقارير والإحصائيات</h1>
          <p className="text-slate-400 text-sm mt-1">تصدير تقارير الحضور والماليات والامتحانات من قاعدة البيانات الحقيقية</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white rounded-xl text-xs px-3 py-2.5"
          >
            <option value="ALL">جميع المجموعات</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button onClick={fetchData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition">
            <FileText className="w-4 h-4" />
            طباعة الصفحة
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'إجمالي الطلاب', value: students.length, color: 'text-blue-400' },
            { label: 'في المجموعة المحددة', value: selectedGroupId === 'ALL' ? students.length : students.filter((s: any) => s.groupId === selectedGroupId).length, color: 'text-purple-400' },
            { label: 'عدد المجموعات', value: groups.length, color: 'text-emerald-400' },
            { label: 'متوسط الطلاب/مجموعة', value: groups.length > 0 ? Math.round(students.length / groups.length) : 0, color: 'text-amber-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Report Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map((card, i) => (
          <div
            key={i}
            className={`rounded-3xl p-6 border shadow-xl space-y-4 transition-all ${colorMap[card.color]}`}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{card.icon}</span>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base">{card.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
              </div>
            </div>
            <button
              onClick={card.action}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              تصدير كـ CSV
            </button>
          </div>
        ))}
      </div>

      {/* Student List Preview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            قائمة الطلاب
            <span className="text-xs text-slate-400 font-normal">
              ({selectedGroupId === 'ALL' ? students.length : students.filter((s: any) => s.groupId === selectedGroupId).length} طالب)
            </span>
          </h2>
        </div>
        {loading ? (
          <div className="text-center py-8 text-slate-400">جارٍ تحميل البيانات من قاعدة البيانات...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="text-right py-2 pr-2">الكود</th>
                  <th className="text-right py-2">الاسم</th>
                  <th className="text-right py-2">المجموعة</th>
                  <th className="text-right py-2">الهاتف</th>
                </tr>
              </thead>
              <tbody>
                {(selectedGroupId === 'ALL' ? students : students.filter((s: any) => (s as any).groupId === selectedGroupId))
                  .slice(0, 20)
                  .map((s: any) => (
                    <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="py-2 pr-2 text-xs font-mono text-slate-400">{s.code}</td>
                      <td className="py-2 text-white font-semibold text-xs">{s.name}</td>
                      <td className="py-2 text-xs text-slate-400">{(s as any).group?.name || '—'}</td>
                      <td className="py-2 text-xs text-slate-400">{s.phone || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {students.length === 0 && (
              <p className="text-center text-slate-500 py-6 text-sm">لا يوجد طلاب مسجلون</p>
            )}
            {students.length > 20 && (
              <p className="text-center text-xs text-slate-500 mt-3">يتم عرض 20 من أصل {students.length} طالب. صدّر CSV لرؤية الكل</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
