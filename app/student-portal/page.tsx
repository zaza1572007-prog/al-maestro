'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import HeroHeader from '@/components/HeroHeader';
import {
  GraduationCap,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  Bell,
  Sparkles,
  ArrowUpRight,
  QrCode,
  Copy,
  Check,
  Download,
  Calendar,
  Flame,
  ChevronLeft
} from 'lucide-react';

export default function StudentPortalDashboard() {
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [upcomingHomework, setUpcomingHomework] = useState<any[]>([]);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        const res = await fetch('/api/student-portal/dashboard');
        const data = await res.json();
        if (data.success) {
          setStudentInfo(data.student);
          setUpcomingHomework(data.upcomingHomework || []);
          setRecentExams(data.recentExams || []);
          setRecentFiles(data.recentFiles || []);
        } else {
          window.location.href = '/login?role=STUDENT';
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPortalData();
  }, []);

  const handleCopyCode = () => {
    if (!studentInfo?.code) return;
    navigator.clipboard.writeText(studentInfo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
        <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">جارٍ تحميل بيانات الطالب المتميز...</p>
      </div>
    );
  }

  if (!studentInfo) return null;

  return (
    <div className="space-y-6 md:space-y-8" dir="rtl">
      {/* ── 1. Hero Header ── */}
      <HeroHeader
        title={`أهلاً بك يا بطل، ${studentInfo.name} 🎓`}
        badge="بوابة الطالب المتميز - منصة المايسترو"
        subtitle={`${studentInfo.stage} | ${studentInfo.group} | الرمز: ${studentInfo.code}`}
        stats={[
          { label: "نسبة الحضور", value: studentInfo.attendanceRate, color: "text-emerald-400" },
          { label: "الالتزام المتتالي", value: `${studentInfo.attendanceStreak || 0} حصص 🔥`, color: "text-amber-400" },
          { label: "أحدث نتيجة", value: studentInfo.latestExamScore, color: "text-purple-300" },
        ]}
      />

      {/* ── 2. VIP Student Identity Card (Mobile First) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-500/25 bg-gradient-to-br from-slate-900/90 via-purple-950/20 to-slate-900/90 p-5 md:p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Right: QR Code Container */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right w-full sm:w-auto">
            <div className="relative p-2.5 bg-white rounded-2xl shadow-lg shrink-0 group">
              <QRCodeSVG
                value={studentInfo.qrCode || `QR-${studentInfo.code}` || studentInfo.code}
                size={88}
                level="M"
                includeMargin={false}
              />
              <div className="text-[10px] font-mono font-bold text-slate-800 text-center mt-1">
                {studentInfo.code}
              </div>
            </div>

            <div className="space-y-1 text-center sm:text-right">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold">
                <Sparkles className="w-3 h-3 text-amber-400" />
                بطاقة الطالب الرقمية
              </div>
              <h2 className="text-lg md:text-xl font-black text-white">{studentInfo.name}</h2>
              <p className="text-xs text-slate-400">
                كود الحساب: <span className="font-mono text-purple-300 font-bold">{studentInfo.code}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {studentInfo.stage} • {studentInfo.group}
              </p>
            </div>
          </div>

          {/* Left: Quick Actions for Mobile */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={handleCopyCode}
              type="button"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-xs font-bold rounded-2xl transition active:scale-95 cursor-pointer shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ الكود</span>
                </>
              )}
            </button>

            <Link
              href="/student-portal/exams"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 text-xs font-bold rounded-2xl transition active:scale-95 shadow-sm"
            >
              <Award className="w-4 h-4" />
              <span>نتائجي</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Schedule Bar if available */}
        {studentInfo.groupScheduleDays && studentInfo.groupScheduleDays.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>مواعيد الحصص الأسبوعية:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/5 px-2.5 py-1 rounded-xl text-[11px] text-slate-300 font-medium">
                {studentInfo.groupScheduleDays.join(' ، ')}
                {studentInfo.groupStartTime && ` (${studentInfo.groupStartTime} - ${studentInfo.groupEndTime})`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Main Metrics Grid (2x2 on Mobile, 4-col on Desktop) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Attendance */}
        <div className="glass-card p-4 sm:p-5 rounded-3xl relative overflow-hidden bg-slate-900/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">نسبة الحضور</p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">{studentInfo.attendanceRate}</h3>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 truncate">
            {studentInfo.presentSessions} حضور من {studentInfo.totalSessions} حصص
          </p>
        </div>

        {/* Homework */}
        <div className="glass-card p-4 sm:p-5 rounded-3xl relative overflow-hidden bg-slate-900/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">تسليم الواجبات</p>
              <h3 className="text-2xl sm:text-3xl font-black text-purple-300 mt-1">{studentInfo.homeworkSubmissions}</h3>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-purple-300/80 mt-3 truncate font-semibold">
            {studentInfo.totalHomework > 0
              ? `${studentInfo.homeworkSubmissions} من ${studentInfo.totalHomework} واجب`
              : 'لا توجد واجبات متأخرة ✨'}
          </p>
        </div>

        {/* Latest Exam */}
        <div className="glass-card p-4 sm:p-5 rounded-3xl relative overflow-hidden bg-slate-900/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400">أحدث اختبار</p>
              <h3 className="text-lg sm:text-2xl font-black text-blue-300 mt-1 truncate">
                {studentInfo.latestExamScore}
              </h3>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-blue-400 mt-3 truncate font-semibold">
            {studentInfo.latestExamRank || 'أحدث تقييم تم رصده'}
          </p>
        </div>

        {/* Study Materials Shortcut */}
        <Link
          href="/student-portal/files"
          className="glass-card p-4 sm:p-5 rounded-3xl relative overflow-hidden bg-slate-900/60 border border-white/10 hover:border-purple-500/40 transition flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">المذكرات والشيتات</p>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">{recentFiles.length}</h3>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 shrink-0 group-hover:scale-105 transition">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-amber-400 mt-3 flex items-center gap-1 font-semibold">
            <span>تصفح وتحميل الملازم</span>
            <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition" />
          </p>
        </Link>
      </div>

      {/* ── 4. Detailed Sections: Homework & Exams ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Homework Card */}
        <div className="glass-panel p-5 md:p-6 rounded-3xl border border-white/10 shadow-lg bg-slate-900/40">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>الواجبات والمهمات القادمة</span>
            </h2>
            <Link href="/student-portal/homework" className="text-xs text-purple-400 hover:text-purple-300 font-bold">
              جميع الواجبات ←
            </Link>
          </div>

          {upcomingHomework.length > 0 ? (
            <div className="space-y-3">
              {upcomingHomework.map((hw) => (
                <div
                  key={hw.id}
                  className="p-3.5 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs sm:text-sm truncate">{hw.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      تاريخ التسليم: {hw.dueDate}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold border shrink-0 ${
                      hw.status === 'مكتمل'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {hw.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4 rounded-2xl bg-white/2 border border-white/5">
              <Sparkles className="w-8 h-8 text-purple-400/60 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-300">رائع! لا توجد أي واجبات مستحقة عليك حالياً 🎉</p>
              <p className="text-[10px] text-slate-500 mt-1">استمر في تفوقك ومتابعة دروسك أولاً بأول يا بطل.</p>
            </div>
          )}
        </div>

        {/* Exams Card */}
        <div className="glass-panel p-5 md:p-6 rounded-3xl border border-white/10 shadow-lg bg-slate-900/40">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-400" />
              <span>أحدث الامتحانات والدرجات</span>
            </h2>
            <Link href="/student-portal/exams" className="text-xs text-blue-400 hover:text-blue-300 font-bold">
              سجل الامتحانات ←
            </Link>
          </div>

          {recentExams.length > 0 ? (
            <div className="space-y-3">
              {recentExams.map((ex) => (
                <div
                  key={ex.id}
                  className="p-3.5 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs sm:text-sm truncate">{ex.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      {ex.date} {ex.rank && <span className="text-amber-400 font-bold">• {ex.rank}</span>}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-xs sm:text-sm font-black text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-xl">
                      {ex.scoreDisplay || `${ex.scoreRaw} من ${ex.maxScore}`}
                    </span>
                    {ex.percentage !== undefined && (
                      <p className="text-[9px] text-slate-500 text-center mt-1">{ex.percentage}%</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4 rounded-2xl bg-white/2 border border-white/5">
              <Award className="w-8 h-8 text-blue-400/60 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-300">لم يتم رصد نتائج امتحانات حديثة بعد 📝</p>
              <p className="text-[10px] text-slate-500 mt-1">ستظهر درجات اختباراتك وتقييماتك هنا فور اعتمادها.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Quick Access to Latest Study Materials (Files) ── */}
      {recentFiles.length > 0 && (
        <div className="glass-panel p-5 md:p-6 rounded-3xl border border-white/10 shadow-lg bg-slate-900/40">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>أحدث المذكرات والشيتات المرفوعة 📚</span>
            </h2>
            <Link href="/student-portal/files" className="text-xs text-amber-400 hover:text-amber-300 font-bold">
              المكتبة الكاملة ←
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentFiles.map((file) => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-white/3 border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5 transition text-xs group"
              >
                <div className="min-w-0">
                  <p className="font-bold text-white truncate text-xs group-hover:text-amber-300 transition">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{file.date}</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

