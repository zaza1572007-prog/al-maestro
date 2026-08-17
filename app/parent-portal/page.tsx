'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  BookOpen,
  CreditCard,
  MessageSquare,
  ArrowUpRight,
  RefreshCw,
  ChevronDown,
  Phone,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCheck,
  Clock
} from 'lucide-react';

const WHATSAPP_NUMBER = '201100775230'; // +20 11 00775230

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, delay: i * 0.08, ease: 'easeOut' as const }
  }),
};

export default function ParentPortalDashboard() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/parent-portal');
      const data = await res.json();
      if (data.success && data.children && data.children.length > 0) {
        setChildren(data.children);
        setParentName(data.parentName || '');
        const savedChildId = localStorage.getItem('selectedChildId');
        const found = savedChildId && data.children.find((c: any) => c.id === savedChildId);
        const initial = found ? savedChildId : data.children[0].id;
        setSelectedChildId(initial!);
        localStorage.setItem('selectedChildId', initial!);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPortalData(); }, []);

  const handleSelectChild = (id: string) => {
    setSelectedChildId(id);
    localStorage.setItem('selectedChildId', id);
    setDropdownOpen(false);
  };

  const openWhatsApp = (message: string) => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-blue-500 animate-spin" />
        </div>
        <p className="text-slate-400 animate-pulse">جارٍ تحميل بيانات أبنائك...</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-2">
          <AlertCircle className="w-10 h-10 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-white">لا توجد بيانات</h2>
        <p className="text-slate-400 text-sm max-w-xs">لم يتم العثور على أبناء مسجلين بحسابك. تواصل مع إدارة المنصة.</p>
        <Link href="/login" className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition">
          العودة لتسجيل الدخول
        </Link>
      </div>
    );
  }

  const child = children.find((c) => c.id === selectedChildId) || children[0];

  const subscriptionColor =
    child.subscriptionStatus === 'ساري' ? 'emerald' :
    child.subscriptionStatus === 'ينتهي قريباً' ? 'amber' : 'rose';

  const metrics = [
    {
      label: 'سجل الحضور والانضباط',
      value: child.attendanceRate,
      sub: child.attendanceRate === 'N/A' ? 'لا توجد بيانات حضور بعد' : 'نسبة الحضور الفعلية',
      icon: CheckCircle2,
      color: 'emerald',
      gradient: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/25',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    },
    {
      label: 'آخر تقييم في الامتحانات',
      value: child.latestExam,
      sub: child.latestExam === 'لا توجد درجات' ? 'لم تُسجل درجات بعد' : 'آخر نتيجة امتحان مسجلة',
      icon: Award,
      color: 'purple',
      gradient: 'from-purple-500/20 to-indigo-500/10',
      border: 'border-purple-500/25',
      iconBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    },
    {
      label: 'الواجبات المنزلية',
      value: child.homeworkRate,
      sub: child.homeworkRate === 'N/A' ? 'لا توجد واجبات مسجلة' : 'نسبة تسليم الواجبات',
      icon: BookOpen,
      color: 'blue',
      gradient: 'from-blue-500/20 to-cyan-500/10',
      border: 'border-blue-500/25',
      iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    },
    {
      label: 'حالة الاشتراك الشهري',
      value: child.subscriptionStatus || 'لا يوجد',
      sub: child.subscriptionEndDate ? `ينتهي: ${child.subscriptionEndDate}` : 'لم يُسجل اشتراك بعد',
      icon: CreditCard,
      color: subscriptionColor,
      gradient: `from-${subscriptionColor}-500/20 to-${subscriptionColor}-500/10`,
      border: `border-${subscriptionColor}-500/25`,
      iconBg: `bg-${subscriptionColor}-500/15 border-${subscriptionColor}-500/30 text-${subscriptionColor}-300`,
    },
  ];

  return (
    <div className="space-y-5 max-w-2xl mx-auto lg:max-w-none">

      {/* ── Header Card ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-7"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(59,130,246,0.12) 50%, rgba(15,23,42,0.9) 100%)', backdropFilter: 'blur(20px)' }}
      >
        {/* Glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Parent Info */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-3 py-1 rounded-full mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              بوابة ولي الأمر
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              أهلاً، {parentName || 'ولي الأمر'} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">متابعة شاملة لأداء أبنائك</p>
          </div>

          {/* Child Switcher */}
          {children.length === 1 ? (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                {child.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white text-sm truncate">{child.name}</p>
                <p className="text-xs text-slate-400 truncate">{child.stage}</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl px-4 py-3 transition-all duration-200 cursor-pointer min-w-[180px]"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                  {child.name.charAt(0)}
                </div>
                <div className="flex-1 text-right min-w-0">
                  <p className="font-bold text-white text-sm truncate">{child.name}</p>
                  <p className="text-xs text-slate-400 truncate">{child.stage}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full mt-2 left-0 right-0 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 z-50"
                  >
                    {children.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectChild(c.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-white/5 transition cursor-pointer ${c.id === selectedChildId ? 'bg-purple-500/10' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-sm truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 truncate">{c.stage}</p>
                        </div>
                        {c.id === selectedChildId && <CheckCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Child detail strip */}
        <div className="relative mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
            {child.stage}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            {child.group}
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">كود: {child.code}</span>
          <button onClick={fetchPortalData} className="mr-auto flex items-center gap-1 text-slate-500 hover:text-slate-300 transition cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </button>
        </div>
      </motion.div>

      {/* ── Metric Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={`${selectedChildId}-${i}`}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border bg-gradient-to-br ${m.gradient} ${m.border} p-4 sm:p-5 flex flex-col gap-3`}
            style={{ backdropFilter: 'blur(16px)', background: `linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(15,23,42,0.5) 100%)` }}
          >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${m.iconBg}`}>
              <m.icon className="w-5 h-5" />
            </div>
            {/* Value */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 leading-tight mb-1">{m.label}</p>
              <p className={`text-xl sm:text-2xl font-black leading-tight ${
                m.color === 'emerald' ? 'text-emerald-300' :
                m.color === 'purple' ? 'text-purple-300' :
                m.color === 'blue' ? 'text-blue-300' :
                m.color === 'amber' ? 'text-amber-300' : 'text-rose-300'
              }`}>{m.value}</p>
            </div>
            {/* Sub */}
            <p className="text-[10px] text-slate-500 leading-tight">{m.sub}</p>

            {/* Corner glow */}
            <div className={`absolute -bottom-4 -left-4 w-16 h-16 rounded-full blur-xl opacity-30 ${
              m.color === 'emerald' ? 'bg-emerald-500' :
              m.color === 'purple' ? 'bg-purple-500' :
              m.color === 'blue' ? 'bg-blue-500' :
              m.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
          </motion.div>
        ))}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl border border-white/10 p-5 sm:p-6 space-y-4"
        style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-green-400" />
          </div>
          <h3 className="text-base font-bold text-white">التواصل السريع مع إدارة المنصة</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* WhatsApp inquiry */}
          <button
            onClick={() => openWhatsApp(`السلام عليكم، أنا ولي أمر الطالب ${child.name}. لدي استفسار.`)}
            className="group relative overflow-hidden flex items-center justify-between gap-3 rounded-2xl border border-green-500/25 bg-green-500/10 hover:bg-green-500/20 px-4 py-3.5 text-right transition-all duration-200 cursor-pointer hover:border-green-400/40 hover:shadow-lg hover:shadow-green-500/10"
          >
            <div>
              <p className="font-bold text-white text-sm">إرسال استفسار عبر WhatsApp</p>
              <p className="text-xs text-green-400 mt-0.5">+20 11 00775230</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
          </button>

          {/* Grade report request */}
          <button
            onClick={() => openWhatsApp(`السلام عليكم، أرجو الحصول على تقرير تفصيلي بدرجات الطالب ${child.name} – ${child.stage}.`)}
            className="group relative overflow-hidden flex items-center justify-between gap-3 rounded-2xl border border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-3.5 text-right transition-all duration-200 cursor-pointer hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div>
              <p className="font-bold text-white text-sm">طلب تقرير تفصيلي بالدرجات</p>
              <p className="text-xs text-blue-400 mt-0.5">يُرسل عبر واتساب</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
          </button>

          {/* Subscription renewal */}
          <button
            onClick={() => openWhatsApp(`السلام عليكم، أرغب في تجديد اشتراك الطالب ${child.name} للشهر القادم.`)}
            className="group relative overflow-hidden flex items-center justify-between gap-3 rounded-2xl border border-purple-500/25 bg-purple-500/10 hover:bg-purple-500/20 px-4 py-3.5 text-right transition-all duration-200 cursor-pointer hover:border-purple-400/40 hover:shadow-lg hover:shadow-purple-500/10"
          >
            <div>
              <p className="font-bold text-white text-sm">تجديد الاشتراك الشهري</p>
              <p className="text-xs text-purple-400 mt-0.5">تواصل مباشر مع الإدارة</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <CreditCard className="w-4 h-4 text-purple-400" />
            </div>
          </button>
        </div>
      </motion.div>

      {/* ── Quick Nav Links ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: 'متابعة الأبناء', href: '/parent-portal/children', icon: GraduationCap, color: 'purple' },
          { label: 'سجل الحضور', href: '/parent-portal/attendance', icon: Clock, color: 'emerald' },
          { label: 'الواجبات', href: '/parent-portal/homework', icon: BookOpen, color: 'blue' },
          { label: 'الاشتراكات', href: '/parent-portal/subscription', icon: CreditCard, color: 'amber' },
        ].map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
              item.color === 'purple' ? 'border-purple-500/20 bg-purple-500/8 hover:bg-purple-500/15 hover:border-purple-400/30 hover:shadow-purple-500/10' :
              item.color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/8 hover:bg-emerald-500/15 hover:border-emerald-400/30 hover:shadow-emerald-500/10' :
              item.color === 'blue' ? 'border-blue-500/20 bg-blue-500/8 hover:bg-blue-500/15 hover:border-blue-400/30 hover:shadow-blue-500/10' :
              'border-amber-500/20 bg-amber-500/8 hover:bg-amber-500/15 hover:border-amber-400/30 hover:shadow-amber-500/10'
            }`}
            style={{ backdropFilter: 'blur(12px)', background: 'rgba(15,23,42,0.4)' }}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              item.color === 'purple' ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' :
              item.color === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
              item.color === 'blue' ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' :
              'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">{item.label}</span>
          </Link>
        ))}
      </motion.div>

    </div>
  );
}
