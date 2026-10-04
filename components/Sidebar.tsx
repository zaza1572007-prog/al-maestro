'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ToastProvider';
import { useSidebar } from '@/components/SidebarContext';
import { hasPermission } from '@/lib/permissions';

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
  ChevronDown,
  LogOut,
  Sparkles,
  Award,
  Layers,
  FileText,
  UserPlus,
  User,
  ClipboardList,
  ShieldCheck,
  Compass,
  SlidersHorizontal
} from 'lucide-react';

// ── Nav item separator marker ──
const SEPARATOR = '__sep__';

export type SidebarStyle = 'grouped' | 'classic';

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  isComingSoon?: boolean;
  badge?: string | number;
  badgeColor?: 'amber' | 'purple' | 'emerald' | 'blue';
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const toast = useToast();
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState<number>(1.0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Sidebar Layout Style ('grouped' | 'classic')
  const [sidebarStyle, setSidebarStyle] = useState<SidebarStyle>('grouped');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Dynamic live badges data
  const [pendingRegistrations, setPendingRegistrations] = useState<number>(0);

  // Sync sidebar style from localStorage & event listener
  useEffect(() => {
    try {
      const saved = localStorage.getItem('maestro_sidebar_style') as SidebarStyle;
      if (saved === 'classic' || saved === 'grouped') {
        setSidebarStyle(saved);
      }
    } catch {}

    const handleStyleChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && (customEvent.detail === 'classic' || customEvent.detail === 'grouped')) {
        setSidebarStyle(customEvent.detail);
      }
    };

    window.addEventListener('maestro-sidebar-style-changed', handleStyleChange);
    return () => window.removeEventListener('maestro-sidebar-style-changed', handleStyleChange);
  }, []);

  // Fetch live stats for badges (e.g. pending registration requests)
  useEffect(() => {
    const fetchStats = async () => {
      if (currentUser?.role === 'OWNER' || currentUser?.role === 'ASSISTANT') {
        try {
          const res = await fetch('/api/dashboard/stats');
          const data = await res.json();
          if (data.success && data.stats) {
            setPendingRegistrations(data.stats.pendingRegistrations || 0);
          }
        } catch {}
      }
    };
    fetchStats();
  }, [currentUser]);

  // Load logo from DB
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const settingsRes = await fetch('/api/settings');
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.settings && settingsData.settings.logoScale !== undefined) {
          setLogoScale(settingsData.settings.logoScale);
        }
        const res = await fetch('/api/settings/branding?type=logo', { method: 'HEAD' });
        if (res.ok) {
          setLogoUrl('/api/settings/branding?type=logo&t=' + Date.now());
        }
      } catch {}
    };
    fetchLogo();
    const handleUpdate = () => fetchLogo();
    window.addEventListener('maestro-logo-updated', handleUpdate);
    return () => window.removeEventListener('maestro-logo-updated', handleUpdate);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  useEffect(() => {
    const fetchUser = () => {
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setCurrentUser(data.user);
          } else if (data.error && data.error.includes('معطل')) {
            window.location.href = '/login';
          }
        })
        .catch(console.error);
    };
    fetchUser();
    window.addEventListener('maestro-profile-updated', fetchUser);
    return () => window.removeEventListener('maestro-profile-updated', fetchUser);
  }, []);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkAvatar = async () => {
      if (currentUser) {
        if (currentUser.role === 'OWNER' || currentUser.role === 'ASSISTANT') {
          try {
            const res = await fetch('/api/settings/branding?type=portrait', { method: 'HEAD' });
            setAvatarUrl(res.ok ? '/api/settings/branding?type=portrait&t=' + Date.now() : null);
          } catch { setAvatarUrl(null); }
        } else if (currentUser.role === 'STUDENT' && currentUser.profileImage) {
          setAvatarUrl(currentUser.profileImage);
        } else {
          setAvatarUrl(null);
        }
      }
    };
    checkAvatar();
    window.addEventListener('maestro-profile-updated', checkAvatar);
    window.addEventListener('maestro-portrait-updated', checkAvatar);
    return () => {
      window.removeEventListener('maestro-profile-updated', checkAvatar);
      window.removeEventListener('maestro-portrait-updated', checkAvatar);
    };
  }, [currentUser]);

  if (
    pathname === '/login' ||
    pathname === '/select-role' ||
    pathname === '/register' ||
    pathname.startsWith('/parent-report') ||
    pathname.startsWith('/quiz')
  ) return null;

  const isStudentPortal = pathname.startsWith('/student-portal');
  const isParentPortal = pathname.startsWith('/parent-portal');

  // ── 1. TEACHER NAV DEFINITIONS ──
  const teacherSections: NavSection[] = [
    {
      id: 'main',
      title: 'الرئيسية والقبول',
      items: [
        { label: 'لوحة التحكم الرئيسي', path: '/dashboard', icon: LayoutDashboard },
        {
          label: 'طلبات الحجز والتسجيل',
          path: '/registration-requests',
          icon: UserPlus,
          badge: pendingRegistrations > 0 ? pendingRegistrations : undefined,
          badgeColor: 'amber',
        },
      ],
    },
    {
      id: 'academic',
      title: 'الشؤون الأكاديمية',
      items: [
        { label: 'المراحل الدراسية', path: '/stages', icon: Layers },
        { label: 'المجموعات التعليمية', path: '/groups', icon: Users },
        { label: 'قائمة الطلاب', path: '/students', icon: GraduationCap },
      ],
    },
    {
      id: 'daily',
      title: 'العمليات والمتابعة اليومية',
      items: [
        { label: 'ماسح الـ QR والحضور', path: '/attendance', icon: QrCode },
        { label: 'تحصيل غياب اليوم', path: '/daily-attendance', icon: ClipboardList },
        { label: 'الواجبات والتقييمات', path: '/homework', icon: BookOpenCheck },
        { label: 'الامتحانات والنتائج', path: '/exams', icon: FileSpreadsheet },
      ],
    },
    {
      id: 'finance',
      title: 'الماليات والطباعة',
      items: [
        { label: 'الاشتراكات الشهرية', path: '/subscriptions', icon: CreditCard },
        { label: 'المدفوعات والسداد', path: '/payments', icon: Banknote },
        { label: 'طباعة بطاقات الطلاب', path: '/cards', icon: IdCard },
        { label: 'طباعة QR', path: '/qr-print', icon: QrCode },
      ],
    },
    {
      id: 'admin',
      title: 'الإدارة والتواصل',
      items: [
        { label: 'المكتبة والملفات', path: '/files', icon: FolderArchive },
        { label: 'إدارة المهام', path: '/tasks', icon: CheckSquare },
        { label: 'فريق المساعدين والصلاحيات', path: '/assistants', icon: ShieldCheck },
        { label: 'تواصل أولياء الأمور', path: '/parent-comm', icon: MessageSquare },
        { label: 'التقارير والإحصائيات', path: '/reports', icon: BarChart3 },
        { label: 'مركز التنبيهات', path: '/notifications', icon: BellRing },
        { label: 'إعدادات المنصة', path: '/settings', icon: Settings },
      ],
    },
  ];

  // ── 2. STUDENT NAV DEFINITIONS ──
  const studentSections: NavSection[] = [
    {
      id: 'student_learn',
      title: 'التعلم والمتابعة',
      items: [
        { label: 'لوحة الطالب', path: '/student-portal', icon: LayoutDashboard },
        { label: 'سجل الحضور والغياب', path: '/student-portal/attendance', icon: QrCode },
        { label: 'واجباتي والتقييمات', path: '/student-portal/homework', icon: BookOpenCheck },
        { label: 'امتحاناتي ونتائجي', path: '/student-portal/exams', icon: Award },
      ],
    },
    {
      id: 'student_services',
      title: 'الخدمات والملف الشخصي',
      items: [
        { label: 'اشتراكي المالي', path: '/student-portal/subscription', icon: CreditCard },
        { label: 'المكتبة والملفات', path: '/student-portal/files', icon: FileText },
        { label: 'الإشعارات والتنبيهات', path: '/student-portal/notifications', icon: BellRing },
        { label: 'ملفي الشخصي', path: '/student-portal/profile', icon: User },
      ],
    },
  ];

  // ── 3. PARENT NAV DEFINITIONS ──
  const parentSections: NavSection[] = [
    {
      id: 'parent_track',
      title: 'متابعة الأبناء',
      items: [
        { label: 'لوحة ولي الأمر', path: '/parent-portal', icon: LayoutDashboard },
        { label: 'متابعة الأبناء', path: '/parent-portal/children', icon: Users },
        { label: 'سجل الحضور والغياب', path: '/parent-portal/attendance', icon: QrCode },
        { label: 'متابعة الواجبات', path: '/parent-portal/homework', icon: BookOpenCheck },
        { label: 'نتائج الامتحانات', path: '/parent-portal/exams', icon: Award },
      ],
    },
    {
      id: 'parent_services',
      title: 'الماليات والتواصل',
      items: [
        { label: 'الاشتراكات والرسوم', path: '/parent-portal/subscription', icon: CreditCard },
        { label: 'التواصل والملاحظات', path: '/parent-portal/messages', icon: MessageSquare },
        { label: 'الإشعارات', path: '/parent-portal/notifications', icon: BellRing },
        { label: 'الملف الشخصي', path: '/parent-portal/profile', icon: User },
      ],
    },
  ];

  // ── 4. ASSISTANT FILTERING ──
  let assistantSections: NavSection[] = [];
  if (currentUser?.role === 'ASSISTANT') {
    const mainItems: NavItem[] = [{ label: 'لوحة تحكم المساعد', path: '/assistant-portal', icon: LayoutDashboard }];
    const canRegistrations = hasPermission(currentUser, 'registrations.view') || hasPermission(currentUser, 'registrations.manage');
    if (canRegistrations) {
      mainItems.push({
        label: 'طلبات الحجز والتسجيل',
        path: '/registration-requests',
        icon: UserPlus,
        badge: pendingRegistrations > 0 ? pendingRegistrations : undefined,
        badgeColor: 'amber',
      });
    }

    const academicItems: NavItem[] = [];
    if (hasPermission(currentUser, 'groups.view_all') || hasPermission(currentUser, 'groups.manage')) academicItems.push({ label: 'المراحل الدراسية', path: '/stages', icon: Layers });
    if (hasPermission(currentUser, 'groups.view_all') || hasPermission(currentUser, 'groups.view_assigned') || hasPermission(currentUser, 'groups.manage')) academicItems.push({ label: 'المجموعات التعليمية', path: '/groups', icon: Users });
    if (hasPermission(currentUser, 'students.view') || hasPermission(currentUser, 'students.create') || hasPermission(currentUser, 'students.edit')) academicItems.push({ label: 'قائمة الطلاب', path: '/students', icon: GraduationCap });

    const dailyItems: NavItem[] = [];
    if (hasPermission(currentUser, 'attendance.scan') || hasPermission(currentUser, 'attendance.manual')) dailyItems.push({ label: 'ماسح الـ QR والحضور', path: '/attendance', icon: QrCode });
    if (hasPermission(currentUser, 'attendance.daily')) dailyItems.push({ label: 'تحصيل غياب اليوم', path: '/daily-attendance', icon: ClipboardList });
    if (hasPermission(currentUser, 'homework.manage')) dailyItems.push({ label: 'الواجبات والتقييمات', path: '/homework', icon: BookOpenCheck });
    if (hasPermission(currentUser, 'exams.manage')) dailyItems.push({ label: 'الامتحانات والنتائج', path: '/exams', icon: FileSpreadsheet });

    const financeItems: NavItem[] = [];
    if (hasPermission(currentUser, 'subscriptions.view') || hasPermission(currentUser, 'subscriptions.manage')) financeItems.push({ label: 'الاشتراكات الشهرية', path: '/subscriptions', icon: CreditCard });
    if (hasPermission(currentUser, 'payments.collect')) financeItems.push({ label: 'المدفوعات والسداد', path: '/payments', icon: Banknote });
    if (hasPermission(currentUser, 'cards.print')) financeItems.push({ label: 'طباعة بطاقات الطلاب', path: '/cards', icon: IdCard });
    if (hasPermission(currentUser, 'qr.print')) financeItems.push({ label: 'طباعة QR', path: '/qr-print', icon: QrCode });

    const adminItems: NavItem[] = [];
    if (hasPermission(currentUser, 'files.manage')) adminItems.push({ label: 'المكتبة والملفات', path: '/files', icon: FolderArchive });
    if (hasPermission(currentUser, 'tasks.manage')) adminItems.push({ label: 'إدارة المهام', path: '/tasks', icon: CheckSquare });
    if (hasPermission(currentUser, 'parent_comm.manage')) adminItems.push({ label: 'تواصل أولياء الأمور', path: '/parent-comm', icon: MessageSquare });
    if (hasPermission(currentUser, 'reports.view')) adminItems.push({ label: 'التقارير والإحصائيات', path: '/reports', icon: BarChart3 });
    if (hasPermission(currentUser, 'notifications.send')) adminItems.push({ label: 'مركز التنبيهات', path: '/notifications', icon: BellRing });

    assistantSections = [
      { id: 'main', title: 'الرئيسية والقبول', items: mainItems },
      ...(academicItems.length > 0 ? [{ id: 'academic', title: 'الشؤون الأكاديمية', items: academicItems }] : []),
      ...(dailyItems.length > 0 ? [{ id: 'daily', title: 'العمليات والمتابعة اليومية', items: dailyItems }] : []),
      ...(financeItems.length > 0 ? [{ id: 'finance', title: 'الماليات والطباعة', items: financeItems }] : []),
      ...(adminItems.length > 0 ? [{ id: 'admin', title: 'الإدارة والتقارير', items: adminItems }] : []),
    ];
  }

  // Active portal details
  let activeSections: NavSection[] = teacherSections;
  let portalTitle = "منصة المايسترو";
  let portalSubtitle = "أ. أحمد راضي كحلة";
  let roleBadge = "المعلم والإدارة";

  if (currentUser?.role === 'STUDENT' || isStudentPortal) {
    activeSections = studentSections;
    portalTitle = "بوابة الطالب";
    portalSubtitle = "منصة التعلم الذكي";
    roleBadge = "طالب";
  } else if (currentUser?.role === 'PARENT' || isParentPortal) {
    activeSections = parentSections;
    portalTitle = "بوابة ولي الأمر";
    portalSubtitle = "منظومة متابعة الأبناء";
    roleBadge = "ولي أمر";
  } else if (currentUser?.role === 'ASSISTANT') {
    activeSections = assistantSections;
    portalTitle = "بوابة المساعد";
    portalSubtitle = currentUser.name || "الكادر الإداري";
    roleBadge = "مساعد معتمد";
  }

  // Flattened for Classic View
  const classicFlatItems: (NavItem | typeof SEPARATOR)[] = [];
  activeSections.forEach((sec, idx) => {
    if (idx > 0) classicFlatItems.push(SEPARATOR);
    sec.items.forEach((item) => classicFlatItems.push(item));
  });

  const toggleSection = (secId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const renderSingleNavItem = (navItem: NavItem) => {
    const Icon = navItem.icon;
    const isActive =
      pathname === navItem.path ||
      (navItem.path !== '/dashboard' &&
        navItem.path !== '/student-portal' &&
        navItem.path !== '/parent-portal' &&
        pathname.startsWith(navItem.path));

    const handleNavigation = (e: React.MouseEvent) => {
      if (navItem.isComingSoon) {
        e.preventDefault();
        toast.info('هذه الميزة قريباً في التحديث القادم');
      }
    };

    return (
      <div key={navItem.path} className="relative">
        <Link
          href={navItem.path}
          onClick={handleNavigation}
          onMouseEnter={() => setHoveredItem(navItem.path)}
          onMouseLeave={() => setHoveredItem(null)}
          className="relative block group"
        >
          <div
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-semibold text-[13px] transition-all duration-200 relative overflow-hidden ${
              isActive
                ? 'text-white font-bold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.03]'
            }`}
          >
            {/* Active Neon Glow & Indicator on right */}
            {isActive && (
              <>
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `linear-gradient(to left, rgb(var(--p) / 0.24) 0%, rgb(var(--s) / 0.08) 100%)`,
                    border: `1px solid rgb(var(--p) / 0.35)`,
                    boxShadow: `0 0 20px rgb(var(--p) / 0.15)`,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
                {/* Right Neon Edge Accent Bar */}
                <div
                  className="absolute right-0 top-1.5 bottom-1.5 w-[3.5px] rounded-l-full shadow-sm"
                  style={{
                    background: `linear-gradient(to bottom, rgb(var(--p)), rgb(var(--s)))`,
                    boxShadow: `0 0 10px rgb(var(--p))`,
                  }}
                />
              </>
            )}

            {/* Hover background */}
            {!isActive && hoveredItem === navItem.path && (
              <motion.div
                layoutId="sidebar-hover-indicator"
                className="absolute inset-0 rounded-xl bg-white/[0.04]"
                transition={{ duration: 0.15 }}
              />
            )}

            {/* Icon Box */}
            <div
              className={`relative z-10 p-1.5 rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${
                isActive
                  ? 'border shadow-inner'
                  : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-white/[0.05]'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: 'rgb(var(--p) / 0.2)',
                      color: 'rgb(var(--p))',
                      borderColor: 'rgb(var(--p) / 0.4)',
                      boxShadow: `0 0 12px rgb(var(--p) / 0.3)`,
                    }
                  : undefined
              }
            >
              <motion.div
                whileHover={{ scale: 1.15, rotate: isActive ? 0 : 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Icon className="w-[17px] h-[17px] flex-shrink-0" />
              </motion.div>
            </div>

            {/* Label & Dynamic Badges */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative z-10 flex-1 flex items-center justify-between min-w-0 overflow-hidden"
                >
                  <span className="truncate">{navItem.label}</span>
                  {navItem.isComingSoon && (
                    <span className="text-[9px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/80 ml-1 shrink-0">
                      قريباً
                    </span>
                  )}
                  {navItem.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold ml-1 shrink-0 border ${
                        navItem.badgeColor === 'amber'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}
                    >
                      {navItem.badge}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Link>

        {/* Collapsed Tooltip */}
        {isCollapsed && hoveredItem === navItem.path && (
          <div
            className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap z-[100] pointer-events-none flex items-center gap-1.5"
            style={{
              background: 'rgba(15,23,42,0.97)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <span>{navItem.label}</span>
            {navItem.badge !== undefined && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                {navItem.badge}
              </span>
            )}
            <div
              className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 rotate-45"
              style={{
                background: 'rgba(15,23,42,0.97)',
                borderRight: '1px solid rgba(255,255,255,0.12)',
                borderBottom: '1px solid rgba(255,255,255,0.12)',
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 no-print"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <motion.aside
        animate={
          isMobile
            ? { x: isMobileOpen ? 0 : '100%', width: 256 }
            : { x: 0, width: isCollapsed ? 72 : 256 }
        }
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col h-screen fixed lg:sticky top-0 right-0 lg:right-auto no-print select-none z-50 lg:z-30 shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(9,11,26,0.97) 0%, rgba(6,9,19,0.98) 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Top glow accent line */}
        <div
          className="h-[2px] w-full shrink-0"
          style={{
            background: `linear-gradient(to left, transparent, rgb(var(--p) / 0.7), rgb(var(--s) / 0.5), transparent)`,
          }}
        />

        {/* Brand Header */}
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg border overflow-hidden cursor-pointer"
              style={{
                background: logoUrl ? 'rgba(15,23,42,0.9)' : `linear-gradient(135deg, rgb(var(--p) / 0.9), rgb(var(--s) / 0.7))`,
                borderColor: 'rgb(var(--p) / 0.4)',
                boxShadow: '0 4px 15px rgb(var(--p) / 0.3)',
              }}
              onClick={() => router.push('/dashboard')}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="اللوجو"
                  className="w-full h-full object-contain p-1"
                  style={{ transform: `scale(${logoScale})` }}
                />
              ) : (
                <Sparkles className="w-5 h-5" style={{ color: '#fff' }} />
              )}
            </motion.div>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0"
                >
                  <h1 className="font-bold text-sm text-white tracking-tight leading-tight truncate">
                    {portalTitle}
                  </h1>
                  <p className="text-[10px] font-semibold truncate" style={{ color: 'rgb(var(--p))' }}>
                    {portalSubtitle}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg border text-slate-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
            title={isCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          >
            {isCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </motion.button>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {sidebarStyle === 'grouped' ? (
            /* ── GROUPED & MODERN LAYOUT ── */
            activeSections.map((sec, secIdx) => {
              const isSecCollapsed = !!collapsedSections[sec.id];
              return (
                <div key={sec.id} className="space-y-0.5 mb-2">
                  {/* Section Title Header */}
                  {!isCollapsed ? (
                    <div
                      onClick={() => toggleSection(sec.id)}
                      className="flex items-center justify-between px-2 pt-2.5 pb-1 text-[11px] font-bold text-slate-400 hover:text-slate-200 cursor-pointer transition select-none group"
                    >
                      <span className="flex items-center gap-1.5 tracking-wide">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: 'rgb(var(--p) / 0.7)' }}
                        />
                        <span>{sec.title}</span>
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-slate-500 transition-transform duration-200 group-hover:text-slate-300 ${
                          isSecCollapsed ? '-rotate-90' : ''
                        }`}
                      />
                    </div>
                  ) : (
                    secIdx > 0 && <div className="my-2 mx-2 h-[1px] bg-white/[0.06]" />
                  )}

                  {/* Section Items */}
                  <AnimatePresence initial={false}>
                    {(!isSecCollapsed || isCollapsed) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-0.5 overflow-hidden"
                      >
                        {sec.items.map(renderSingleNavItem)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            /* ── CLASSIC FLAT LIST LAYOUT ── */
            classicFlatItems.map((item, idx) => {
              if (item === SEPARATOR) {
                return isCollapsed ? (
                  <div key={`sep-${idx}`} className="my-2 mx-2 h-[1px] bg-white/[0.06]" />
                ) : (
                  <div key={`sep-${idx}`} className="section-divider my-1.5 mx-1" />
                );
              }
              return renderSingleNavItem(item as NavItem);
            })
          )}
        </nav>

        {/* Modern Floating Profile Card Footer */}
        <div
          className="p-2.5 shrink-0"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(6,9,19,0.3) 0%, rgba(6,9,19,0.9) 100%)',
          }}
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/15 flex-shrink-0 overflow-hidden"
                  style={{
                    background: avatarUrl
                      ? 'transparent'
                      : `linear-gradient(135deg, rgb(var(--p)) 0%, rgb(var(--s)) 100%)`,
                    boxShadow: '0 2px 10px rgb(var(--p) / 0.3)',
                  }}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={currentUser?.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.name?.charAt(0) || 'أ'
                  )}
                </motion.div>
                {/* Live Online Badge */}
                <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              </div>

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="min-w-0"
                  >
                    <p className="font-semibold text-slate-200 text-xs truncate">
                      {currentUser?.name || 'جاري التحميل...'}
                    </p>
                    <span
                      className="inline-block text-[10px] px-2 py-0.5 rounded-full border font-semibold mt-0.5"
                      style={{
                        backgroundColor: 'rgb(var(--p) / 0.12)',
                        borderColor: 'rgb(var(--p) / 0.25)',
                        color: 'rgb(var(--p))',
                      }}
                    >
                      {roleBadge}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={async () => {
                const role = currentUser?.role;
                try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
                if (role === 'OWNER' || role === 'ASSISTANT') {
                  window.location.href = '/login?role=TEACHER';
                } else {
                  window.location.href = '/select-role';
                }
              }}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
