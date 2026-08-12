'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Download, RefreshCw, FileText, Users, GraduationCap,
  CheckCircle2, XCircle, Clock, AlertTriangle, TrendingUp, Wallet,
  BookOpen, Award, Bell, CalendarClock, Loader2, ChevronDown, Search,
  TrendingDown, Eye, Printer, Send, MessageSquare, AlertCircle, HelpCircle,
  CreditCard
} from 'lucide-react';

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

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
  const [activeTab, setActiveTab] = useState<'overview' | 'topStudents' | 'monthlyReports' | 'history'>('overview');
  
  // Base reports data
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Lists for dropdown filters
  const [stages, setStages] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  
  // Tab 2: Top Students states & filters
  const [topCommitted, setTopCommitted] = useState<any[]>([]);
  const [topPerforming, setTopPerforming] = useState<any[]>([]);
  const [bottomPerforming, setBottomPerforming] = useState<any[]>([]);
  const [mostAbsent, setMostAbsent] = useState<any[]>([]);
  const [topLoading, setTopLoading] = useState(false);
  const [topStageId, setTopStageId] = useState('');
  const [topGroupId, setTopGroupId] = useState('');
  const [topLevel, setTopLevel] = useState('');
  const [topGrade, setTopGrade] = useState('');

  // Tab 3: Monthly WhatsApp Reports states & filters
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [monthlyTargetType, setMonthlyTargetType] = useState<'STAGE' | 'GROUP' | 'STUDENT'>('GROUP');
  const [monthlyTargetId, setMonthlyTargetId] = useState('');
  const [monthlyPreviews, setMonthlyPreviews] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [sendStatuses, setSendStatuses] = useState<Record<string, { status: 'idle' | 'sending' | 'success' | 'error'; error?: string }>>({});
  const [msgPreviewContent, setMsgPreviewContent] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Tab 4: All-time History states & filters
  const [historyStudents, setHistoryStudents] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStageId, setHistoryStageId] = useState('');
  const [historyGroupId, setHistoryGroupId] = useState('');
  
  // History student details modal
  const [selectedHistoryStudentId, setSelectedHistoryStudentId] = useState<string | null>(null);
  const [detailedStudent, setDetailedStudent] = useState<any | null>(null);
  const [detailedLoading, setDetailedLoading] = useState(false);

  // Load basic statistics, stages, and groups
  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const [repRes, stageRes, groupRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/stages'),
        fetch('/api/groups'),
      ]);
      
      const repData = await repRes.json();
      const stageData = await stageRes.json();
      const groupData = await groupRes.json();

      if (repData.success) setReport(repData.report);
      else setError(repData.error || 'فشل تحميل التقارير');
      
      if (stageData.success) setStages(stageData.stages || []);
      if (groupData.success) setGroups(groupData.groups || []);
    } catch {
      setError('خطأ في الاتصال بقاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Fetch top students based on filters
  const fetchTopStudents = async () => {
    setTopLoading(true);
    try {
      const params = new URLSearchParams();
      if (topStageId) params.append('stageId', topStageId);
      if (topGroupId) params.append('groupId', topGroupId);
      if (topLevel) params.append('level', topLevel);
      if (topGrade) params.append('grade', topGrade);

      const res = await fetch(`/api/reports/top-students?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTopCommitted(data.topCommitted || []);
        setTopPerforming(data.topPerforming || []);
        setBottomPerforming(data.bottomPerforming || []);
        setMostAbsent(data.mostAbsent || []);
      }
    } catch (e) {
      console.error('Failed to fetch top students:', e);
    } finally {
      setTopLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'topStudents') {
      fetchTopStudents();
    }
  }, [activeTab, topStageId, topGroupId, topLevel, topGrade]);

  // Load monthly report previews
  const loadMonthlyPreviews = async () => {
    if (!monthlyTargetId) return;
    setMonthlyLoading(true);
    setMonthlyPreviews([]);
    setSendStatuses({});
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        type: monthlyTargetType,
        targetId: monthlyTargetId,
      });

      const res = await fetch(`/api/reports/monthly-whatsapp?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMonthlyPreviews(data.previews || []);
        // Initialize statuses
        const initialStatuses: any = {};
        data.previews.forEach((p: any) => {
          initialStatuses[p.studentId] = { status: 'idle' };
        });
        setSendStatuses(initialStatuses);
      }
    } catch (e) {
      console.error('Failed to load monthly previews:', e);
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Trigger monthly previews fetch when target ID, month or target type changes
  useEffect(() => {
    if (activeTab === 'monthlyReports' && monthlyTargetId) {
      loadMonthlyPreviews();
    }
  }, [activeTab, monthlyTargetId, monthlyTargetType, selectedMonth, selectedYear]);

  // Fetch all-time history list
  const fetchHistoryStudents = async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (historyStageId) params.append('stageId', historyStageId);
      if (historyGroupId) params.append('groupId', historyGroupId);
      if (historySearch) params.append('search', historySearch);

      const res = await fetch(`/api/reports/student-history?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setHistoryStudents(data.students || []);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryStudents();
    }
  }, [activeTab, historyStageId, historyGroupId, historySearch]);

  // Fetch detailed history for a single student
  const fetchStudentDetailedHistory = async (studentId: string) => {
    setDetailedLoading(true);
    setDetailedStudent(null);
    try {
      const res = await fetch(`/api/reports/student-history?studentId=${studentId}`);
      const data = await res.json();
      if (data.success) {
        setDetailedStudent(data);
      }
    } catch (e) {
      console.error('Failed to load detailed history:', e);
    } finally {
      setDetailedLoading(false);
    }
  };

  // Handle single WhatsApp send
  const sendIndividualWhatsApp = async (preview: any) => {
    const studentId = preview.studentId;
    setSendStatuses(prev => ({ ...prev, [studentId]: { status: 'sending' } }));

    try {
      const res = await fetch('/api/reports/monthly-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          type: 'STUDENT',
          targetId: studentId,
        }),
      });
      const data = await res.json();
      if (data.success && data.results?.[0]?.success) {
        setSendStatuses(prev => ({ ...prev, [studentId]: { status: 'success' } }));
      } else {
        setSendStatuses(prev => ({
          ...prev,
          [studentId]: { status: 'error', error: data.results?.[0]?.error || 'فشل إرسال الرسالة' }
        }));
      }
    } catch (e: any) {
      setSendStatuses(prev => ({
        ...prev,
        [studentId]: { status: 'error', error: e.message || 'خطأ في الشبكة' }
      }));
    }
  };

  // Bulk WhatsApp send (all or failed only)
  const sendBulkWhatsApp = async (failedOnly = false) => {
    setBulkSending(true);
    
    // Determine which student IDs to send to
    const targetPreviews = failedOnly 
      ? monthlyPreviews.filter(p => sendStatuses[p.studentId]?.status === 'error')
      : monthlyPreviews;

    if (targetPreviews.length === 0) {
      setBulkSending(false);
      return;
    }

    // Set sending status for all target students
    const updatedStatuses = { ...sendStatuses };
    targetPreviews.forEach(p => {
      updatedStatuses[p.studentId] = { status: 'sending' };
    });
    setSendStatuses(updatedStatuses);

    try {
      const res = await fetch('/api/reports/monthly-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          type: monthlyTargetType,
          targetId: monthlyTargetId,
          studentIds: targetPreviews.map(p => p.studentId),
        }),
      });
      
      const data = await res.json();
      if (data.success && data.results) {
        const finalStatuses = { ...sendStatuses };
        data.results.forEach((r: any) => {
          finalStatuses[r.studentId] = r.success 
            ? { status: 'success' }
            : { status: 'error', error: r.error || 'فشل الإرسال' };
        });
        setSendStatuses(finalStatuses);
      } else {
        // Mark all as failed if the API request itself fails
        const finalStatuses = { ...sendStatuses };
        targetPreviews.forEach(p => {
          finalStatuses[p.studentId] = { status: 'error', error: data.error || 'فشل الاتصال' };
        });
        setSendStatuses(finalStatuses);
      }
    } catch (e: any) {
      const finalStatuses = { ...sendStatuses };
      targetPreviews.forEach(p => {
        finalStatuses[p.studentId] = { status: 'error', error: e.message || 'خطأ في الشبكة' };
      });
      setSendStatuses(finalStatuses);
    } finally {
      setBulkSending(false);
    }
  };

  // Client-side CSV/Excel export for single student history
  const handleExportHistoryCSV = () => {
    if (!detailedStudent) return;
    const { student, absences, exams, subscriptions } = detailedStudent;
    
    let csvContent = `تقرير المتابعة الشامل للطالب\n`;
    csvContent += `الاسم,${student.name}\n`;
    csvContent += `الكود,${student.code}\n`;
    csvContent += `المجموعة,${student.groupName}\n`;
    csvContent += `المرحلة,${student.stageName}\n\n`;

    csvContent += `1. سجل الغياب والغياب الكلي\n`;
    csvContent += `التاريخ,اليوم,الحصة/الجلسة\n`;
    absences.forEach((abs: any) => {
      csvContent += `${abs.date},${abs.day},${abs.sessionTitle}\n`;
    });
    if (absences.length === 0) csvContent += `-,لا يوجد أيام غياب مسجلة\n`;
    csvContent += `\n`;

    csvContent += `2. سجل الامتحانات والاختبارات\n`;
    csvContent += `التاريخ,الامتحان,النوع,الدرجة المحققة,الدرجة النهائية,النسبة المئوية\n`;
    exams.forEach((ex: any) => {
      const typeStr = ex.type === 'QUIZ' ? 'قصير' : ex.type === 'MONTHLY' ? 'شهري' : 'عام';
      csvContent += `${ex.date},${ex.title},${typeStr},${ex.score},${ex.maxScore},${ex.percentage}%\n`;
    });
    if (exams.length === 0) csvContent += `-,لا توجد اختبارات مسجلة\n`;
    csvContent += `\n`;

    csvContent += `3. السداد والاشتراكات\n`;
    csvContent += `الفترة من,الفترة إلى,القيمة الإجمالية,المدفوع,حالة السداد\n`;
    subscriptions.forEach((sub: any) => {
      const stateStr = sub.isPaid ? 'مدفوع بالكامل' : sub.paidAmount > 0 ? 'مدفوع جزئياً' : 'مطلوب السداد';
      csvContent += `${sub.startDate},${sub.endDate},${sub.price},${sub.paidAmount},${stateStr}\n`;
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_المايسترو_${student.code}_${student.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Counts for bulk sending progress
  const sentCount = Object.values(sendStatuses).filter(s => s.status === 'success').length;
  const failedCount = Object.values(sendStatuses).filter(s => s.status === 'error').length;
  const pendingCount = monthlyPreviews.length - sentCount - failedCount;

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            مركز التقارير والمتابعة الشاملة
          </h1>
          <p className="text-slate-400 text-sm mt-1">توليد تقارير الطلاب الشهرية، المتابعة التاريخية، وأتمتة رسائل الواتساب لأولياء الأمور</p>
        </div>
        <button onClick={fetchReportData} className="flex items-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-xs font-semibold">تحديث عام</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-white/5 pb-2 gap-2 overflow-x-auto">
        {[
          { key: 'overview', label: '📊 لوحة الإحصائيات العامة', icon: BarChart3 },
          { key: 'topStudents', label: '🏆 لوحة الطلاب الأوائل', icon: Award },
          { key: 'monthlyReports', label: '📱 التقارير الشهرية والواتساب', icon: Send },
          { key: 'history', label: '👥 سجل المتابعة التاريخي', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeTab === tab.key
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-white/3'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">جاري تحميل التقارير...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-rose-400">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>{error}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && report && (
            <motion.div
              key="overview-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
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
                <div className="bg-amber-500/8 border border-amber-500/30 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-white flex items-center gap-2 text-sm md:text-base">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {report.subscriptions.expiringIn7.slice(0, 6).map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-black/30 border border-white/10 text-xs">
                        <div>
                          <p className="font-bold text-white text-sm">{sub.student.name}</p>
                          <p className="text-slate-400 mt-1">{sub.group.name} • {sub.student.phone || 'لا يوجد هاتف'}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-amber-400 font-bold">ينتهي قريباً</p>
                          <p className="text-slate-500 mt-0.5">{new Date(sub.endDate).toLocaleDateString('ar-EG')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Financial Report ── */}
              <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10">
                <h2 className="font-bold text-white flex items-center gap-2 mb-6">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  التقرير المالي العام
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
            </motion.div>
          )}

          {/* TAB 2: TOP STUDENTS */}
          {activeTab === 'topStudents' && (
            <motion.div
              key="top-students-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Filters Board */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/30">
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">⚙️ فلاتر لوحات المتابعة</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5">المرحلة الدراسية</label>
                    <select
                      value={topStageId}
                      onChange={(e) => { setTopStageId(e.target.value); setTopGroupId(''); }}
                      className="w-full glass-input p-2.5 text-xs text-white bg-slate-950"
                    >
                      <option value="">جميع المراحل</option>
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5">المجموعة التعليمية</label>
                    <select
                      value={topGroupId}
                      onChange={(e) => setTopGroupId(e.target.value)}
                      className="w-full glass-input p-2.5 text-xs text-white bg-slate-950"
                    >
                      <option value="">جميع المجموعات</option>
                      {groups
                        .filter(g => !topStageId || g.academicStageId === topStageId)
                        .map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5">المستوى التعليمي</label>
                    <select
                      value={topLevel}
                      onChange={(e) => setTopLevel(e.target.value)}
                      className="w-full glass-input p-2.5 text-xs text-white bg-slate-950"
                    >
                      <option value="">جميع المستويات</option>
                      <option value="Primary">الابتدائي</option>
                      <option value="Middle">الإعدادي</option>
                      <option value="High">الثانوي</option>
                    </select>
                  </div>
                </div>
              </div>

              {topLoading ? (
                <div className="text-center py-20 flex flex-col items-center gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="text-xs">جاري تصفية الطلاب ولوحات المتابعة...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Row 1: Top Performing / Committed */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Committed Board */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/40">
                      <h3 className="font-bold text-white text-md mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        أكثر الطلاب التزاماً بالحضور 📅
                      </h3>
                      {topCommitted.length > 0 ? (
                        <div className="space-y-4">
                          {topCommitted.map((student, idx) => (
                            <div key={student.id} className="flex items-center justify-between gap-4 p-3 bg-white/3 border border-white/5 rounded-2xl text-xs">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[11px]">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate text-sm">{student.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{student.groupName}</p>
                                </div>
                              </div>
                              <div className="text-left flex-shrink-0">
                                <p className="text-emerald-400 font-black text-sm">{student.attendanceRate}%</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">{student.presentSessions} حضور / {student.totalSessions} حصص</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs py-10 text-center">لا توجد بيانات حضور مسجلة للفلتر المختار.</p>
                      )}
                    </div>

                    {/* Top Performing Board */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/40">
                      <h3 className="font-bold text-white text-md mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
                        <Award className="w-5 h-5 text-amber-400" />
                        أكثر الطلاب تحصيلاً لأعلى درجات الاختبارات 🏆
                      </h3>
                      {topPerforming.length > 0 ? (
                        <div className="space-y-4">
                          {topPerforming.map((student, idx) => (
                            <div key={student.id} className="flex items-center justify-between gap-4 p-3 bg-white/3 border border-white/5 rounded-2xl text-xs">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-[11px]">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate text-sm">{student.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{student.groupName}</p>
                                </div>
                              </div>
                              <div className="text-left flex-shrink-0">
                                <p className="text-amber-400 font-black text-sm">{student.avgExamPercentage}%</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">متوسط درجات الاختبارات</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs py-10 text-center">لا توجد درجات امتحانات مسجلة للفلتر المختار.</p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Least Performing / Most Absent */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Most Absent Board */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/40">
                      <h3 className="font-bold text-white text-md mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
                        <XCircle className="w-5 h-5 text-rose-400" />
                        أكثر الطلاب غياباً 📅
                      </h3>
                      {mostAbsent.length > 0 ? (
                        <div className="space-y-4">
                          {mostAbsent.map((student, idx) => (
                            <div key={student.id} className="flex items-center justify-between gap-4 p-3 bg-white/3 border border-white/5 rounded-2xl text-xs">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-[11px]">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate text-sm">{student.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{student.groupName}</p>
                                </div>
                              </div>
                              <div className="text-left flex-shrink-0">
                                <p className="text-rose-400 font-black text-sm">{student.absentSessions} حصص غياب</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">من أصل {student.totalSessions} حصص</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs py-10 text-center">لا توجد حالات غياب مسجلة للفلتر المختار.</p>
                      )}
                    </div>

                    {/* Bottom Performing Board */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/40">
                      <h3 className="font-bold text-white text-md mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
                        <TrendingDown className="w-5 h-5 text-rose-400" />
                        الطلاب الأقل درجات في الاختبارات 📉
                      </h3>
                      {bottomPerforming.length > 0 ? (
                        <div className="space-y-4">
                          {bottomPerforming.map((student, idx) => (
                            <div key={student.id} className="flex items-center justify-between gap-4 p-3 bg-white/3 border border-white/5 rounded-2xl text-xs">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-[11px]">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate text-sm">{student.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{student.groupName}</p>
                                </div>
                              </div>
                              <div className="text-left flex-shrink-0">
                                <p className="text-rose-400 font-black text-sm">{student.avgExamPercentage}%</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">متوسط درجات الاختبارات</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs py-10 text-center">لا توجد درجات اختبارات مسجلة للفلتر المختار.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: MONTHLY REPORTS & WHATSAPP */}
          {activeTab === 'monthlyReports' && (
            <motion.div
              key="monthly-reports-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Select Panel */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/30 space-y-4">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">📱 إعداد التقرير الشهري للواتساب</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Month Selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5">الشهر المالي</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="w-full glass-input p-2.5 text-xs text-white bg-slate-950"
                    >
                      {arabicMonths.map((m: string, idx: number) => (
                        <option key={idx} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Year Selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5">السنة</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full glass-input p-2.5 text-xs text-white bg-slate-950"
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>

                  {/* Target Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5">مستوى الإرسال</label>
                    <select
                      value={monthlyTargetType}
                      onChange={(e) => {
                        setMonthlyTargetType(e.target.value as any);
                        setMonthlyTargetId('');
                        setMonthlyPreviews([]);
                        setStudentSearchQuery('');
                        setStudentSearchResults([]);
                        setSelectedStudent(null);
                        setShowStudentDropdown(false);
                        setTableSearch('');
                      }}
                      className="w-full glass-input p-2.5 text-xs text-white bg-slate-950"
                    >
                      <option value="STAGE">مرحلة كاملة</option>
                      <option value="GROUP">مجموعة معينة</option>
                      <option value="STUDENT">طالب لوحده</option>
                    </select>
                  </div>

                  {/* Target Selector */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5">تحديد المستهدف</label>
                    {monthlyTargetType === 'STAGE' ? (
                      <select
                        value={monthlyTargetId}
                        onChange={(e) => setMonthlyTargetId(e.target.value)}
                        className="w-full glass-input p-2.5 text-xs text-white bg-slate-950"
                      >
                        <option value="">-- اختر المرحلة --</option>
                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    ) : monthlyTargetType === 'GROUP' ? (
                      <select
                        value={monthlyTargetId}
                        onChange={(e) => setMonthlyTargetId(e.target.value)}
                        className="w-full glass-input p-2.5 text-xs text-white bg-slate-950"
                      >
                        <option value="">-- اختر المجموعة --</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.academicStage?.name})</option>)}
                      </select>
                    ) : (
                      // Single student search
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="ابحث بكود أو اسم الطالب، ثم حدده..."
                          value={studentSearchQuery}
                          onFocus={() => {
                            if (studentSearchResults.length > 0) {
                              setShowStudentDropdown(true);
                            }
                          }}
                          onBlur={() => {
                            // Delay hiding the dropdown to allow click events to register
                            setTimeout(() => setShowStudentDropdown(false), 200);
                          }}
                          onChange={async (e) => {
                            const val = e.target.value;
                            setStudentSearchQuery(val);
                            if (val.length >= 2) {
                              try {
                                const res = await fetch(`/api/students?search=${encodeURIComponent(val)}`);
                                const d = await res.json();
                                if (d.success) {
                                  setStudentSearchResults(d.students || []);
                                  setShowStudentDropdown(true);
                                }
                              } catch {}
                            } else {
                              setStudentSearchResults([]);
                              setShowStudentDropdown(false);
                            }
                          }}
                          className="w-full glass-input p-2.5 text-xs text-white bg-slate-950"
                        />
                        {showStudentDropdown && studentSearchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                            {studentSearchResults.map((student) => (
                              <button
                                key={student.id}
                                type="button"
                                onClick={() => {
                                  setMonthlyTargetId(student.id);
                                  setSelectedStudent(student);
                                  setStudentSearchQuery(student.name);
                                  setStudentSearchResults([]);
                                  setShowStudentDropdown(false);
                                }}
                                className="w-full text-right px-4 py-2.5 hover:bg-slate-800 hover:text-white transition flex justify-between items-center text-xs border-b border-white/5 last:border-b-0"
                              >
                                <span className="text-white font-bold">{student.name}</span>
                                <span className="text-slate-400 font-mono text-[10px]">{student.code}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {selectedStudent && (
                          <div className="text-[10px] text-blue-400 mt-1 flex items-center gap-1 font-bold">
                            <span>تم تحديد الطالب:</span>
                            <span className="text-white">{selectedStudent.name} ({selectedStudent.code})</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Monthly Previews Dashboard */}
              {monthlyLoading ? (
                <div className="text-center py-20 flex flex-col items-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-xs">جاري حساب التقارير الشهرية وتوليد المعاينات...</p>
                </div>
              ) : monthlyPreviews.length > 0 ? (
                (() => {
                  const filteredPreviews = monthlyPreviews.filter(preview => {
                    const searchLower = tableSearch.toLowerCase().trim();
                    if (!searchLower) return true;
                    return (
                      preview.studentName.toLowerCase().includes(searchLower) ||
                      preview.studentCode.toLowerCase().includes(searchLower)
                    );
                  });

                  return (
                    <div className="space-y-6">
                      {/* Bulk sending control panel */}
                      <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-xs space-y-1">
                          <h4 className="font-bold text-white text-sm">متابعة حالة الإرسال الجماعي 📡</h4>
                          <p className="text-slate-400">
                            عدد الطلاب في القائمة: {monthlyPreviews.length}
                            {tableSearch && ` (المطابق للبحث: ${filteredPreviews.length})`}
                          </p>
                          <div className="flex gap-4 flex-wrap mt-2">
                            <span className="text-emerald-400 font-bold">تم الإرسال: {sentCount}</span>
                            <span className="text-rose-400 font-bold">فشل الإرسال: {failedCount}</span>
                            <span className="text-slate-400 font-bold">المتبقي: {pendingCount}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {failedCount > 0 && (
                            <button
                              onClick={() => sendBulkWhatsApp(true)}
                              disabled={bulkSending}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                            >
                              {bulkSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              إعادة إرسال للفاشلة فقط ({failedCount})
                            </button>
                          )}
                          <button
                            onClick={() => sendBulkWhatsApp(false)}
                            disabled={bulkSending || pendingCount === 0}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                          >
                            {bulkSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            إرسال لجميع الطلاب ({monthlyPreviews.length})
                          </button>
                        </div>
                      </div>

                      {/* Search Bar for Previews Table */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="relative flex-1 max-w-md w-full no-print">
                          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                          <input
                            type="text"
                            placeholder="ابحث باسم الطالب أو الكود في هذه القائمة..."
                            value={tableSearch}
                            onChange={(e) => setTableSearch(e.target.value)}
                            className="w-full glass-input pr-10 pl-4 py-2.5 text-xs text-white bg-slate-950"
                          />
                        </div>
                      </div>

                      {/* Previews Table */}
                      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden bg-slate-900/40">
                        {filteredPreviews.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-950/60 text-slate-400 border-b border-white/5">
                                  <th className="p-4 font-bold">الطالب</th>
                                  <th className="p-4 font-bold">الحضور والغياب</th>
                                  <th className="p-4 font-bold">أفضل الاختبارات</th>
                                  <th className="p-4 font-bold">حالة دفع الاشتراك</th>
                                  <th className="p-4 font-bold text-center">الحالة</th>
                                  <th className="p-4 font-bold text-left">التحكم</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredPreviews.map((preview) => {
                                  const sendState = sendStatuses[preview.studentId]?.status || 'idle';
                                  const errorMsg = sendStatuses[preview.studentId]?.error;

                                  return (
                                    <tr key={preview.studentId} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                      <td className="p-4">
                                        <p className="font-bold text-white text-sm">{preview.studentName}</p>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{preview.studentCode} • ولي الأمر: {preview.parentPhone}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="font-bold text-slate-200">{preview.stats.presentCount} حضور / {preview.stats.totalSessions} حصص</p>
                                        <p className="text-[10px] text-rose-400 mt-0.5">غائب: {preview.stats.absentCount} حصص</p>
                                      </td>
                                      <td className="p-4">
                                        {preview.stats.exams.length > 0 ? (
                                          <p className="text-slate-300">
                                            {preview.stats.exams[0].title}: {preview.stats.exams[0].score}/{preview.stats.exams[0].maxScore}
                                          </p>
                                        ) : (
                                          <p className="text-slate-500">لا يوجد</p>
                                        )}
                                      </td>
                                      <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                          preview.stats.isPaid 
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                        }`}>
                                          {preview.stats.paymentStatus}
                                        </span>
                                      </td>
                                      <td className="p-4 text-center">
                                        {sendState === 'sending' ? (
                                          <span className="inline-flex items-center gap-1.5 text-blue-400 font-semibold">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الإرسال
                                          </span>
                                        ) : sendState === 'success' ? (
                                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                            تم الإرسال ✅
                                          </span>
                                        ) : sendState === 'error' ? (
                                          <span className="inline-flex flex-col items-center gap-0.5 text-rose-400 font-bold group relative cursor-pointer">
                                            فشل الإرسال ❌
                                            <span className="text-[9px] text-slate-500 mt-0.5 font-normal block max-w-[120px] truncate">{errorMsg}</span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-500">لم يرسل بعد</span>
                                        )}
                                      </td>
                                      <td className="p-4 text-left">
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={() => setMsgPreviewContent(preview.messageText)}
                                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                                            title="معاينة محتوى الرسالة"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => sendIndividualWhatsApp(preview)}
                                            disabled={sendState === 'sending'}
                                            className="p-1.5 text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 rounded-lg transition disabled:opacity-50"
                                            title="إرسال عبر البوابة التلقائية"
                                          >
                                            <Send className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              const phone = preview.whatsappNum || preview.parentPhone || preview.phone || '';
                                              let cleanPhone = phone.replace(/[^\d]/g, '').trim();
                                              if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
                                                cleanPhone = '20' + cleanPhone.slice(1);
                                              } else if (cleanPhone.startsWith('1') && cleanPhone.length === 10) {
                                                cleanPhone = '20' + cleanPhone;
                                              }
                                              const text = encodeURIComponent(preview.messageText);
                                              window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                                            }}
                                            className="p-1.5 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 rounded-lg transition"
                                            title="إرسال يدوي (تطبيق الهاتف/الويب)"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-20 text-slate-500">
                            <HelpCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">لا يوجد نتائج للبحث باسم الطالب في هذه القائمة.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-20 text-slate-500 glass-panel rounded-3xl border border-white/5">
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">يرجى تحديد مرحلة أو مجموعة في الفلاتر أعلاه لعرض تقارير الحضور والدرجات قبل الإرسال.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: STUDENT HISTORY */}
          {activeTab === 'history' && (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Search & Filter bar */}
              <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-slate-900/30 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو كود الطالب..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full glass-input pr-10 pl-4 py-2.5 text-xs text-white"
                  />
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                  <select
                    value={historyStageId}
                    onChange={(e) => { setHistoryStageId(e.target.value); setHistoryGroupId(''); }}
                    className="glass-input p-2.5 text-xs text-white bg-slate-950 min-w-[130px]"
                  >
                    <option value="">جميع المراحل</option>
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  <select
                    value={historyGroupId}
                    onChange={(e) => setHistoryGroupId(e.target.value)}
                    className="glass-input p-2.5 text-xs text-white bg-slate-950 min-w-[130px]"
                  >
                    <option value="">جميع المجموعات</option>
                    {groups
                      .filter(g => !historyStageId || g.academicStageId === historyStageId)
                      .map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              {historyLoading ? (
                <div className="text-center py-20 flex flex-col items-center gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="text-xs">جاري جلب سجل متابعة الطلاب...</p>
                </div>
              ) : historyStudents.length > 0 ? (
                <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden bg-slate-900/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-400 border-b border-white/5">
                          <th className="p-4 font-bold">الطالب</th>
                          <th className="p-4 font-bold">المجموعة والمرحلة</th>
                          <th className="p-4 font-bold">الحضور والغياب التاريخي</th>
                          <th className="p-4 font-bold">نسبة الالتزام</th>
                          <th className="p-4 font-bold text-center">منحنى الأداء</th>
                          <th className="p-4 font-bold text-left">التفاصيل</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyStudents.map((student) => (
                          <tr key={student.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-white text-sm">{student.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{student.code}</p>
                            </td>
                            <td className="p-4">
                              <p className="text-slate-200">{student.groupName}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{student.stageName}</p>
                            </td>
                            <td className="p-4">
                              <p className="text-slate-300">{student.presentSessions} حضور / {student.totalSessions} حصص</p>
                              <p className="text-[10px] text-rose-400 mt-0.5">غائب: {student.absentSessions} أيام</p>
                            </td>
                            <td className="p-4 font-bold text-slate-200">
                              {student.attendanceRate}%
                            </td>
                            <td className="p-4 text-center">
                              {student.trend === 'UP' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-black" title="المستوى في تحسن مستمر مقارنة بالشهر الماضي">
                                  ⬆️ صعود
                                </span>
                              ) : student.trend === 'DOWN' ? (
                                <span className="inline-flex items-center gap-1 text-rose-400 font-black" title="المستوى متراجع عن الشهر الماضي">
                                  ⬇️ هبوط
                                </span>
                              ) : student.trend === 'STABLE' ? (
                                <span className="inline-flex items-center gap-1 text-slate-400" title="المستوى مستقر">
                                  ➡️ مستقر
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="p-4 text-left">
                              <button
                                onClick={() => {
                                  setSelectedHistoryStudentId(student.id);
                                  fetchStudentDetailedHistory(student.id);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                عرض السجل
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-500 glass-panel rounded-3xl border border-white/5">
                  <HelpCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">لا يوجد نتائج للبحث أو التصفية الحالية.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* MODAL 1: MESSAGE PREVIEW */}
      {msgPreviewContent !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                معاينة رسالة الواتساب لولي الأمر
              </h3>
              <button onClick={() => setMsgPreviewContent(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <pre className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto" dir="rtl">
              {msgPreviewContent}
            </pre>
            <div className="flex justify-end pt-2">
              <button onClick={() => setMsgPreviewContent(null)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition">
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: STUDENT DETAILED HISTORY */}
      {selectedHistoryStudentId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl p-6 shadow-2xl space-y-6 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 no-print">
              <h3 className="font-bold text-white flex items-center gap-2 text-md">
                <Eye className="w-5 h-5 text-blue-400" />
                السجل التاريخي والتحليلي الكامل للطالب
              </h3>
              <button
                onClick={() => {
                  setSelectedHistoryStudentId(null);
                  setDetailedStudent(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {detailedLoading ? (
              <div className="text-center py-20 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-xs">جاري تحميل بيانات السجل التفصيلي...</p>
              </div>
            ) : detailedStudent && (
              <div className="space-y-6 print-area">
                
                {/* PDF Header Logo (Print only) */}
                <div className="hidden print:flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">تقرير المتابعة الأكاديمية الشامل</h1>
                    <p className="text-sm text-slate-500 mt-1">منصة المايسترو التعليمية — الأستاذ أحمد راضي كحلة</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-slate-600 font-bold">تاريخ استخراج التقرير</p>
                    <p className="text-sm text-slate-900 font-bold font-mono mt-0.5">{new Date().toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>

                {/* Info Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-white/3 border border-white/5 rounded-3xl text-xs print:bg-slate-50 print:border-slate-200 print:text-slate-900">
                  <div>
                    <p className="text-slate-500">اسم الطالب</p>
                    <p className="font-bold text-white text-sm mt-1 print:text-slate-900">{detailedStudent.student.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">كود الطالب</p>
                    <p className="font-bold text-white text-sm mt-1 font-mono print:text-slate-900">{detailedStudent.student.code}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">المجموعة التعليمية</p>
                    <p className="font-bold text-slate-300 text-sm mt-1 print:text-slate-900">{detailedStudent.student.groupName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">هاتف ولي الأمر</p>
                    <p className="font-bold text-slate-300 text-sm mt-1 font-mono print:text-slate-900">{detailedStudent.student.parentPhone || 'لا يوجد'}</p>
                  </div>
                </div>

                {/* Sub-panels Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Absences Panel */}
                  <div className="bg-white/2 border border-white/5 p-5 rounded-3xl space-y-4 print:border-slate-200">
                    <h4 className="font-bold text-white text-xs border-b border-white/5 pb-2 flex items-center gap-1.5 print:text-slate-900 print:border-slate-200">
                      <Clock className="w-4 h-4 text-rose-400" />
                      سجل الغياب والتأخر ⚠️
                    </h4>
                    {detailedStudent.absences.length > 0 ? (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {detailedStudent.absences.map((abs: any) => (
                          <div key={abs.id} className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-[11px] print:bg-red-50 print:border-red-100">
                            <div>
                              <p className="font-bold text-rose-300 print:text-red-700">{abs.day} ({abs.date})</p>
                              <p className="text-[9px] text-slate-500 mt-0.5">{abs.sessionTitle}</p>
                            </div>
                            <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">
                              غائب
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-400 font-semibold bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl">
                        🎉 لا توجد أي غيابات مسجلة للطالب منذ البداية.
                      </p>
                    )}
                  </div>

                  {/* Payments Subscriptions Panel */}
                  <div className="bg-white/2 border border-white/5 p-5 rounded-3xl space-y-4 print:border-slate-200">
                    <h4 className="font-bold text-white text-xs border-b border-white/5 pb-2 flex items-center gap-1.5 print:text-slate-900 print:border-slate-200">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      حالة سداد الاشتراكات الشهرية 💰
                    </h4>
                    {detailedStudent.subscriptions.length > 0 ? (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {detailedStudent.subscriptions.map((sub: any) => (
                          <div key={sub.id} className="flex items-center justify-between p-3 bg-white/3 border border-white/5 rounded-2xl text-[11px] print:border-slate-200">
                            <div>
                              <p className="font-bold text-slate-200 print:text-slate-900">سداد الفترة من: {sub.startDate} إلى {sub.endDate}</p>
                              <p className="text-[9px] text-slate-500 mt-0.5">القيمة: {sub.price} ج.م • المدفوع: {sub.paidAmount} ج.م</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              sub.isPaid 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                            }`}>
                              {sub.isPaid ? 'مدفوع' : 'غير مدفوع'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-10 text-center">لا توجد اشتراكات مسجلة بعد.</p>
                    )}
                  </div>
                </div>

                {/* All Exams Table */}
                <div className="bg-white/2 border border-white/5 p-5 rounded-3xl space-y-4 print:border-slate-200">
                  <h4 className="font-bold text-white text-xs border-b border-white/5 pb-2 flex items-center gap-1.5 print:text-slate-900 print:border-slate-200">
                    <Award className="w-4 h-4 text-amber-400" />
                    جميع الاختبارات والنتائج المسجلة 🏆
                  </h4>
                  {detailedStudent.exams.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-white/5">
                            <th className="py-2 font-bold">تاريخ الامتحان</th>
                            <th className="py-2 font-bold">الامتحان / التقييم</th>
                            <th className="py-2 font-bold text-center">النوع</th>
                            <th className="py-2 font-bold text-left">الدرجة</th>
                            <th className="py-2 font-bold text-left">النسبة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailedStudent.exams.map((ex: any) => {
                            const typeStr = ex.type === 'QUIZ' ? 'قصير' : ex.type === 'MONTHLY' ? 'شهري' : ex.type === 'FINAL' ? 'نهائي' : 'عام';
                            return (
                              <tr key={ex.id} className="border-b border-white/5 hover:bg-white/2 print:border-slate-200">
                                <td className="py-2.5 text-slate-400 font-mono print:text-slate-600">{ex.date}</td>
                                <td className="py-2.5 font-bold text-white print:text-slate-950">{ex.title}</td>
                                <td className="py-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    ex.type === 'QUIZ' ? 'bg-purple-500/15 text-purple-400' : 'bg-amber-500/15 text-amber-400'
                                  }`}>
                                    {typeStr}
                                  </span>
                                </td>
                                <td className="py-2.5 text-left font-mono text-slate-300 print:text-slate-700">{ex.score} / {ex.maxScore}</td>
                                <td className={`py-2.5 text-left font-mono font-bold ${ex.percentage >= 85 ? 'text-emerald-400' : ex.percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{ex.percentage}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-6 text-center">لا توجد اختبارات مسجلة للطالب.</p>
                  )}
                </div>

                {/* Print/Export Controls */}
                <div className="flex justify-end gap-3 no-print pt-4 border-t border-white/5">
                  <button
                    onClick={handleExportHistoryCSV}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    تصدير ملف Excel
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    طباعة التقرير / PDF
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Styling specific for print-layout integration */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          /* Hide everything in layout except the print container */
          #root, main, aside, nav, header, footer, .no-print, button, .glass-panel {
            display: none !important;
          }
          .print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            color: black !important;
            background: white !important;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .print-area * {
            color: black !important;
            background: transparent !important;
            box-shadow: none !important;
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>
    </div>
  );
}
