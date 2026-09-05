'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Flame,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  Award,
} from 'lucide-react';

interface HeatmapDay {
  date: string;
  present: number;
  absent: number;
  total: number;
  sessionCount: number;
  rate: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const ARABIC_DAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

// Color mapping for levels
const LEVEL_CLASSES: Record<number, { bg: string; border: string; text: string; glow: string }> = {
  0: {
    bg: 'bg-zinc-200/70 hover:bg-zinc-300 dark:bg-slate-900/60 dark:hover:bg-slate-800',
    border: 'border-zinc-300/80 dark:border-slate-800/80',
    text: 'text-zinc-500 dark:text-slate-600',
    glow: 'none',
  },
  1: {
    bg: 'bg-rose-500/20 hover:bg-rose-500/30',
    border: 'border-rose-500/40',
    text: 'text-rose-600 dark:text-rose-400',
    glow: '0 0 10px rgba(244, 63, 94, 0.2)',
  },
  2: {
    bg: 'bg-amber-500/25 hover:bg-amber-500/40',
    border: 'border-amber-500/45',
    text: 'text-amber-600 dark:text-amber-400',
    glow: '0 0 10px rgba(245, 158, 11, 0.2)',
  },
  3: {
    bg: 'bg-blue-500/30 hover:bg-blue-500/45',
    border: 'border-blue-500/50',
    text: 'text-blue-600 dark:text-blue-400',
    glow: '0 0 12px rgba(59, 130, 246, 0.25)',
  },
  4: {
    bg: 'bg-emerald-500/40 hover:bg-emerald-500/60',
    border: 'border-emerald-500/60 dark:border-emerald-400/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    glow: '0 0 15px rgba(16, 185, 129, 0.35)',
  },
};

interface AttendanceHeatmapProps {
  className?: string;
}

export default function AttendanceHeatmap({ className = '' }: AttendanceHeatmapProps) {
  const router = useRouter();
  const [dataMap, setDataMap] = useState<Record<string, HeatmapDay>>({});
  const [loading, setLoading] = useState(true);
  const [monthsCount, setMonthsCount] = useState<number>(3);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedModalDay, setSelectedModalDay] = useState<HeatmapDay | null>(null);

