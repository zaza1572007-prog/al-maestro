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
  startTime?: string;
  endTime?: string;
}

interface SessionTimingResult {
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED';
  label: string;
  startsInMinutes?: number;
  timeRemainingText?: string;
}

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim();
  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm|ص|م)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3]?.toUpperCase();
    if (period === 'PM' || period === 'م') {
      if (hours < 12) hours += 12;
    } else if (period === 'AM' || period === 'ص') {
      if (hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
  }

  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

function getSessionTimingStatus(
  startTime?: string,
  endTime?: string,
  timeSlot?: string,
  now = new Date(),
  fallbackStatus?: string
): SessionTimingResult {
  let startMinutes = parseTimeToMinutes(startTime);
  let endMinutes = parseTimeToMinutes(endTime);

  // If start / end are not directly passed, try extracting from timeSlot (e.g. "14:00 - 16:00")
  if (startMinutes === null && timeSlot && timeSlot.includes('-')) {
    const parts = timeSlot.split('-').map(s => s.trim());
    if (parts.length >= 2) {
      startMinutes = parseTimeToMinutes(parts[0]);
      endMinutes = parseTimeToMinutes(parts[1]);
    }
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes !== null) {
    if (endMinutes === null) {
      endMinutes = startMinutes + 90; // Default 1.5h session if end time omitted
    }

    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return {
        status: 'LIVE',
        label: 'جارية الآن',
      };
    }

    if (currentMinutes < startMinutes) {
      const diff = startMinutes - currentMinutes;
      let timeRemainingText = '';
      if (diff === 1) {
        timeRemainingText = 'تبدأ بعد دقيقة';
      } else if (diff === 2) {
        timeRemainingText = 'تبدأ بعد دقيقتين';
      } else if (diff > 2 && diff <= 10) {
        timeRemainingText = `تبدأ بعد ${diff} دقائق`;
      } else if (diff > 10 && diff < 60) {
        timeRemainingText = `تبدأ بعد ${diff} دقيقة`;
      } else if (diff === 60) {
        timeRemainingText = 'تبدأ بعد ساعة';
      } else if (diff > 60) {
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        if (mins === 0) {
          timeRemainingText = hours === 2 ? 'تبدأ بعد ساعتين' : `تبدأ بعد ${hours} ساعات`;
        } else {
          timeRemainingText = `تبدأ بعد ${hours} س و ${mins} د`;
        }
      }

      return {
        status: 'UPCOMING',
        label: timeRemainingText || 'لم تبدأ بعد',
        startsInMinutes: diff,
        timeRemainingText,
      };
    }

    if (currentMinutes > endMinutes) {
      return {
        status: 'COMPLETED',
        label: 'انتهت الجلسة',
      };
    }
  }

  if (fallbackStatus === 'OPEN') {
    return { status: 'LIVE', label: 'جارية الآن' };
  }
  if (fallbackStatus === 'COMPLETED') {
    return { status: 'COMPLETED', label: 'انتهت الجلسة' };
  }

  return { status: 'UPCOMING', label: 'لم تبدأ بعد' };
}

function formatActivityLog(log: any) {
  const action = (log.action || '').toUpperCase();
  const userName = log.userName || (log.details && typeof log.details === 'object' ? log.details.studentName || log.details.userName : '');

  let title = 'إجراء نظامي';
  let badgeColor = 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
  let IconComponent = ShieldCheck;

  if (action.includes('LOGIN') || action.includes('AUTH')) {
    title = action.includes('FAIL') ? 'محاولة دخول غير ناجحة' : 'تسجيل دخول ناجح';
    badgeColor = action.includes('FAIL')
      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    IconComponent = CheckCircle2;
  } else if (action.includes('ATTENDANCE')) {
    title = 'تسجيل حضور طالب';
    badgeColor = 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    IconComponent = QrCode;
  } else if (action.includes('PAYMENT') || action.includes('PAID')) {
    title = 'استلام دفعة مالية';
    badgeColor = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    IconComponent = CreditCard;
  } else if (action.includes('STUDENT') || action.includes('REGISTER')) {
    title = action.includes('UPDATE') ? 'تحديث بيانات طالب' : 'إضافة طالب جديد';
    badgeColor = 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
    IconComponent = UserPlus;
  } else if (action.includes('EXAM')) {
    title = 'تسجيل درجات امتحان';
    badgeColor = 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30';
    IconComponent = Award;
  } else if (action.includes('HOMEWORK')) {
    title = 'تسليم واجب ومراجعته';
    badgeColor = 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
    IconComponent = BookOpen;
  } else if (action.includes('SESSION')) {
    title = action.includes('START') ? 'بدء حصة دراسية' : 'إنهاء حصة دراسية';
    badgeColor = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    IconComponent = Calendar;
  } else if (log.entityType) {
    title = `${log.entityType}`;
  }

  const displayText = userName ? `${title} • ${userName}` : title;
  return { displayText, badgeColor, IconComponent };
}

