'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Download, RefreshCw, FileText, Users, GraduationCap,
  CheckCircle2, XCircle, Clock, AlertTriangle, TrendingUp, Wallet,
  BookOpen, Award, Bell, CalendarClock, Loader2, ChevronDown, ChevronRight
} from 'lucide-react';

interface Report {
  totalStudents: number;
  totalGroups: number;
  totalStages: number;
  attendance: { total: number; present: number; absent: number; late: number; rate: number };
  exams: { totalResults: number; avgScorePercent: number };
  homework: { total: number; submitted: number; rate: number };
  financial: { totalAmount: number; paidAmount: number; remainingAmount: number; paymentCount: number; collectionRate: number };
  subscriptions: {
    active: number; expired: number;
    expiringIn7: { id: string; endDate: string; student: { id: string; name: string; code: string; phone: string }; group: { name: string } }[];
    expiringIn30Count: number;
  };
  stagesBreakdown: { id: string; name: string; studentCount: number }[];
  groupsBreakdown: { id: string; name: string; stage: string; studentCount: number }[];
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400 font-semibold">{label}</p>
        <div className={`p-2.5 rounded-xl ${color.bg}`}><Icon className={`w-4 h-4 ${color.text}`} /></div>
      </div>
      <p className={`text-3xl font-black ${color.text}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllExpiring, setShowAllExpiring] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [openBreakdown, setOpenBreakdown] = useState<'stages' | 'groups' | null>('stages');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (data.success) setReport(data.report);
      else setError(data.error || 'فشل تحميل التقارير');
    } catch { setError('خطأ في الاتصال'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, []);

  // ── CSV Export helpers ──
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportStudents = async () => {
    setExporting('students');
    try {
      const res = await fetch('/api/students?include=group,stage,parent');
      const data = await res.json();
      const rows = (data.students || []).map((s: any) => [
        s.code, s.name, s.academicStage?.name || '', s.group?.name || '', s.phone || '', s.parent?.name || '', s.parent?.phone || ''
      ]);
      downloadCSV([['الكود', 'الاسم', 'المرحلة', 'المجموعة', 'هاتف الطالب', 'ولي الأمر', 'هاتف ولي الأمر'], ...rows].map(r => r.join(',')).join('\n'), 'كشف_الطلاب');
    } finally { setExporting(null); }
  };

  const exportAttendance = async () => {
    setExporting('attendance');
    try {
      const res = await fetch('/api/attendance');
      const data = await res.json();
      const rows = (data.attendances || []).map((a: any) => [
        a.student?.code, a.student?.name, a.session?.title || '', a.session?.group?.name || '', a.status, new Date(a.createdAt).toLocaleDateString('ar-EG')
      ]);
      downloadCSV([['كود الطالب', 'اسم الطالب', 'الجلسة', 'المجموعة', 'الحالة', 'التاريخ'], ...rows].map(r => r.join(',')).join('\n'), 'كشف_الحضور');
    } finally { setExporting(null); }
  };

  const exportPayments = async () => {
    setExporting('payments');
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      const rows = (data.payments || []).map((p: any) => [
        p.student?.code, p.student?.name, p.totalAmount, p.paidAmount, p.remainingAmount, p.paymentMethod || 'CASH', new Date(p.createdAt).toLocaleDateString('ar-EG')
      ]);
      downloadCSV([['كود الطالب', 'الاسم', 'إجمالي المبلغ', 'المدفوع', 'المتبقي', 'طريقة الدفع', 'التاريخ'], ...rows].map(r => r.join(',')).join('\n'), 'كشف_المدفوعات');
    } finally { setExporting(null); }
  };

  const exportSubscriptions = async () => {
    setExporting('subs');
    try {
      const res = await fetch('/api/subscriptions');
      const data = await res.json();
      const rows = (data.subscriptions || []).map((s: any) => [
        s.student?.code, s.student?.name, s.group?.name || '', s.status,
        new Date(s.startDate).toLocaleDateString('ar-EG'),
        new Date(s.endDate).toLocaleDateString('ar-EG'),
        s.price,
      ]);
      downloadCSV([['كود الطالب', 'الاسم', 'المجموعة', 'الحالة', 'بداية', 'نهاية', 'المبلغ'], ...rows].map(r => r.join(',')).join('\n'), 'كشف_الاشتراكات');
    } finally { setExporting(null); }
  };

  const exportExams = async () => {
    setExporting('exams');
    try {
      const res = await fetch('/api/exams');
      const data = await res.json();
      const rows = (data.exams || []).map((e: any) => [
        e.title, e.group?.name || '', e.type, e.maxScore, new Date(e.examDate).toLocaleDateString('ar-EG'), e.results?.length || 0,
      ]);
      downloadCSV([['عنوان الامتحان', 'المجموعة', 'النوع', 'الدرجة القصوى', 'التاريخ', 'عدد النتائج'], ...rows].map(r => r.join(',')).join('\n'), 'كشف_الامتحانات');
    } finally { setExporting(null); }
  };

  const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            مركز التقارير والإحصائيات
          </h1>
          <p className="text-slate-400 text-sm mt-1">بيانات حقيقية من قاعدة البيانات — تحديث فوري</p>
        </div>
        <button onClick={fetchReport} className="flex items-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-xs font-semibold">تحديث</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">جاري تحميل التقارير من قاعدة البيانات...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-rose-400">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>{error}</p>
        </div>
      ) : report && (
        <>
          {/* ── Overview Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Users, label: 'إجمالي الطلاب', value: report.totalStudents, sub: 'طالب مسجل', color: { bg: 'bg-blue-500/15', text: 'text-blue-400' }, delay: 0 },
              { icon: GraduationCap, label: 'المراحل الدراسية', value: report.totalStages, sub: 'مرحلة', color: { bg: 'bg-indigo-500/15', text: 'text-indigo-400' }, delay: 0.05 },
              { icon: Users, label: 'المجموعات', value: report.totalGroups, sub: 'مجموعة', color: { bg: 'bg-purple-500/15', text: 'text-purple-400' }, delay: 0.1 },
              { icon: CheckCircle2, label: 'نسبة الحضور', value: `${report.attendance.rate}%`, sub: `${report.attendance.present} حضور من ${report.attendance.total}`, color: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' }, delay: 0.15 },
              { icon: Award, label: 'متوسط الامتحانات', value: `${report.exams.avgScorePercent}%`, sub: `${report.exams.totalResults} نتيجة`, color: { bg: 'bg-amber-500/15', text: 'text-amber-400' }, delay: 0.2 },
              { icon: BookOpen, label: 'نسبة الواجبات', value: `${report.homework.rate}%`, sub: `${report.homework.submitted} من ${report.homework.total}`, color: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' }, delay: 0.25 },
            ].map((s, i) => (
              <StatCard key={i} {...s} />
            ))}
          </div>

          {/* ── Subscription Alerts ── */}
          {report.subscriptions.expiringIn7.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/8 border border-amber-500/30 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white flex items-center gap-2">
                      تنبيه: اشتراكات تنتهي خلال 7 أيام 🔔
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        {report.subscriptions.expiringIn7.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {report.subscriptions.expiringIn30Count} اشتراك ينتهي خلال 30 يوم — {report.subscriptions.expired} منتهي فعلاً
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowAllExpiring(!showAllExpiring)}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1">
                  {showAllExpiring ? 'إخفاء' : 'عرض الكل'}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAllExpiring ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="space-y-2">
                {(showAllExpiring ? report.subscriptions.expiringIn7 : report.subscriptions.expiringIn7.slice(0, 4)).map((sub, i) => {
                  const days = daysUntil(sub.endDate);
                  return (
                    <motion.div key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-black/30 border border-white/10">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                          <CalendarClock className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate">{sub.student.name}</p>
                          <p className="text-[11px] text-slate-400">{sub.group.name} • {sub.student.phone || 'لا يوجد هاتف'}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-black ${days <= 3 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {days === 0 ? 'اليوم! ⚠️' : days === 1 ? 'غداً' : `${days} أيام`}
                        </p>
                        <p className="text-[10px] text-slate-500">{new Date(sub.endDate).toLocaleDateString('ar-EG')}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Financial Report ── */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10">
            <h2 className="font-bold text-white flex items-center gap-2 mb-6">
              <Wallet className="w-5 h-5 text-emerald-400" />
              التقرير المالي
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
              {[
                { label: 'إجمالي المستحقات', value: `${report.financial.totalAmount.toLocaleString('ar-EG')} ج.م`, color: 'text-blue-400' },
                { label: 'المبالغ المحصّلة', value: `${report.financial.paidAmount.toLocaleString('ar-EG')} ج.م`, color: 'text-emerald-400' },
                { label: 'المتبقي', value: `${report.financial.remainingAmount.toLocaleString('ar-EG')} ج.م`, color: 'text-rose-400' },
              ].map((f, i) => (
                <div key={i} className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">{f.label}</p>
                  <p className={`text-xl font-black ${f.color}`}>{f.value}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>نسبة التحصيل</span>
                <span className="font-bold text-emerald-400">{report.financial.collectionRate}%</span>
              </div>
              <ProgressBar value={report.financial.collectionRate} color="bg-gradient-to-r from-emerald-500 to-teal-400" />
            </div>
          </div>

          {/* ── Attendance + Exams Breakdown ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attendance */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10">
              <h3 className="font-bold text-white flex items-center gap-2 mb-5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                تفصيل الحضور
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'حضر', count: report.attendance.present, total: report.attendance.total, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                  { label: 'غائب', count: report.attendance.absent, total: report.attendance.total, color: 'bg-rose-500', textColor: 'text-rose-400' },
                  { label: 'متأخر', count: report.attendance.late, total: report.attendance.total, color: 'bg-amber-500', textColor: 'text-amber-400' },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300">{row.label}</span>
                      <span className={`font-bold ${row.textColor}`}>{row.count} ({row.total > 0 ? Math.round((row.count / row.total) * 100) : 0}%)</span>
                    </div>
                    <ProgressBar value={row.total > 0 ? (row.count / row.total) * 100 : 0} color={row.color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Subscriptions overview */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10">
              <h3 className="font-bold text-white flex items-center gap-2 mb-5">
                <CalendarClock className="w-5 h-5 text-blue-400" />
                الاشتراكات
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'اشتراكات نشطة', value: report.subscriptions.active, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'تنتهي قريباً (30 يوم)', value: report.subscriptions.expiringIn30Count, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { label: 'تنتهي خلال 7 أيام', value: report.subscriptions.expiringIn7.length, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                  { label: 'اشتراكات منتهية', value: report.subscriptions.expired, color: 'text-slate-400', bg: 'bg-white/5' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} border border-white/10 rounded-2xl p-4 text-center`}>
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Students per Stage / Group ── */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <div className="flex items-center gap-4 mb-5">
              <button onClick={() => setOpenBreakdown('stages')}
                className={`text-sm font-bold px-4 py-2 rounded-xl transition ${openBreakdown === 'stages' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-white'}`}>
                <GraduationCap className="w-4 h-4 inline ml-1" />
                توزيع المراحل
              </button>
              <button onClick={() => setOpenBreakdown('groups')}
                className={`text-sm font-bold px-4 py-2 rounded-xl transition ${openBreakdown === 'groups' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white'}`}>
                <Users className="w-4 h-4 inline ml-1" />
                توزيع المجموعات
              </button>
            </div>