  const fetchHeatmap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/heatmap?months=${monthsCount}`);
      const json = await res.json();
      if (json.success && json.heatmapData) {
        const map: Record<string, HeatmapDay> = {};
        json.heatmapData.forEach((item: HeatmapDay) => {
          map[item.date] = item;
        });
        setDataMap(map);
      }
    } catch (e) {
      console.error('Heatmap fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [monthsCount]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  const gridWeeks = useMemo(() => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - monthsCount * 30);

    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const weeks: { dateStr: string; dateObj: Date; dayData: HeatmapDay | null }[][] = [];
    let currentWeek: { dateStr: string; dateObj: Date; dayData: HeatmapDay | null }[] = [];

    const curr = new Date(startDate);
    while (curr <= today) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      currentWeek.push({
        dateStr,
        dateObj: new Date(curr),
        dayData: dataMap[dateStr] || null,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      curr.setDate(curr.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [dataMap, monthsCount]);

  const metrics = useMemo(() => {
    const entries = Object.values(dataMap);
    if (entries.length === 0) {
      return { totalSessions: 0, totalPresent: 0, totalAbsent: 0, avgRate: 0, maxRateDay: null };
    }
    const totalSessions = entries.reduce((acc, d) => acc + d.sessionCount, 0);
    const totalPresent = entries.reduce((acc, d) => acc + d.present, 0);
    const totalAbsent = entries.reduce((acc, d) => acc + d.absent, 0);
    const totalStudents = totalPresent + totalAbsent;
    const avgRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

    let maxRateDay: HeatmapDay | null = null;
    entries.forEach((d) => {
      if (d.total >= 5 && (!maxRateDay || d.rate > maxRateDay.rate)) {
        maxRateDay = d;
      }
    });

    return { totalSessions, totalPresent, totalAbsent, avgRate, maxRateDay };
  }, [dataMap]);

  const formatArabicDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={`bg-white dark:bg-zinc-900/70 border border-zinc-200/90 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-2xl relative overflow-hidden ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-pulse" />
            <span>خريطة تفاعل الحضور (Heatmap)</span>
          </h2>
          <p className="text-xs text-zinc-600 dark:text-slate-400 mt-1">
            مؤشرات الحضور والغياب اليومية وكثافة التفاعل عبر الأسابيع
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-100 dark:bg-slate-950/70 p-1 rounded-xl border border-zinc-200 dark:border-slate-800 text-xs">
            {[1, 2, 3].map((m) => (
              <button
                key={m}
                onClick={() => setMonthsCount(m)}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  monthsCount === m
                    ? 'bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/40'
                    : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-200'
                }`}
              >
                {m === 1 ? 'آخر شهر' : `${m} أشهر`}
              </button>
            ))}
          </div>

          <button
            onClick={fetchHeatmap}
            disabled={loading}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-zinc-600 dark:text-slate-300 rounded-xl transition cursor-pointer border border-zinc-200 dark:border-transparent"
            title="تحديث الخريطة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Summary Pills with Tabular Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-slate-900/60 border border-zinc-200/90 dark:border-slate-800/80 p-3 rounded-2xl shadow-sm">
          <p className="text-[10px] text-zinc-600 dark:text-slate-400 font-semibold mb-0.5">أيام النشاط</p>
          <p className="text-lg font-extrabold text-zinc-950 dark:text-white tabular-nums font-mono">
            {loading ? '...' : `${Object.keys(dataMap).length} يوم`}
          </p>
        </div>
        <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/90 dark:border-emerald-500/20 p-3 rounded-2xl shadow-sm">
          <p className="text-[10px] text-zinc-600 dark:text-slate-400 font-semibold mb-0.5">متوسط نسبة الحضور</p>
          <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums font-mono">
            {loading ? '...' : `${metrics.avgRate}%`}
          </p>
        </div>
        <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/90 dark:border-blue-500/20 p-3 rounded-2xl shadow-sm">
          <p className="text-[10px] text-zinc-600 dark:text-slate-400 font-semibold mb-0.5">إجمالي الحضور</p>
          <p className="text-lg font-extrabold text-blue-700 dark:text-blue-400 tabular-nums font-mono">
            {loading ? '...' : `${metrics.totalPresent} طالب`}
          </p>
        </div>
        <div className="bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200/90 dark:border-purple-500/20 p-3 rounded-2xl shadow-sm">
          <p className="text-[10px] text-zinc-600 dark:text-slate-400 font-semibold mb-0.5">عدد الجلسات المنفذة</p>
          <p className="text-lg font-extrabold text-purple-700 dark:text-purple-400 tabular-nums font-mono">
            {loading ? '...' : `${metrics.totalSessions} جلسة`}
          </p>
        </div>
      </div>

      {/* Heatmap Grid & Shimmer Loading Skeleton */}
      {loading ? (
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-2 justify-center text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
            <span className="font-semibold">جارٍ تحميل الخريطة الحرارية...</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <div className="flex flex-col justify-between py-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-600 pl-2 border-l border-zinc-200 dark:border-zinc-800 select-none">
              {ARABIC_DAYS.map((day, i) => (
                <span key={i} className="h-5 flex items-center">
                  {i % 2 === 0 ? day : ''}
                </span>
              ))}
            </div>
            <div className="flex-1 flex gap-1.5">
              {Array.from({ length: 14 }).map((_, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-1.5">
                  {Array.from({ length: 7 }).map((_, rowIdx) => (
                    <div
                      key={rowIdx}
                      className="w-5 h-5 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse border border-zinc-300/40 dark:border-zinc-700/40"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="min-w-[650px] flex gap-2">
            <div className="flex flex-col justify-between py-1 text-[11px] font-bold text-zinc-500 dark:text-slate-500 pl-2 border-l border-zinc-200 dark:border-slate-800/60 select-none">
              {ARABIC_DAYS.map((day, i) => (
                <span key={i} className="h-5 flex items-center">
                  {i % 2 === 0 ? day : ''}
                </span>
              ))}
            </div>

            <div className="flex-1 flex gap-1.5 overflow-x-auto">
              {gridWeeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1.5">
                  {week.map((cell) => {
                    const dayData = cell.dayData;
                    const level = dayData ? dayData.level : 0;
                    const styleConfig = LEVEL_CLASSES[level];
                    const isToday = cell.dateStr === new Date().toISOString().split('T')[0];

                    return (
                      <motion.div
                        key={cell.dateStr}
                        whileHover={{ scale: 1.25, zIndex: 30 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          const targetData: HeatmapDay = dayData || {
                            date: cell.dateStr,
                            present: 0,
                            absent: 0,
                            total: 0,
                            sessionCount: 0,
                            rate: 0,
                            level: 0,
                          };
                          setSelectedModalDay(targetData);
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoverPos({ x: rect.left + rect.width / 2, y: rect.top });
                          setHoveredDay(
                            dayData || {
                              date: cell.dateStr,
                              present: 0,
                              absent: 0,
                              total: 0,
                              sessionCount: 0,
                              rate: 0,
                              level: 0,
                            }
                          );
                        }}
                        onMouseLeave={() => {
                          setHoveredDay(null);
                        }}
                        className={`w-5 h-5 rounded-md border transition-all cursor-pointer relative ${
                          styleConfig.bg
                        } ${styleConfig.border} ${
                          isToday ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-950' : ''
                        }`}
                        style={{ boxShadow: styleConfig.glow }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend & Hint */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-zinc-200 dark:border-slate-800/80 text-xs text-zinc-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold ml-1">نسبة الحضور:</span>
          <div className="w-3.5 h-3.5 rounded bg-zinc-200/80 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700" title="بدون نشاط (0%)" />
          <div className="w-3.5 h-3.5 rounded bg-amber-500/30 border border-amber-500/40" title="متوسط (50-70%)" />
          <div className="w-3.5 h-3.5 rounded bg-blue-500/35 border border-blue-500/50" title="جيد (70-85%)" />
          <div className="w-3.5 h-3.5 rounded bg-emerald-500/50 border border-emerald-400/60" title="ممتاز (>85%)" />
          <span className="text-[10px] text-zinc-400 dark:text-slate-500">أعلى</span>
        </div>

        <p className="text-[10px] text-zinc-500 dark:text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 inline shrink-0" />
          انقر فوق أي مربع لعرض تفاصيل اليوم والانتقال لكشف الحضور
        </p>
      </div>

      {/* 🎈 Floating Tooltip on Hover */}
      <AnimatePresence>
        {hoveredDay && hoverPos && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.94 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[100] pointer-events-none p-3 rounded-2xl glass-panel border border-zinc-300 dark:border-white/20 shadow-2xl bg-white/95 dark:bg-zinc-950/95 text-xs w-52 -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: hoverPos.x,
              top: hoverPos.y,
            }}
          >
            <p className="font-bold text-zinc-900 dark:text-white mb-1.5 flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-1.5">
              <span className="text-[11px]">{formatArabicDate(hoveredDay.date)}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold tabular-nums font-mono ${
                  LEVEL_CLASSES[hoveredDay.level].bg
                } ${LEVEL_CLASSES[hoveredDay.level].text}`}
              >
                {hoveredDay.rate}%
              </span>
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-zinc-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>الحاضرين:</span>
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                  {hoveredDay.present} طالب
                </span>
              </div>
              <div className="flex justify-between text-zinc-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>الغائبين:</span>
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums font-mono">
                  {hoveredDay.absent} طالب
                </span>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-slate-400 text-[10px] pt-1.5 border-t border-zinc-200 dark:border-white/5">
                <span>الجلسات المنفذة:</span>
                <span className="font-bold text-purple-600 dark:text-purple-300 tabular-nums font-mono">
                  {hoveredDay.sessionCount} جلسة
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📱 Mobile Slide-up BottomSheet Drawer on Click */}
      <AnimatePresence>
        {selectedModalDay && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedModalDay(null)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Top Handle Bar for Touch */}
              <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden" />

              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                      تفاصيل حضور {formatArabicDate(selectedModalDay.date)}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      التاريخ الفعلي: <span className="font-mono tabular-nums">{selectedModalDay.date}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedModalDay(null)}
                  className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                >
                  ✕
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">الحاضرين</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                    {selectedModalDay.present} <span className="text-xs font-medium">طالب</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">الغائبين</span>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums font-mono">
                    {selectedModalDay.absent} <span className="text-xs font-medium">طالب</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">نسبة الحضور</span>
                  <p className="text-2xl font-black text-purple-600 dark:text-purple-300 tabular-nums font-mono">
                    {selectedModalDay.rate}%
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">عدد الحصص</span>
                  <p className="text-2xl font-black text-zinc-950 dark:text-white tabular-nums font-mono">
                    {selectedModalDay.sessionCount} <span className="text-xs font-medium">جلسة</span>
                  </p>
                </div>
              </div>

              {/* Attendance Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 font-semibold">
                  <span>مستوى الحضور العام</span>
                  <span className="tabular-nums font-mono">{selectedModalDay.rate}%</span>
                </div>
                <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-200 dark:border-zinc-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-emerald-500 transition-all duration-500"
                    style={{ width: `${selectedModalDay.rate}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    const targetDate = selectedModalDay.date;
                    setSelectedModalDay(null);
                    router.push(`/daily-attendance?date=${targetDate}`);
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>فتح كشف الحضور لهذا اليوم</span>
                </button>
                <button
                  onClick={() => setSelectedModalDay(null)}
                  className="py-3 px-5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
