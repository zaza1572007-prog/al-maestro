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
  QrCode
} from 'lucide-react';

export default function StudentPortalDashboard() {
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [upcomingHomework, setUpcomingHomework] = useState<any[]>([]);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        const res = await fetch('/api/student-portal/dashboard');
        const data = await res.json();
        if (data.success) {
          setStudentInfo(data.student);
          setUpcomingHomework(data.upcomingHomework);
          setRecentExams(data.recentExams);
        } else {
          // fallback if unauthorized or error
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

  if (loading) {
    return <div className="text-center py-20 text-white animate-pulse">جارٍ تحميل بيانات الطالب...</div>;
  }

  if (!studentInfo) return null;

  return (
    <div className="space-y-8">
      {/* Hero Header for Student */}
      <HeroHeader
        title={`أهلاً بك يا بطل، ${studentInfo.name} 🎓`}
        badge="بوابة الطالب المتميز - المايسترو Premium"
        subtitle={`${studentInfo.stage} | ${studentInfo.group} | الرمز: ${studentInfo.code}`}
        stats={[
          { label: "نسبة حضورك", value: studentInfo.attendanceRate, color: "text-emerald-400" },
          { label: "أحدث نتيجة", value: studentInfo.latestExamScore, color: "text-purple-300" },
        ]}
      />

      {/* Student Profile Card with QR Code & Barcode */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/40 text-right">
        <div className="space-y-3 text-right w-full">
          <p className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
            <QrCode className="w-4 h-4" /> رمز الـ QR والباركود للبطاقة التعريفية
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-start direction-rtl">
            {/* Real QR Code */}
            <div className="bg-white p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-md w-full sm:w-auto">
              <QRCodeSVG
                value={studentInfo.qrCode || `QR-${studentInfo.code}` || studentInfo.code}
                size={88}
                level="M"
                includeMargin={false}
              />
              <span className="font-mono text-[9px] text-slate-800 tracking-wider font-bold">
                {studentInfo.code}
              </span>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-white">{studentInfo.name}</h2>
              <p className="text-xs text-slate-400">كود الحساب: <strong className="text-blue-400 font-mono">{studentInfo.code}</strong></p>
              <p className="text-xs text-slate-400">الرمز الشريطي: <strong className="text-purple-400 font-mono">{studentInfo.qrCode || `QR-${studentInfo.code}`}</strong></p>
              
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(studentInfo.code);
                    alert('تم نسخ كود الطالب بنجاح! 📋');
                  }}
                  className="px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-[11px] font-bold rounded-xl transition cursor-pointer"
                >
                  📋 نسخ كود الطالب
                </button>
                <Link
                  href="/student-portal/exams"
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 text-[11px] font-bold rounded-xl transition inline-flex items-center gap-1"
                >
                  📊 نتائج الامتحانات <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">سجل الحضور</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-1">{studentInfo.attendanceRate}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-7 h-7" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">التزام مميز في الحصص</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">تسليم الواجبات</p>
              <h3 className="text-3xl font-black text-purple-300 mt-1">{studentInfo.homeworkSubmissions}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
              <BookOpen className="w-7 h-7" />
            </div>
          </div>
          <p className="text-xs text-purple-400 mt-4 font-semibold">مكتمل 100%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">أحدث نتيجة امتحان</p>
              <h3 className="text-3xl font-black text-blue-300 mt-1 font-mono tracking-tight" dir="ltr">
                {studentInfo.latestExamScore}
              </h3>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
              <Award className="w-7 h-7" />
            </div>
          </div>
          {studentInfo.latestExamRank ? (
            <p className="text-xs text-blue-400 mt-4 font-semibold">{studentInfo.latestExamRank}</p>
          ) : (
            <p className="text-xs text-slate-500 mt-4 font-normal">أحدث تقييم للامتحان</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-card p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">حالة الاشتراك</p>
              <h3 className={`text-xl font-bold mt-2 ${studentInfo.subscriptionStatus?.includes('نشط 🟢') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {studentInfo.subscriptionStatus}
              </h3>
            </div>
            <div className={`p-4 rounded-2xl border ${studentInfo.subscriptionStatus?.includes('نشط 🟢') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              <CreditCard className="w-7 h-7" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {studentInfo.subscriptionEndDate ? `ساري حتى: ${studentInfo.subscriptionEndDate}` : 'يرجى مراجعة إدارة السنتر لتجديد الاشتراك'}
          </p>
        </motion.div>
      </div>

      {/* Homework and Exam Detailed Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Homework Card */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span>الواجبات والمهمات القادمة</span>
            </h2>
            <Link href="/student-portal/homework" className="text-xs text-purple-400 hover:underline">
              جميع الواجبات
            </Link>
          </div>

          <div className="space-y-4">
            {upcomingHomework.map((hw) => (
              <div
                key={hw.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-white text-sm">{hw.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    تاريخ التسليم: {hw.dueDate}
                  </p>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-semibold border ${
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
        </div>

        {/* Exams Card */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-400" />
              <span>أحدث الامتحانات والدرجات</span>
            </h2>
            <Link href="/student-portal/exams" className="text-xs text-blue-400 hover:underline">
              سجل الامتحانات
            </Link>
          </div>

          <div className="space-y-4">
            {recentExams.map((ex) => (
              <div
                key={ex.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-white text-sm">{ex.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {ex.date} {ex.rank ? `• ${ex.rank}` : ''}
                  </p>
                </div>
                <span className="text-lg font-black text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-2xl font-mono tracking-tight" dir="ltr">
                  {ex.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
