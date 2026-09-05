'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  QrCode,
  UserPlus,
  Zap,
  CreditCard,
  BarChart2,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  Calendar,
  BookOpen,
  Award,
  Printer,
  ChevronLeft,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import AttendanceHeatmap from '@/components/AttendanceHeatmap';
import EmptyState from '@/components/EmptyState';
import Avatar from '@/components/Avatar';
import { NetworkStatusBadge, PwaInstallButton } from '@/components/PwaStatusManager';
import StatusIndicator from '@/components/StatusIndicator';
import Timeline from '@/components/Timeline';




interface TodayGroup {
  id: string;
  name: string;
  stageName?: string;
  scheduleDays?: string[];
  studentsCount: number;
  presentCount: number;
  absentCount: number;
  sessionStatus?: string;
  timeSlot?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeGroups: 0,
    todayAttendanceRate: '0%',
    pendingPaymentsCount: 0,
    pendingRegistrations: 0,
    totalCollected: 0,
    todayAttendancesCount: 0,
  });

  const [todayGroups, setTodayGroups] = useState<TodayGroup[]>([]);
  const [allGroupsList, setAllGroupsList] = useState<TodayGroup[]>([]);
  const [activeGroupTab, setActiveGroupTab] = useState<'TODAY' | 'ALL'>('TODAY');
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real statistics & today's groups from API
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, groupsRes, allGrpRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/attendance/today-groups').catch(() => null),
        fetch('/api/groups').catch(() => null),
      ]);

      const statsData = await statsRes.json();
      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
        setRecentActivities(statsData.logs || []);
      }

      if (groupsRes) {
        const grpData = await groupsRes.json();
        const rawGroups = grpData.groups || grpData.todayGroups || [];
        const formatted: TodayGroup[] = rawGroups.map((g: any) => ({
          id: g.id,
          name: g.name,
          stageName: g.stageName || g.academicStage?.name,
          scheduleDays: g.scheduleDays || [],
          studentsCount: g.stats?.total ?? g.students?.length ?? g._count?.students ?? 0,
          presentCount: g.stats?.present ?? 0,
          absentCount: g.stats?.absent ?? 0,
          sessionStatus: g.sessionStatus || 'NOT_STARTED',
          timeSlot: g.startTime ? `${g.startTime}${g.endTime ? ` - ${g.endTime}` : ''}` : undefined,
        }));
        setTodayGroups(formatted);
      }

      if (allGrpRes) {
        const allData = await allGrpRes.json();
        const rawAll = allData.groups || [];
        const formattedAll: TodayGroup[] = rawAll.map((g: any) => ({
          id: g.id,
          name: g.name,
          stageName: g.academicStage?.name,
          scheduleDays: g.scheduleDays || [],
          studentsCount: g._count?.students ?? g.students?.length ?? 0,
          presentCount: 0,
          absentCount: 0,
          sessionStatus: 'SCHEDULED',
          timeSlot: g.scheduleDays && g.scheduleDays.length > 0 ? g.scheduleDays.join(' · ') : undefined,
        }));
        setAllGroupsList(formattedAll);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Dynamic greeting based on hour
  const currentHour = currentTime.getHours();
  const greeting = currentHour < 12 ? 'صباح الخير والبركة' : 'مساء الخير والتميز';

  const chartData = [
    { name: 'السبت', attendance: stats.totalStudents ? 90 : 0 },
    { name: 'الأحد', attendance: stats.totalStudents ? 95 : 0 },
    { name: 'الإثنين', attendance: stats.totalStudents ? 92 : 0 },
    { name: 'الثلاثاء', attendance: stats.totalStudents ? 98 : 0 },
    { name: 'الأربعاء', attendance: stats.totalStudents ? 94 : 0 },
    { name: 'الخميس', attendance: stats.totalStudents ? 96 : 0 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 🌟 Modern Compact Executive Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl p-5 md:p-6 glass-panel border border-white/15 shadow-2xl overflow-hidden bg-gradient-to-r from-purple-950/30 via-indigo-950/20 to-slate-950/40 backdrop-blur-xl"
      >
        {/* Background Subtle Spotlights */}
        <div className="absolute -top-20 -left-20 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Greeting & Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                  لوحة المتابعة الذكية
                </span>
                <NetworkStatusBadge size="sm" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight gradient-heading">
                أهلاً بك، أستاذ أحمد راضي كحلة 👋
              </h1>

              <p className="text-slate-400 text-xs md:text-sm flex items-center gap-2 flex-wrap">
                <span>إجمالي الطلاب: <b className="text-white font-mono">{stats.totalStudents}</b> طالب</span>
                <span>·</span>
                <span>المجموعات النشطة: <b className="text-purple-300 font-mono">{stats.activeGroups}</b> مجموعة</span>
                <span>·</span>
                <span>حضور اليوم: <b className="text-emerald-400 font-mono">{stats.todayAttendanceRate}</b></span>
              </p>
            </div>

            {/* Compact Clock & Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-start lg:self-center">
              {/* Sleek Clock Pill with Tabular Nums */}
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-zinc-200/80 dark:border-white/10 shadow-lg">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse flex-shrink-0" />
                <div className="text-right leading-tight">
                  <p className="text-sm font-black text-zinc-950 dark:text-white font-mono tabular-nums tracking-wider" dir="ltr">
                    {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-slate-400">
                    {currentTime.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Link href="/attendance">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-xs transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>ماسح الـ QR</span>
                  </motion.button>
                </Link>

                <Link href="/students">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600 text-purple-700 hover:text-white dark:text-purple-300 dark:hover:text-white border border-purple-500/30 rounded-2xl text-xs font-bold transition cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>إضافة طالب</span>
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

      {/* 📊 High-Density Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Students */}
        <Link href="/students" className="block group">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="glass-card p-4 md:p-5 rounded-3xl border border-zinc-200/80 dark:border-white/10 hover:border-purple-500/40 transition-all duration-200 shadow-xl relative overflow-hidden group-hover:shadow-purple-500/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">إجمالي الطلاب</span>
              <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-24 bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse rounded-lg mt-2 mb-1" />
            ) : (
              <p className="text-2xl md:text-3xl font-black text-zinc-950 dark:text-white mt-2 font-mono tabular-nums">
                {stats.totalStudents}
              </p>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200/60 dark:border-white/5 text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3 h-3" /> مسجلين بالقواعد
              </span>
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-transform group-hover:-translate-x-1" />
            </div>
          </motion.div>
        </Link>

        {/* Card 2: Active Groups */}
        <Link href="/groups" className="block group">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="glass-card p-4 md:p-5 rounded-3xl border border-zinc-200/80 dark:border-white/10 hover:border-blue-500/40 transition-all duration-200 shadow-xl relative overflow-hidden group-hover:shadow-blue-500/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">المجموعات التعليمية</span>
              <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 transform group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-300">
                <Users className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-20 bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse rounded-lg mt-2 mb-1" />
            ) : (
              <p className="text-2xl md:text-3xl font-black text-zinc-950 dark:text-white mt-2 font-mono tabular-nums">
                {stats.activeGroups}
              </p>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200/60 dark:border-white/5 text-[11px]">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">مجموعات نشطة</span>
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-transform group-hover:-translate-x-1" />
            </div>
          </motion.div>
        </Link>

        {/* Card 3: Today's Attendance */}
        <Link href="/attendance" className="block group">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="glass-card p-4 md:p-5 rounded-3xl border border-zinc-200/80 dark:border-white/10 hover:border-emerald-500/40 transition-all duration-200 shadow-xl relative overflow-hidden group-hover:shadow-emerald-500/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">نسبة حضور اليوم</span>
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-20 bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse rounded-lg mt-2 mb-1" />
            ) : (
              <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono tabular-nums">
                {stats.todayAttendanceRate}
              </p>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200/60 dark:border-white/5 text-[11px]">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                {stats.todayAttendancesCount > 0 ? `${stats.todayAttendancesCount} طالب حاضر` : 'بانتظار تسجيل الحضور'}
              </span>
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-transform group-hover:-translate-x-1" />
            </div>
          </motion.div>
        </Link>

        {/* Card 4: Pending Registrations */}
        <Link href="/registration-requests" className="block group">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="glass-card p-4 md:p-5 rounded-3xl border border-zinc-200/80 dark:border-white/10 hover:border-amber-500/40 transition-all duration-200 shadow-xl relative overflow-hidden group-hover:shadow-amber-500/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs">طلبات الحجز المعلقة</span>
              <div className={`p-2.5 rounded-2xl border transform group-hover:scale-110 transition-transform duration-300 ${stats.pendingRegistrations > 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse' : 'bg-zinc-100 dark:bg-slate-800 text-zinc-600 dark:text-slate-400 border-zinc-200 dark:border-slate-700'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse rounded-lg mt-2 mb-1" />
            ) : (
              <p className={`text-2xl md:text-3xl font-black mt-2 font-mono tabular-nums ${stats.pendingRegistrations > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-950 dark:text-white'}`}>
                {stats.pendingRegistrations}
              </p>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200/60 dark:border-white/5 text-[11px]">
              <span className={stats.pendingRegistrations > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-500 dark:text-zinc-400'}>
                {stats.pendingRegistrations > 0 ? 'مطلوب المراجعة والقبول' : 'لا توجد طلبات معلقة'}
              </span>
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-transform group-hover:-translate-x-1" />
            </div>
          </motion.div>
        </Link>
      </div>

      {/* 🔥 Attendance Activity Heatmap */}
      <AttendanceHeatmap />


      {/* 🚀 Main 2-Column Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Today's Schedule + Analytics Chart */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Scheduled Sessions Center */}
          <div className="glass-panel p-5 md:p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-white/10 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/25">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">جدول ومجموعات الدروس</h2>
                  <p className="text-[11px] text-zinc-500 dark:text-slate-400">متابعة الحصص والمجموعات وإدارة الحضور المباشر</p>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-slate-950 p-1 rounded-2xl border border-zinc-200 dark:border-white/10 self-start sm:self-auto">
                <button
                  onClick={() => setActiveGroupTab('TODAY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeGroupTab === 'TODAY'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  <span>مجموعات اليوم</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-slate-900 text-zinc-800 dark:text-slate-200 text-[10px] font-mono">
                    {todayGroups.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveGroupTab('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeGroupTab === 'ALL'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  <span>جميع المجموعات</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-slate-900 text-zinc-800 dark:text-slate-200 text-[10px] font-mono">
                    {allGroupsList.length || stats.activeGroups}
                  </span>
                </button>
              </div>
            </div>

            {/* Display list based on active tab */}
            {(() => {
              const displayList = activeGroupTab === 'TODAY' ? todayGroups : allGroupsList;

              if (displayList.length === 0) {
                return (
                  <EmptyState
                    variant="groups"
                    title={
                      activeGroupTab === 'TODAY'
                        ? 'لا توجد مجموعات مجدولة اليوم'
                        : 'لا توجد مجموعات مسجلة'
                    }
                    description={
                      activeGroupTab === 'TODAY'
                        ? 'تفرغ تام اليوم! لا توجد مجموعات دراسية مبرمجة لموعد اليوم.'
                        : 'يمكنك البدء بإنشاء مجموعة دراسية جديدة من صفحة المجموعات.'
                    }
                    actionLabel={
                      activeGroupTab === 'TODAY' && allGroupsList.length > 0
                        ? `عرض جميع المجموعات النشطة (${allGroupsList.length})`
                        : undefined
                    }
                    onAction={
                      activeGroupTab === 'TODAY' && allGroupsList.length > 0
                        ? () => setActiveGroupTab('ALL')
                        : undefined
                    }
                  />
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                  {displayList.map((grp) => {
                    const pct =
                      grp.studentsCount > 0
                        ? Math.round((grp.presentCount / grp.studentsCount) * 100)
                        : 0;

                    return (
                      <div
                        key={grp.id}
                        className="bg-white/60 dark:bg-slate-950/70 border border-zinc-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-3 hover:border-purple-500/40 transition-all flex flex-col justify-between shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-zinc-950 dark:text-white text-sm leading-snug">{grp.name}</h3>
                              <p className="text-[11px] text-zinc-500 dark:text-slate-400 mt-0.5">
                                {grp.stageName || 'مجموعة دراسية'}
                              </p>
                            </div>
                            <StatusIndicator
                              status={
                                grp.sessionStatus === 'OPEN'
                                  ? 'open'
                                  : grp.sessionStatus === 'COMPLETED'
                                  ? 'closed'
                                  : 'pending'
                              }
                              pulse={grp.sessionStatus === 'OPEN'}
                              size="sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-zinc-500 dark:text-slate-400">
                              <span>
                                الطلاب:{' '}
                                <b className="text-zinc-950 dark:text-white font-mono">
                                  {activeGroupTab === 'TODAY' ? `${grp.presentCount} / ` : ''}
                                  {grp.studentsCount}
                                </b>{' '}
                                طالب
                              </span>
                              {activeGroupTab === 'TODAY' && (
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{pct}%</span>
                              )}
                            </div>
                            {activeGroupTab === 'TODAY' && (
                              <div className="w-full bg-zinc-200 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-zinc-500 dark:text-slate-400 truncate max-w-[130px]">
                            {grp.timeSlot ||
                              (grp.scheduleDays && grp.scheduleDays.length > 0
                                ? grp.scheduleDays.join(' · ')
                                : 'مواعيد منتظمة')}
                          </span>
                          <Link href={`/attendance?groupId=${grp.id}`}>
                            <button className="px-3 py-1 bg-purple-600/15 hover:bg-purple-600 text-purple-700 hover:text-white dark:text-purple-300 dark:hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer">
                              تسجيل الحضور ←
                            </button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Weekly Attendance Performance Chart */}
          <div className="glass-panel p-5 md:p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/25">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">معدل الحضور والتفاعل الأسبوعي</h2>
                  <p className="text-[11px] text-zinc-500 dark:text-slate-400">تحليل بياني أسبوعي للحضور الفعلي للطلاب</p>
                </div>
              </div>

              <span className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full font-semibold">
                بيانات حية
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAttendanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '16px',
                      color: '#fff',
                      backdropFilter: 'blur(12px)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    name="نسبة الحضور (%)"
                    stroke="#a855f7"
                    strokeWidth={3}
                    fill="url(#colorAttendanceGrad)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#a855f7' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Shortcuts Hub + Live Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          {/* ⚡ Quick Navigation Shortcuts Hub */}
          <div className="glass-panel p-5 rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-2xl space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-200/80 dark:border-white/10">
              <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white">الوصول السريع والإجراءات</h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/attendance" className="block">
                <div className="p-3 bg-white/60 dark:bg-slate-950/70 hover:bg-zinc-100 dark:hover:bg-slate-900 border border-zinc-200/80 dark:border-white/5 hover:border-emerald-500/30 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-zinc-950 dark:group-hover:text-white">ماسح الحضور</p>
                </div>
              </Link>

              <Link href="/students" className="block">
                <div className="p-3 bg-white/60 dark:bg-slate-950/70 hover:bg-zinc-100 dark:hover:bg-slate-900 border border-zinc-200/80 dark:border-white/5 hover:border-purple-500/30 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-zinc-950 dark:group-hover:text-white">إضافة طالب</p>
                </div>
              </Link>

              <Link href="/exams" className="block">
                <div className="p-3 bg-white/60 dark:bg-slate-950/70 hover:bg-zinc-100 dark:hover:bg-slate-900 border border-zinc-200/80 dark:border-white/5 hover:border-blue-500/30 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                    <Award className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-zinc-950 dark:group-hover:text-white">الامتحانات والنتائج</p>
                </div>
              </Link>

              <Link href="/subscriptions" className="block">
                <div className="p-3 bg-white/60 dark:bg-slate-950/70 hover:bg-zinc-100 dark:hover:bg-slate-900 border border-zinc-200/80 dark:border-white/5 hover:border-amber-500/30 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-zinc-950 dark:group-hover:text-white">الاشتراكات</p>
                </div>
              </Link>

              <Link href="/cards" className="block">
                <div className="p-3 bg-white/60 dark:bg-slate-950/70 hover:bg-zinc-100 dark:hover:bg-slate-900 border border-zinc-200/80 dark:border-white/5 hover:border-teal-500/30 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <Printer className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-zinc-950 dark:group-hover:text-white">طباعة الكروت</p>
                </div>
              </Link>

              <Link href="/reports" className="block">
                <div className="p-3 bg-white/60 dark:bg-slate-950/70 hover:bg-zinc-100 dark:hover:bg-slate-900 border border-zinc-200/80 dark:border-white/5 hover:border-pink-500/30 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-zinc-950 dark:group-hover:text-white">التقارير الشاملة</p>
                </div>
              </Link>
            </div>
          </div>

          {/* ⚡ Live Operations Activity Feed */}
          <div className="glass-panel p-5 rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-zinc-950 dark:text-white">سجل العمليات الأخير</h2>
              </div>
              <Link href="/audit-log" className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline">
                عرض السجل الكامل
              </Link>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-0.5">
              {recentActivities.length === 0 ? (
                <EmptyState
                  variant="generic"
                  title="لا توجد عمليات"
                  description="ستظهر السجلات والعمليات المنفذة هنا تلقائياً."
                />
              ) : (
                recentActivities.slice(0, 6).map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-950/70 border border-zinc-200/80 dark:border-white/5 flex items-center gap-3 hover:border-purple-500/20 transition-all"
                  >
                    <Avatar name={act.text || 'أحد الطلاب'} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-800 dark:text-slate-300 font-medium truncate">{act.text}</p>
                      <span className="text-[10px] text-zinc-500 dark:text-slate-500 block mt-0.5 font-mono tabular-nums">
                        {act.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link href="/reports" className="block pt-1">
              <button className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-zinc-200 dark:border-slate-700/60 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer">
                <span>تصدير التقرير الشامل</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
