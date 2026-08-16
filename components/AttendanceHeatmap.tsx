'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
    bg: 'bg-slate-900/60 hover:bg-slate-800',
    border: 'border-slate-800/80',
    text: 'text-slate-600',
    glow: 'none',
  },
  1: {
    bg: 'bg-rose-500/20 hover:bg-rose-500/30',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    glow: '0 0 10px rgba(244, 63, 94, 0.2)',
  },
  2: {
    bg: 'bg-amber-500/25 hover:bg-amber-500/40',
    border: 'border-amber-500/45',
    text: 'text-amber-400',
    glow: '0 0 10px rgba(245, 158, 11, 0.2)',
  },
  3: {
    bg: 'bg-blue-500/30 hover:bg-blue-500/45',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    glow: '0 0 12px rgba(59, 130, 246, 0.25)',
  },
  4: {
    bg: 'bg-emerald-500/40 hover:bg-emerald-500/60',
    border: 'border-emerald-400/60',
    text: 'text-emerald-300',
    glow: '0 0 15px rgba(16, 185, 129, 0.35)',
  },
};

export default function AttendanceHeatmap({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [dataMap, setDataMap] = useState<Record<string, HeatmapDay>>({});
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [monthsCount, setMonthsCount] = useState<number>(3); // last 3 months

  const fetchHeatmap = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/heatmap?months=${monthsCount}`);
      const data = await res.json();
      if (data.success && data.heatmapData) {
        const map: Record<string, HeatmapDay> = {};
        data.heatmapData.forEach((item: HeatmapDay) => {
          map[item.date] = item;
        });
        setDataMap(map);
      }
    } catch (e) {
      console.error('Heatmap load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, [monthsCount]);

  // Generate grid cells for the last N days (aligning weeks starting Sunday)
  const gridWeeks = useMemo(() => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - monthsCount * 30);

    // Adjust startDate to preceding Sunday so columns align
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

  // Summary Metrics
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

  return (
    <div
      className={`glass-panel border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.7) 0%, rgba(6, 9, 19, 0.85) 100%)',
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            <span>خريطة تفاعل الحضور (Heatmap)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مؤشرات الحضور والغياب اليومية وكثافة التفاعل عبر الأسابيع
          </p>
        </div>

        {/* Filters & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
            {[1, 2, 3].map((m) => (
              <button
                key={m}
                onClick={() => setMonthsCount(m)}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  monthsCount === m
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 1 ? 'آخر شهر' : `${m} أشهر`}
              </button>
            ))}
          </div>

          <button
            onClick={fetchHeatmap}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="تحديث الخريطة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl">
          <p className="text-[10px] text-slate-400 font-semibold mb-0.5">أيام النشاط</p>
          <p className="text-lg font-extrabold text-white">{Object.keys(dataMap).length} يوم</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
          <p className="text-[10px] text-slate-400 font-semibold mb-0.5">متوسط نسبة الحضور</p>
          <p className="text-lg font-extrabold text-emerald-400">{metrics.avgRate}%</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl">
          <p className="text-[10px] text-slate-400 font-semibold mb-0.5">إجمالي الحضور</p>
          <p className="text-lg font-extrabold text-blue-400">{metrics.totalPresent} طالب</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-2xl">
          <p className="text-[10px] text-slate-400 font-semibold mb-0.5">عدد الجلسات المنفذة</p>
          <p className="text-lg font-extrabold text-purple-400">{metrics.totalSessions} جلسة</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
          <span className="text-sm font-semibold animate-pulse">جارٍ بناء الخريطة الحرارية...</span>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="min-w-[650px] flex gap-2">
            {/* Days of week labels on the right */}
            <div className="flex flex-col justify-between py-1 text-[11px] font-bold text-slate-500 pl-2 border-l border-slate-800/60 select-none">
              {ARABIC_DAYS.map((day, i) => (
                <span key={i} className="h-5 flex items-center">
                  {i % 2 === 0 ? day : ''}
                </span>
              ))}
            </div>

            {/* Weeks columns */}
            <div className="flex-1 flex gap-1.5 overflow-x-auto">
              {gridWeeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1.5">
                  {week.map((cell, dIdx) => {
                    const dayData = cell.dayData;
                    const level = dayData ? dayData.level : 0;
                    const styleConfig = LEVEL_CLASSES[level];
                    const isToday = cell.dateStr === new Date().toISOString().split('T')[0];

                    return (
                      <motion.div
                        key={cell.dateStr}
                        whileHover={{ scale: 1.25, zIndex: 30 }}
                        onClick={() => {
                          if (dayData && dayData.sessionCount > 0) {
                            router.push(`/daily-attendance?date=${cell.dateStr}`);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (dayData) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoverPos({ x: rect.left + rect.width / 2, y: rect.top });
                            setHoveredDay(dayData);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredDay(null);
                        }}
                        className={`w-5 h-5 rounded-md border transition-all cursor-pointer relative ${
                          styleConfig.bg
                        } ${styleConfig.border} ${isToday ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-slate-950' : ''}`}
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
      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold ml-1">نسبة الحضور:</span>
          <span className="text-[10px] text-slate-500">أقل</span>
          <div className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-800" title="بدون حصص" />
          <div className="w-3.5 h-3.5 rounded bg-rose-500/30 border border-rose-500/40" title="منخفض (<50%)" />
          <div className="w-3.5 h-3.5 rounded bg-amber-500/30 border border-amber-500/40" title="متوسط (50-70%)" />
          <div className="w-3.5 h-3.5 rounded bg-blue-500/35 border border-blue-500/50" title="جيد (70-85%)" />
          <div className="w-3.5 h-3.5 rounded bg-emerald-500/50 border border-emerald-400/60" title="ممتاز (>85%)" />
          <span className="text-[10px] text-slate-500">أعلى</span>
        </div>

        <p className="text-[10px] text-slate-500 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-purple-400 inline" />
          انقر على أي يوم للانتقال مباشرة لكشف الحضور الخاص به
        </p>
      </div>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hoveredDay && hoverPos && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[100] pointer-events-none p-3 rounded-2xl glass-panel border border-white/20 shadow-2xl bg-slate-950/95 text-xs w-48 -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: hoverPos.x,
              top: hoverPos.y,
            }}
          >
            <p className="font-bold text-white mb-1.5 flex items-center justify-between border-b border-white/10 pb-1">
              <span>{hoveredDay.date}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${LEVEL_CLASSES[hoveredDay.level].bg} ${LEVEL_CLASSES[hoveredDay.level].text}`}>
                {hoveredDay.rate}% حضور
              </span>
            </p>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span>إجمالي الحضور:</span>
                <span className="font-bold text-emerald-400">{hoveredDay.present} طالب</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>إجمالي الغياب:</span>
                <span className="font-bold text-rose-400">{hoveredDay.absent} طالب</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-white/5">
                <span>عدد الحصص/المجموعات:</span>
                <span className="font-bold text-purple-300">{hoveredDay.sessionCount}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
