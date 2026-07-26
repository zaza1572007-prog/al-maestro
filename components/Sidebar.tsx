'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  QrCode,
  CalendarDays,
  BookOpenCheck,
  FileSpreadsheet,
  CreditCard,
  Banknote,
  IdCard,
  FolderArchive,
  CheckSquare,
  MessageSquare,
  Clock,
  BarChart3,
  BellRing,
  Settings,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Sparkles,
  Award,
  Layers,
  FileText,
  UserPlus,
  User
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Don't render sidebar on public pages
  if (pathname === '/login' || pathname === '/select-role' || pathname === '/register') return null;

  // Determine portal type
  const isStudentPortal = pathname.startsWith('/student-portal');
  const isParentPortal = pathname.startsWith('/parent-portal');

  // Navigation Items for Teacher / Admin
  const teacherNavItems = [
    { label: 'لوحة التحكم الرئيسي', path: '/dashboard', icon: LayoutDashboard },
    { label: 'طلبات الحجز والتسجيل', path: '/registration-requests', icon: UserPlus },
    { label: 'المراحل الدراسية', path: '/stages', icon: Layers },
    { label: 'المجموعات التعليمية', path: '/groups', icon: Users },
    { label: 'قائمة الطلاب', path: '/students', icon: GraduationCap },
    { label: 'ماسح الـ QR والحضور', path: '/attendance', icon: QrCode },
    { label: 'الجلسات والدروس', path: '/sessions', icon: CalendarDays },
    { label: 'الواجبات والتقييمات', path: '/homework', icon: BookOpenCheck },
    { label: 'الامتحانات والنتائج', path: '/exams', icon: FileSpreadsheet },
    { label: 'الاشتراكات الشهرية', path: '/subscriptions', icon: CreditCard },
    { label: 'المدفوعات والسداد', path: '/payments', icon: Banknote },
    { label: 'طباعة بطاقات الطلاب', path: '/cards', icon: IdCard },
    { label: 'المكتبة والملفات', path: '/files', icon: FolderArchive },
    { label: 'إدارة المهام', path: '/tasks', icon: CheckSquare },
    { label: 'تواصل أولياء الأمور', path: '/parent-comm', icon: MessageSquare },
    { label: 'حضور وتوقيت الموظفين', path: '/staff', icon: Clock },
    { label: 'التقارير والإحصائيات', path: '/reports', icon: BarChart3 },
    { label: 'مركز التنبيهات', path: '/notifications', icon: BellRing },
    { label: 'إعدادات المنصة', path: '/settings', icon: Settings },
  ];

  // Navigation Items for Student
  const studentNavItems = [
    { label: 'لوحة الطالب', path: '/student-portal', icon: LayoutDashboard },
    { label: 'سجل الحضور والغياب', path: '/student-portal/attendance', icon: QrCode },
    { label: 'واجباتي والتقييمات', path: '/student-portal/homework', icon: BookOpenCheck },
    { label: 'امتحاناتي ونتائجي', path: '/student-portal/exams', icon: Award },
    { label: 'اشتراكي المالي', path: '/student-portal/subscription', icon: CreditCard },
    { label: 'المكتبة والملفات', path: '/student-portal/files', icon: FileText },
    { label: 'الإشعارات والتنبيهات', path: '/student-portal/notifications', icon: BellRing },
    { label: 'ملفي الشخصي', path: '/student-portal/profile', icon: User },
  ];

  // Navigation Items for Parent
  const parentNavItems = [
    { label: 'لوحة ولي الأمر', path: '/parent-portal', icon: LayoutDashboard },
    { label: 'متابعة الأبناء', path: '/parent-portal/children', icon: Users },
    { label: 'سجل الحضور والغياب', path: '/parent-portal/attendance', icon: QrCode },
    { label: 'متابعة الواجبات', path: '/parent-portal/homework', icon: BookOpenCheck },
    { label: 'نتائج الامتحانات', path: '/parent-portal/exams', icon: Award },
    { label: 'الاشتراكات والرسوم', path: '/parent-portal/subscription', icon: CreditCard },
    { label: 'التواصل والملاحظات', path: '/parent-portal/messages', icon: MessageSquare },
    { label: 'الإشعارات', path: '/parent-portal/notifications', icon: BellRing },
    { label: 'الملف الشخصي', path: '/parent-portal/profile', icon: User },
  ];

  let currentNavItems = teacherNavItems;
  let portalTitle = "منصة المايسترو";
  let portalSubtitle = "أ. أحمد راضي كحلة";
  let roleBadge = "المعلم والإدارة";

  if (isStudentPortal) {
    currentNavItems = studentNavItems;
    portalTitle = "بوابة الطالب";
    portalSubtitle = "منصة التعلم الذكي";
    roleBadge = "طالب";
  } else if (isParentPortal) {
    currentNavItems = parentNavItems;
    portalTitle = "بوابة ولي الأمر";
    portalSubtitle = "منظومة متابعة الأبناء";
    roleBadge = "ولي أمر";
  }

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 88 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="glass-panel border-r border-y-0 border-l border-white/10 flex flex-col h-screen sticky top-0 no-print select-none z-30 shadow-2xl backdrop-blur-2xl bg-slate-950/80"
    >
      {/* Brand Header & Toggle */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-purple-500/30 border border-white/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="min-w-0"
            >
              <h1 className="font-bold text-base text-white tracking-tight leading-tight truncate">
                {portalTitle}
              </h1>
              <p className="text-xs text-purple-400 font-medium truncate">
                {portalSubtitle}
              </p>
            </motion.div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title={isCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
        {currentNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.path ||
            (item.path !== '/dashboard' &&
              item.path !== '/student-portal' &&
              item.path !== '/parent-portal' &&
              pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              href={item.path}
              className="relative block group"
            >
              <div
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {/* Sliding Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-indigo-600/20 to-transparent border border-purple-500/40 rounded-2xl shadow-lg shadow-purple-500/10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <div
                  className={`relative z-10 p-2 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-inner'
                      : 'text-slate-400 group-hover:text-purple-300'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                </div>

                {!isCollapsed && (
                  <span className="relative z-10 truncate">{item.label}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info & Logout */}
      <div className="p-3 border-t border-white/10 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-md border border-white/20 flex-shrink-0">
              أ
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="font-semibold text-slate-200 text-xs truncate">أحمد راضي</p>
                <span className="inline-block text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  {roleBadge}
                </span>
              </div>
            )}
          </div>
          <Link
            href="/select-role"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-colors"
            title="تبديل الحساب / خروج"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.aside>
  );
}