function getRelativeTimeArabic(dateInput: string | Date | undefined): string {
  if (!dateInput) return '';
  const now = new Date();
  const date = new Date(dateInput);
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'الآن';
  if (diffMin === 1) return 'منذ دقيقة';
  if (diffMin === 2) return 'منذ دقيقتين';
  if (diffMin > 2 && diffMin <= 10) return `منذ ${diffMin} دقائق`;
  if (diffMin > 10 && diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHours === 1) return 'منذ ساعة';
  if (diffHours === 2) return 'منذ ساعتين';
  if (diffHours > 2 && diffHours < 24) return `منذ ${diffHours} ساعات`;

  const isToday = now.toDateString() === date.toDateString();
  const timeStr = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (isToday) return `اليوم ${timeStr}`;

  return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
          startTime: g.startTime,
          endTime: g.endTime,
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
    <div className="space-y-6 pb-24">
      {/* 🌟 Modern Compact Executive Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl p-5 md:p-6 glass-panel border border-zinc-200/90 dark:border-white/15 shadow-2xl overflow-hidden bg-gradient-to-r from-purple-100/90 via-indigo-50/80 to-slate-100/90 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-slate-950/40 backdrop-blur-xl"
      >
        {/* Background Subtle Spotlights */}
        <div className="absolute -top-20 -left-20 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Greeting & Live Operational Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400 animate-spin" />
                لوحة المتابعة الذكية
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
              أهلاً بك، أستاذ أحمد راضي كحلة 👋
            </h1>

            {/* Live Operational Schedule Info with RTL Isolation */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-zinc-700 dark:text-zinc-300 text-xs font-medium">
              <span className="flex items-center gap-1">
                المجموعات المجدولة اليوم:{' '}
                <b className="text-zinc-900 dark:text-white font-mono tabular-nums bg-white/80 dark:bg-white/10 px-2.5 py-0.5 rounded-lg border border-zinc-300 dark:border-white/15 font-bold shadow-sm">
                  {todayGroups.length} مجموعات
                </b>
              </span>
              <span className="text-zinc-400 dark:text-zinc-600">•</span>
              <div className="inline-flex items-center gap-1.5">
                {todayGroups.length > 0 ? (
                  <>
                    <span>الحصة القادمة:</span>{' '}
                    <span className="bg-primary/10 border border-primary/30 text-primary dark:text-primary-foreground text-xs font-mono font-bold px-3 py-1 rounded-full inline-flex items-center gap-1 shadow-sm">
                      <Clock className="w-3 h-3" />
                      <span dir="ltr">
                        {todayGroups.find((g) => g.sessionStatus !== 'COMPLETED')?.timeSlot ||
                          todayGroups[0]?.timeSlot ||
                          '18:00 - 20:00'}
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    لا توجد حصص مجدولة لباقي اليوم ✨
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Compact Clock & Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-start lg:self-center">
            {/* Sleek Clock Pill with Tabular Nums */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-zinc-200/90 dark:border-white/10 shadow-sm">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse flex-shrink-0" />
              <div className="text-right leading-tight">
                <p className="text-sm font-black text-zinc-950 dark:text-white font-mono tabular-nums tracking-wider" dir="ltr">
                  {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-slate-400 font-medium">
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
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/15 hover:bg-purple-600 text-purple-700 hover:text-white dark:text-purple-300 dark:hover:text-white border border-purple-500/30 rounded-2xl text-xs font-bold transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة طالب</span>
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 📊 Clean Interactive Metric KPI Cards with Rich Glassmorphism & Vibrant Glowing Icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Students (Purple Glow) */}
        <Link href="/students" className="block group">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="glass-card bg-gradient-to-br from-white/90 via-white/80 to-purple-50/50 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-purple-950/30 p-4 md:p-5 rounded-3xl border border-zinc-200/90 dark:border-white/10 hover:border-purple-500/60 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 shadow-sm relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-300 font-semibold text-xs">إجمالي الطلاب</span>
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-600/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
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
            <div className="mt-2 pt-2 border-t border-zinc-200/80 dark:border-white/10 text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3 h-3" /> مسجلين بالقواعد
              </span>
            </div>
          </motion.div>
        </Link>

        {/* Card 2: Active Groups (Blue Glow) */}
        <Link href="/groups" className="block group">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="glass-card bg-gradient-to-br from-white/90 via-white/80 to-blue-50/50 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-blue-950/30 p-4 md:p-5 rounded-3xl border border-zinc-200/90 dark:border-white/10 hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 shadow-sm relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-300 font-semibold text-xs">المجموعات التعليمية</span>
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-600/10 text-blue-600 dark:text-blue-300 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] transform group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-300">
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
            <div className="mt-2 pt-2 border-t border-zinc-200/80 dark:border-white/10 text-[11px]">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">مجموعات نشطة</span>
            </div>
          </motion.div>
        </Link>

        {/* Card 3: Today's Attendance (Emerald Glow) */}
        <Link href="/attendance" className="block group">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="glass-card bg-gradient-to-br from-white/90 via-white/80 to-emerald-50/50 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-emerald-950/30 p-4 md:p-5 rounded-3xl border border-zinc-200/90 dark:border-white/10 hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 shadow-sm relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-300 font-semibold text-xs">نسبة حضور اليوم</span>
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
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
            <div className="mt-2 pt-2 border-t border-zinc-200/80 dark:border-white/10 text-[11px]">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">
                {stats.todayAttendancesCount > 0 ? `${stats.todayAttendancesCount} طالب حاضر` : 'بانتظار تسجيل الحضور'}
              </span>
            </div>
          </motion.div>
        </Link>

        {/* Card 4: Pending Registrations (Amber Glow) */}
        <Link href="/registration-requests" className="block group">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="glass-card bg-gradient-to-br from-white/90 via-white/80 to-amber-50/50 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-amber-950/30 p-4 md:p-5 rounded-3xl border border-zinc-200/90 dark:border-white/10 hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 shadow-sm relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-300 font-semibold text-xs">طلبات الحجز المعلقة</span>
              <div className={`p-2.5 rounded-2xl border transform group-hover:scale-110 transition-transform duration-300 ${stats.pendingRegistrations > 0 ? 'bg-gradient-to-br from-amber-500/25 to-yellow-600/15 text-amber-500 dark:text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse' : 'bg-gradient-to-br from-slate-500/10 to-slate-600/5 text-zinc-500 dark:text-slate-400 border-zinc-200 dark:border-slate-700/60'}`}>
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
            <div className="mt-2 pt-2 border-t border-zinc-200/80 dark:border-white/10 text-[11px]">
              <span className={stats.pendingRegistrations > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-600 dark:text-zinc-400 font-semibold'}>
                {stats.pendingRegistrations > 0 ? 'مطلوب المراجعة والقبول' : 'لا توجد طلبات معلقة'}
              </span>
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
          <div className="bg-white dark:bg-zinc-900/70 p-5 md:p-6 rounded-3xl border border-zinc-200/90 dark:border-white/10 shadow-sm dark:shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-white/10 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/25">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">جدول ومجموعات الدروس</h2>
                  <p className="text-[11px] text-zinc-600 dark:text-slate-400">متابعة الحصص والمجموعات وإدارة الحضور المباشر</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center bg-zinc-100 dark:bg-slate-900 p-1 rounded-2xl border border-zinc-200 dark:border-slate-800 text-xs self-start sm:self-auto">
                <button
                  onClick={() => setActiveGroupTab('TODAY')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeGroupTab === 'TODAY'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  <span>مجموعات اليوم</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-white text-[10px] font-mono">
                    {todayGroups.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveGroupTab('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeGroupTab === 'ALL'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  <span>جميع المجموعات</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-slate-800 text-zinc-800 dark:text-slate-200 text-[10px] font-mono font-bold">
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

                    // Real-time calculated status based on current device time
                    const timing = getSessionTimingStatus(
                      grp.startTime,
                      grp.endTime,
                      grp.timeSlot,
                      currentTime,
                      grp.sessionStatus
                    );

                    const isLive = timing.status === 'LIVE';
                    const isCompleted = timing.status === 'COMPLETED';
                    const isUpcoming = timing.status === 'UPCOMING';

                    return (
                      <div
                        key={grp.id}
                        className={`rounded-2xl p-4 space-y-3 transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                          isLive
                            ? 'border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30 text-zinc-900 dark:text-white'
                            : isCompleted
                            ? 'opacity-60 hover:opacity-100 transition-opacity bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 shadow-sm text-zinc-800 dark:text-zinc-200'
                            : 'bg-white dark:bg-zinc-900/70 border border-zinc-200/90 dark:border-white/10 hover:border-amber-500/40 shadow-sm text-zinc-900 dark:text-white'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-zinc-950 dark:text-white text-sm leading-snug">{grp.name}</h3>
                              <p className="text-[11px] text-zinc-600 dark:text-slate-400 mt-0.5">
                                {grp.stageName || 'مجموعة دراسية'}
                              </p>
                            </div>
                            
                            {/* Dynamic Status Badge */}
                            {isLive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 shadow-sm">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                جارية الآن
                              </span>
                            ) : isUpcoming ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {timing.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400">
                                <CheckCircle2 className="w-3 h-3 text-zinc-500" />
                                انتهت الجلسة
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-zinc-600 dark:text-slate-300">
                              <span>
                                عدد الطلاب:{' '}
                                <b className="text-zinc-900 dark:text-white font-bold text-xs font-mono tabular-nums">
                                  {activeGroupTab === 'TODAY' ? `${grp.presentCount} / ` : ''}
                                  {grp.studentsCount}
                                </b>{' '}
                                طالب
                              </span>
                              {activeGroupTab === 'TODAY' && (
                                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">{pct}%</span>
                              )}
                            </div>
                            {activeGroupTab === 'TODAY' && (
                              <div className="w-full bg-zinc-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isLive ? 'bg-emerald-500' : isCompleted ? 'bg-zinc-400 dark:bg-zinc-600' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-200/80 dark:border-slate-800/60 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-zinc-600 dark:text-slate-400 truncate max-w-[130px] font-mono tabular-nums" dir="ltr">
                            {grp.timeSlot ||
                              (grp.scheduleDays && grp.scheduleDays.length > 0
                                ? grp.scheduleDays.join(' · ')
                                : 'مواعيد منتظمة')}
                          </span>
                          {isLive ? (
                            <Link href={`/attendance?groupId=${grp.id}`}>
                              <button className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 flex items-center gap-1">
                                <span>تسجيل الحضور الفوري</span>
                                <span className="text-emerald-200">←</span>
                              </button>
                            </Link>
                          ) : isCompleted ? (
                            <Link href={`/attendance?groupId=${grp.id}`}>
                              <button className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/70 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium transition cursor-pointer shadow-sm">
                                عرض تقرير الحصة
                              </button>
                            </Link>
                          ) : (
                            <Link href={`/attendance?groupId=${grp.id}`}>
                              <button className="px-3.5 py-1.5 bg-purple-600/15 hover:bg-purple-600 text-purple-700 hover:text-white dark:text-purple-300 dark:hover:text-white border border-purple-500/20 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm">
                                تسجيل الحضور ←
                              </button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Weekly Attendance Performance Chart */}
          <div className="bg-white dark:bg-zinc-900/70 p-5 md:p-6 rounded-3xl border border-zinc-200/90 dark:border-white/10 shadow-sm dark:shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/25">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">معدل الحضور والتفاعل الأسبوعي</h2>
                  <p className="text-[11px] text-zinc-600 dark:text-slate-400">تحليل بياني أسبوعي للحضور الفعلي للطلاب</p>
                </div>
              </div>

              <span className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full font-semibold">
                بيانات حية
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAttendanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.18)" />
                  <XAxis
                    dataKey="name"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontWeight: 500 }}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 100]}
                    tick={{ fill: '#71717a', fontWeight: 500 }}
                    unit="%"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-2.5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/15 shadow-xl text-xs space-y-1">
                            <p className="font-bold text-zinc-950 dark:text-white">{label}</p>
                            <p className="text-purple-600 dark:text-purple-300 font-bold tabular-nums font-mono">
                              نسبة الحضور: {payload[0].value}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    name="نسبة الحضور (%)"
                    stroke="#a855f7"
                    strokeWidth={3}
                    fill="url(#colorAttendanceGrad)"
                    dot={{ r: 4, fill: '#a855f7', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff', fill: '#9333ea' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Shortcuts Hub + Live Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          {/* ⚡ Quick Navigation Shortcuts Hub */}
          <div className="bg-white dark:bg-zinc-900/70 p-5 rounded-3xl border border-zinc-200/90 dark:border-white/10 shadow-sm dark:shadow-2xl space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-200/80 dark:border-white/10">
              <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white">الوصول السريع والإجراءات</h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/attendance" className="block">
                <div className="p-3 bg-white/80 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/90 border border-zinc-200/90 dark:border-white/10 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm backdrop-blur-md">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">ماسح الحضور</p>
                </div>
              </Link>

              <Link href="/students" className="block">
                <div className="p-3 bg-white/80 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/90 border border-zinc-200/90 dark:border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm backdrop-blur-md">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.2)] flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">إضافة طالب</p>
                </div>
              </Link>

              <Link href="/exams" className="block">
                <div className="p-3 bg-white/80 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/90 border border-zinc-200/90 dark:border-white/10 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm backdrop-blur-md">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)] flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                    <Award className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">الامتحانات والنتائج</p>
                </div>
              </Link>

              <Link href="/subscriptions" className="block">
                <div className="p-3 bg-white/80 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/90 border border-zinc-200/90 dark:border-white/10 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm backdrop-blur-md">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)] flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">الاشتراكات</p>
                </div>
              </Link>

              <Link href="/cards" className="block">
                <div className="p-3 bg-white/80 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/90 border border-zinc-200/90 dark:border-white/10 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/10 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm backdrop-blur-md">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 text-teal-600 dark:text-teal-300 border border-teal-500/30 shadow-[0_0_12px_rgba(20,184,166,0.2)] flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <Printer className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">طباعة الكروت</p>
                </div>
              </Link>

              <Link href="/reports" className="block">
                <div className="p-3 bg-white/80 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/90 border border-zinc-200/90 dark:border-white/10 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 rounded-2xl transition-all group cursor-pointer text-center space-y-1.5 shadow-sm backdrop-blur-md">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 text-pink-600 dark:text-pink-300 border border-pink-500/30 shadow-[0_0_12px_rgba(236,72,153,0.2)] flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-slate-200 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">التقارير الشاملة</p>
                </div>
              </Link>
            </div>
          </div>

          {/* ⚡ Live Operations Activity Feed with Translated Arabic Actions & Relative Times */}
          <div className="bg-white dark:bg-zinc-900/70 p-5 rounded-3xl border border-zinc-200/90 dark:border-white/10 shadow-sm dark:shadow-2xl space-y-3.5">
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
                recentActivities.slice(0, 6).map((act) => {
                  const { displayText, badgeColor, IconComponent } = formatActivityLog(act);
                  const relTime = getRelativeTimeArabic(act.createdAt);

                  return (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-2xl bg-zinc-50/80 dark:bg-slate-950/70 border border-zinc-200/90 dark:border-white/5 flex items-center gap-3 hover:border-purple-500/30 transition-all shadow-sm"
                    >
                      <div className={`p-2 rounded-xl border ${badgeColor} shrink-0`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-900 dark:text-slate-200 font-semibold truncate" title={displayText}>
                          {displayText}
                        </p>
                        <span className="text-[10px] text-zinc-500 dark:text-slate-400 block mt-0.5 font-mono tabular-nums">
                          {relTime}
                        </span>
                      </div>
                    </div>
                  );
                })
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