            <AnimatePresence mode="wait">
              {openBreakdown === 'stages' && (
                <motion.div key="stages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-3">
                  {report.stagesBreakdown.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-4">
                      <span className="text-xs text-slate-400 w-36 truncate font-semibold text-right">{s.name}</span>
                      <div className="flex-1">
                        <ProgressBar value={report.totalStudents > 0 ? (s.studentCount / report.totalStudents) * 100 : 0}
                          color="bg-gradient-to-r from-blue-500 to-indigo-400" />
                      </div>
                      <span className="text-xs text-blue-400 font-black w-10 text-left">{s.studentCount}</span>
                    </div>
                  ))}
                  {report.stagesBreakdown.length === 0 && <p className="text-sm text-slate-500 text-center py-4">لا توجد مراحل دراسية</p>}
                </motion.div>
              )}
              {openBreakdown === 'groups' && (
                <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-3">
                  {report.groupsBreakdown.map((g) => (
                    <div key={g.id} className="flex items-center gap-4">
                      <div className="w-36 flex-shrink-0 text-right">
                        <p className="text-xs text-slate-300 font-semibold truncate">{g.name}</p>
                        <p className="text-[10px] text-slate-500">{g.stage}</p>
                      </div>
                      <div className="flex-1">
                        <ProgressBar value={report.totalStudents > 0 ? (g.studentCount / report.totalStudents) * 100 : 0}
                          color="bg-gradient-to-r from-purple-500 to-pink-400" />
                      </div>
                      <span className="text-xs text-purple-400 font-black w-10 text-left">{g.studentCount}</span>
                    </div>
                  ))}
                  {report.groupsBreakdown.length === 0 && <p className="text-sm text-slate-500 text-center py-4">لا توجد مجموعات</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── CSV Export Cards ── */}
          <div>
            <h2 className="font-bold text-white flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-slate-400" />
              تصدير التقارير (CSV)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'students', icon: '👥', title: 'كشف الطلاب', desc: 'الأسماء والمجموعات والاتصال', action: exportStudents, color: 'border-blue-500/30 hover:border-blue-400/60' },
                { key: 'attendance', icon: '✅', title: 'كشف الحضور والغياب', desc: 'جميع سجلات الحضور', action: exportAttendance, color: 'border-emerald-500/30 hover:border-emerald-400/60' },
                { key: 'payments', icon: '💰', title: 'كشف المدفوعات', desc: 'المدفوع والمتبقي لكل طالب', action: exportPayments, color: 'border-amber-500/30 hover:border-amber-400/60' },
                { key: 'subs', icon: '📅', title: 'كشف الاشتراكات', desc: 'حالة وتواريخ كل الاشتراكات', action: exportSubscriptions, color: 'border-purple-500/30 hover:border-purple-400/60' },
                { key: 'exams', icon: '📝', title: 'كشف الامتحانات', desc: 'الامتحانات وعدد النتائج', action: exportExams, color: 'border-rose-500/30 hover:border-rose-400/60' },
              ].map(card => (
                <button key={card.key} onClick={card.action} disabled={exporting === card.key}
                  className={`p-5 rounded-2xl border bg-white/3 hover:bg-white/6 transition-all text-right group disabled:opacity-50 ${card.color}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{card.icon}</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">{card.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{card.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/8 group-hover:bg-white/15 transition text-xs font-bold text-slate-200">
                    {exporting === card.key
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري التصدير...</>
                      : <><Download className="w-3.5 h-3.5" /> تصدير CSV</>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
