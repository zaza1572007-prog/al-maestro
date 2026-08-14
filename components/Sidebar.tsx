'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ToastProvider';
import { useSidebar } from '@/components/SidebarContext';

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
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const toast = useToast();
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [logoScale, setLogoScale] = useState<number>(1.0);

  // Load logo from DB
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        // Fetch configs to get scale
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

    // Listen to logo update event
    const handleUpdate = () => {
      fetchLogo();
    };
    window.addEventListener('maestro-logo-updated', handleUpdate);
    return () => window.removeEventListener('maestro-logo-updated', handleUpdate);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);


  useEffect(() => {
    const fetchUser = () => {
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
          if (data.success) setCurrentUser(data.user);
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
            if (res.ok) {
              setAvatarUrl('/api/settings/branding?type=portrait&t=' + Date.now());
            } else {
              setAvatarUrl(null);
            }
          } catch {
            setAvatarUrl(null);
          }
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

  // Don't render sidebar on public pages
  if (
    pathname === '/login' ||
    pathname === '/select-role' ||
    pathname === '/register' ||
    pathname.startsWith('/parent-report')
  ) return null;

  // Determine portal type
  const isStudentPortal = pathname.startsWith('/student-portal');
  const isParentPortal = pathname.startsWith('/parent-portal');

  // Navigation Items for Teacher / Admin
  interface NavItem { label: string; path: string; icon: any; isComingSoon?: boolean; }

  const teacherNavItems: NavItem[] = [
    { label: 'لوحة التحكم الرئيسي', path: '/dashboard', icon: LayoutDashboard },
    { label: 'طلبات الحجز والتسجيل', path: '/registration-requests', icon: UserPlus },
    { label: 'المراحل الدراسية', path: '/stages', icon: Layers },
    { label: 'المجموعات التعليمية', path: '/groups', icon: Users },
    { label: 'قائمة الطلاب', path: '/students', icon: GraduationCap },
    { label: 'ماسح الـ QR والحضور', path: '/attendance', icon: QrCode },
    { label: 'الواجبات والتقييمات', path: '/homework', icon: BookOpenCheck },
    { label: 'الامتحانات والنتائج', path: '/exams', icon: FileSpreadsheet },
    { label: 'الاشتراكات الشهرية', path: '/subscriptions', icon: CreditCard },
    { label: 'المدفوعات والسداد', path: '/payments', icon: Banknote },
    { label: 'طباعة بطاقات الطلاب', path: '/cards', icon: IdCard },
    { label: 'المكتبة والملفات', path: '/files', icon: FolderArchive },
    { label: 'إدارة المهام', path: '/tasks', icon: CheckSquare },
    { label: 'تواصل أولياء الأمور', path: '/parent-comm', icon: MessageSquare },
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

  if (currentUser?.role === 'STUDENT' || isStudentPortal) {
    currentNavItems = studentNavItems;
    portalTitle = "بوابة الطالب";
    portalSubtitle = "منصة التعلم الذكي";
    roleBadge = "طالب";
  } else if (currentUser?.role === 'PARENT' || isParentPortal) {
    currentNavItems = parentNavItems;
    portalTitle = "بوابة ولي الأمر";
    portalSubtitle = "منظومة متابعة الأبناء";
    roleBadge = "ولي أمر";
  }

  return (
    <>
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 no-print"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <motion.aside
        animate={
          isMobile
            ? { x: isMobileOpen ? 0 : '100%', width: 240 }
            : { x: 0, width: isCollapsed ? 72 : 240 }
        }
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="glass-panel border-r border-y-0 border-l border-white/10 flex flex-col h-screen fixed lg:sticky top-0 right-0 lg:right-auto no-print select-none z-50 lg:z-30 shadow-2xl backdrop-blur-2xl bg-slate-950/80"
      >

      {/* Brand Header & Toggle */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div 
            className="relative flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg border border-white/20 overflow-hidden bg-slate-900"
            style={{
              borderColor: 'rgb(var(--p) / 0.3)',
              boxShadow: '0 4px 15px rgb(var(--p) / 0.25)'
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={logoUrl} 
                alt="اللوجو" 
                className="w-full h-full object-contain p-1 transition-transform duration-300" 
                style={{ transform: `scale(${logoScale})` }}
              />
            ) : (
              <Sparkles className="w-5 h-5 animate-pulse" style={{ color: 'rgb(var(--p))' }} />
            )}
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="min-w-0"
            >
              <h1 className="font-bold text-sm text-white tracking-tight leading-tight truncate">
                {portalTitle}
              </h1>
              <p className="text-[10px] font-medium truncate" style={{ color: 'rgb(var(--p))' }}>
                {portalSubtitle}
              </p>
            </motion.div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title={isCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
        >
          {isCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
        {currentNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.path ||
            (item.path !== '/dashboard' &&
              item.path !== '/student-portal' &&
              item.path !== '/parent-portal' &&
              pathname.startsWith(item.path));

          const handleNavigation = (e: React.MouseEvent) => {
            if (item.isComingSoon) {
              e.preventDefault();
              toast.info('هذه الميزة قريباً في التحديث القادم');
            }
          };

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleNavigation}
              className="relative block group"
            >
              <div
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold text-[13px] transition-all duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {/* Sliding Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 border rounded-xl shadow-lg"
                    style={{
                      background: 'linear-gradient(to left, rgb(var(--p) / 0.25) 0%, rgb(var(--s) / 0.1) 100%)',
                      borderColor: 'rgb(var(--p) / 0.35)',
                      boxShadow: '0 4px 15px rgb(var(--p) / 0.08)'
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <div
                  className={`relative z-10 p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                    isActive
                      ? 'border shadow-inner'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: 'rgb(var(--p) / 0.15)',
                          color: 'rgb(var(--p))',
                          borderColor: 'rgb(var(--p) / 0.3)'
                        }
                      : undefined
                  }
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                </div>

                {!isCollapsed && (
                  <div className="relative z-10 flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.isComingSoon && (
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 ml-1 shrink-0">
                        قريباً
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info & Logout */}
      <div className="p-2.5 border-t border-white/10 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/20 flex-shrink-0 overflow-hidden"
              style={{
                background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, rgb(var(--p)) 0%, rgb(var(--s)) 100%)'
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={currentUser?.name} className="w-full h-full object-cover" />
              ) : (
                currentUser?.name?.charAt(0) || 'أ'
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="font-semibold text-slate-200 text-xs truncate">{currentUser?.name || 'جاري التحميل...'}</p>
                <span 
                  className="inline-block text-[10px] px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'rgb(var(--p) / 0.1)',
                    borderColor: 'rgb(var(--p) / 0.2)',
                    color: 'rgb(var(--p))'
                  }}
                >
                  {roleBadge}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
              } catch {}
              window.location.href = '/select-role';
            }}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
            title="تسجيل الخروج وتبديل الحساب"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.aside>
    </>
  );
}

