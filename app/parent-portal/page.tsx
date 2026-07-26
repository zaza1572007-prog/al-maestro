'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import {
  Users,
  GraduationCap,
  Award,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  ChevronDown,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export default function ParentPortalDashboard() {
  const [children] = useState([
    {
      id: '1',
      name: 'أحمد محمود الفقي',
      stage: 'الصف الثالث الثانوي (علمي)',
      attendanceRate: '96%',
      latestExam: '98 / 100',
      group: 'مجموعة الأحد 6:00 مساءً',
    },
    {
      id: '2',
      name: 'مريم محمود الفقي',
      stage: 'الصف الأول الإعدادي',
      attendanceRate: '100%',
      latestExam: '49 / 50',
      group: 'مجموعة السبت 4:00 مساءً',
    },
  ]);

  const [selectedChildId, setSelectedChildId] = useState('1');

  const selectedChild = children.find((c) => c.id === selectedChildId) || children[0];

  return (
    <div className="space-y-8">
      {/* Child Selector & Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10">
        <div>
          <span className="text-xs text-purple-400 font-semibold mb-1 block">بوابة ولي الأمر - متابعة الأبناء</span>
          <h2 className="text-xl font-bold text-white">اختر الابن لمتابعة التقرير والتفاصيل:</h2>
        </div>

        {/* Dynamic Child Switcher Tabs */}
        <div className="flex items-center gap-3">
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-white/20 shadow-lg shadow-purple-500/30'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>{child.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Header for Selected Child */}
      <HeroHeader
        title={`تقرير متابعة: ${selectedChild.name} 👨‍🎓`}
        badge="منظومة المتابعة الشاملة لولي الأمر"
        subtitle={`${selectedChild.stage} | ${selectedChild.group}`}
        stats={[
          { label: "حضور الابن", value: selectedChild.attendanceRate, color: "text-emerald-400" },
          { label: "آخر النتيجة", value: selectedChild.latestExam, color: "text-purple-300" },
        ]}
      />

      {/* Metric Animated Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          key={`att-${selectedChild.id}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">سجل الانضباط والحضور</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-1">{selectedChild.attendanceRate}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-7 h-7" />
            </div>
          </div>
          <p className="text-xs text-emerald-400 mt-4 font-semibold">انتظام ممتاز بدون غياب</p>
        </motion.div>

        <motion.div
          key={`ex-${selectedChild.id}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="glass-card p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">آخر تقييم في الامتحانات</p>
              <h3 className="text-3xl font-black text-purple-300 mt-1">{selectedChild.latestExam}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
              <Award className="w-7 h-7" />
            </div>
          </div>
          <p className="text-xs text-purple-400 mt-4 font-semibold">درجة متميزة 🌟</p>
        </motion.div>

        <motion.div
          key={`hw-${selectedChild.id}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="glass-card p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">الواجبات المنزلية</p>
              <h3 className="text-3xl font-black text-blue-300 mt-1">100%</h3>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
              <BookOpen className="w-7 h-7" />
            </div>
          </div>
          <p className="text-xs text-blue-400 mt-4 font-semibold">ملم بجميع التكليفات</p>
        </motion.div>

        <motion.div
          key={`msg-${selectedChild.id}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="glass-card p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">ملاحظات الأستاذ</p>
              <h3 className="text-lg font-bold text-slate-200 mt-2">طالب مجتهد جداً</h3>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <MessageSquare className="w-7 h-7" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">تفاعل إيجابي داخل الحصة</p>
        </motion.div>
      </div>

      {/* Quick Direct Actions for Parent */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-4">
        <h3 className="text-lg font-bold text-white">التواصل السريع المباشر مع إدارة المنصة:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="glass-button p-4 rounded-2xl text-right text-slate-200 text-sm font-semibold flex items-center justify-between">
            <span>إرسال استفسار عبر WhatsApp</span>
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </button>
          <button className="glass-button p-4 rounded-2xl text-right text-slate-200 text-sm font-semibold flex items-center justify-between">
            <span>طلب تقرير تفصيلي بالدرجات</span>
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </button>
          <button className="glass-button p-4 rounded-2xl text-right text-slate-200 text-sm font-semibold flex items-center justify-between">
            <span>تجديد الاشتراك الشهري</span>
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
