'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats] = useState({
    totalStudents: 145,
    activeGroups: 8,
    todaySessions: 3,
    todayAttendanceRate: '94%',
    pendingPaymentsCount: 12,
  });

  const recentActivities = [
    { id: 1, text: 'تم تسجيل حضور الطالب أحمد محمود عبر QR Code', time: 'منذ 10 دقائق', type: 'presence' },
    { id: 2, text: 'تم إضافة دفعة مالية جديدة بقيمة 300 ج.م للطالبة سارة علي', time: 'منذ 25 دقيقة', type: 'payment' },
    { id: 3, text: 'تم رصد درجات اختبار الرياضيات الأسبوعي لمجموعة السبت 4:00 مساءً', time: 'منذ ساعة', type: 'exam' },
    { id: 4, text: 'إرسال 45 رسالة WhatsApp تلقائية لأولياء الأمور بنجاح', time: 'منذ ساعتين', type: 'whatsapp' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-indigo-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 z-10 text-center md:text-right">
          <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-semibold">
            مركز التحكم اليومي (Today's Control Center)
          </span>
          <h1 className="text-3xl font-extrabold text-white">مرحباً بك، الأستاذ أحمد راضي كحلة 👋</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            إليك نظرة عامة على أداء المنصة والجلسات اليومية والأنشطة المالية الخاصة بطلابك اليوم.
          </p>
        </div>
        <div className="flex items-center gap-3 z-10">
          <Link
            href="/attendance"
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition text-sm flex items-center gap-2"
          >
            <span>📱</span> فتح ماسح الـ QR
          </Link>
          <Link
            href="/students"
            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-2xl transition text-sm flex items-center gap-2"
          >
            <span>👨‍🎓</span> إضافة طالب جديد
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">إجمالي الطلاب المسجلين</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{stats.totalStudents}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-2xl">
              👨‍🎓
            </div>
          </div>
          <p className="text-xs text-emerald-400 mt-3 font-medium">↑ 12% مقارنة بالشهر الماضي</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">المجموعات النشطة</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{stats.activeGroups}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl">
              👥
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 font-medium">موزعة على الابتدائية والإعدادية والثانوية</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">نسبة حضور اليوم</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{stats.todayAttendanceRate}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl">
              📈
            </div>
          </div>
          <p className="text-xs text-emerald-400 mt-3 font-medium">ممتاز (أعلى من المتوسط)</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">ملاحظات الاشتراكات المعلقة</p>
              <h3 className="text-3xl font-extrabold text-amber-400 mt-1">{stats.pendingPaymentsCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl">
              ⚠️
            </div>
          </div>
          <p className="text-xs text-amber-400 mt-3 font-medium">اشتراكات تنتهي هذا الأسبوع</p>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚡</span> سجل الأنشطة والأحداث اللحظية (Activity Feed)
            </h2>
            <Link href="/audit-log" className="text-xs text-blue-400 hover:underline">عرض الكل ←</Link>
          </div>
          <div className="space-y-4">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-sm text-slate-200">{act.text}</span>
                </div>
                <span className="text-xs text-slate-500">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links & Info */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🚀</span> الاختصارات والسريعة
          </h2>
          <div className="space-y-2.5">
            <Link href="/cards" className="w-full flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-200 text-sm transition">
              <span className="flex items-center gap-2"><span>🎴</span> طباعة بطاقات QR للمجموعات</span>
              <span>←</span>
            </Link>
            <Link href="/reports" className="w-full flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-200 text-sm transition">
              <span className="flex items-center gap-2"><span>📊</span> تصدير تقارير الحضور والماليات</span>
              <span>←</span>
            </Link>
            <Link href="/tasks" className="w-full flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-200 text-sm transition">
              <span className="flex items-center gap-2"><span>✅</span> متابعة مهام المساعدين</span>
              <span>←</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
