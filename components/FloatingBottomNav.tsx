'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  GraduationCap,
  QrCode,
  FileSpreadsheet,
  Menu,
  BookOpenCheck,
  Award,
  User,
  Users,
  CreditCard,
  ScanLine
} from 'lucide-react';
import { useSidebar } from '@/components/SidebarContext';
import { playPopClick, initAudioUnlock } from '@/lib/sound-fx';
import { triggerHaptic } from '@/lib/haptics';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  isAction?: boolean;
  isRaisedFab?: boolean;
}

export default function FloatingBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleMobileOpen, isMobileOpen } = useSidebar();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initAudioUnlock();

    const fetchUser = () => {
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setCurrentUser(data.user);
        })
        .catch(() => {});
    };
    fetchUser();
    window.addEventListener('maestro-profile-updated', fetchUser);
    return () => window.removeEventListener('maestro-profile-updated', fetchUser);
  }, []);

  // Detect virtual keyboard opening via visualViewport
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const initialHeight = window.visualViewport.height;

    const handleResize = () => {
      if (!window.visualViewport) return;
      // If viewport shrinks by more than 140px, virtual keyboard is open
      const diff = initialHeight - window.visualViewport.height;
      setIsKeyboardOpen(diff > 140);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select')) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => setIsKeyboardOpen(false), 150);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  if (!isMounted) return null;

  // Hide on public/isolated auth and print pages
  if (
    pathname === '/login' ||
    pathname === '/select-role' ||
    pathname === '/register' ||
    pathname === '/qr-login' ||
    pathname === '/qr-print' ||
    pathname === '/cards' ||
    pathname.startsWith('/parent-report')
  ) {
    return null;
  }

  const isStudentPortal = pathname.startsWith('/student-portal');
  const isParentPortal = pathname.startsWith('/parent-portal');

  // Define role-specific items
  let navItems: NavItem[] = [];

  if (currentUser?.role === 'STUDENT' || isStudentPortal) {
    navItems = [
      { id: 'home', label: 'الرئيسية', path: '/student-portal', icon: LayoutDashboard },
      { id: 'attendance', label: 'حضوري', path: '/student-portal/attendance', icon: QrCode },
      { id: 'homework', label: 'واجباتي', path: '/student-portal/homework', icon: BookOpenCheck },
      { id: 'exams', label: 'امتحاناتي', path: '/student-portal/exams', icon: Award },
      { id: 'profile', label: 'حسابي', path: '/student-portal/profile', icon: User },
    ];
  } else if (currentUser?.role === 'PARENT' || isParentPortal) {
    navItems = [
      { id: 'home', label: 'الرئيسية', path: '/parent-portal', icon: LayoutDashboard },
      { id: 'children', label: 'الأبناء', path: '/parent-portal/children', icon: Users },
      { id: 'attendance', label: 'الحضور', path: '/parent-portal/attendance', icon: QrCode },
      { id: 'exams', label: 'الامتحانات', path: '/parent-portal/exams', icon: Award },
      { id: 'profile', label: 'حسابي', path: '/parent-portal/profile', icon: User },
    ];
  } else {
    // Teacher / Assistant / Admin
    navItems = [
      { id: 'dashboard', label: 'الرئيسية', path: '/dashboard', icon: LayoutDashboard },
      { id: 'students', label: 'الطلاب', path: '/students', icon: GraduationCap },
      {
        id: 'attendance',
        label: 'مسح الحضور',
        path: '/attendance',
        icon: ScanLine,
        isRaisedFab: true,
      },
      { id: 'exams', label: 'الامتحانات', path: '/exams', icon: FileSpreadsheet },
      { id: 'more', label: 'المزيد', path: '__more__', icon: Menu, isAction: true },
    ];
  }

  // Active check supporting sub-routes
  const isItemActive = (item: NavItem) => {
    if (item.isAction) return isMobileOpen;
    if (item.path === '/dashboard' || item.path === '/student-portal' || item.path === '/parent-portal') {
      return pathname === item.path;
    }
    return pathname.startsWith(item.path);
  };

  const handleItemClick = (item: NavItem) => {
    playPopClick();
    triggerHaptic('selection');

    if (item.isAction && item.id === 'more') {
      toggleMobileOpen();
    }
  };

  return (
    <AnimatePresence>
      {!isKeyboardOpen && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="fixed bottom-3 inset-x-0 z-40 flex justify-center items-center pointer-events-none lg:hidden no-print px-3"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div
            className="pointer-events-auto relative flex items-center justify-around w-full max-w-[420px] h-[64px] px-2 rounded-full shadow-2xl border border-white/10"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(9, 11, 26, 0.94) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.7), 0 0 20px 0 rgba(59, 130, 246, 0.15)',
              touchAction: 'manipulation',
            }}
          >
            {navItems.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;

              // Raised Center Floating Action Button (FAB)
              if (item.isRaisedFab) {
                return (
                  <div key={item.id} className="relative -top-5 flex flex-col items-center">
                    <Link
                      href={item.path}
                      onClick={() => handleItemClick(item)}
                      className="relative group outline-none"
                    >
                      {/* Glow Pulse */}
                      <div
                        className="absolute inset-0 rounded-full animate-pulse blur-md"
                        style={{
                          background: 'linear-gradient(135deg, rgb(var(--p) / 0.8), rgb(var(--s) / 0.8))',
                        }}
                      />

                      <motion.div
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl border-2 transition-all ${
                          active
                            ? 'border-white shadow-blue-500/50'
                            : 'border-white/30 hover:border-white'
                        }`}
                        style={{
                          background: 'linear-gradient(135deg, rgb(var(--p)), rgb(var(--s)))',
                          boxShadow: '0 8px 24px -2px rgba(59, 130, 246, 0.5)',
                        }}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </motion.div>
                    </Link>
                    <span
                      className={`text-[9px] font-bold mt-1 tracking-tight transition-colors ${
                        active ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              }

              // Normal Nav Button
              const content = (
                <div
                  className="relative flex flex-col items-center justify-center w-14 h-12 rounded-2xl cursor-pointer select-none transition-colors"
                  onClick={() => handleItemClick(item)}
                >
                  {/* Active Indicator Glow Background */}
                  {active && (
                    <motion.div
                      layoutId="bottom-nav-active-pill"
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.18) 0%, rgba(147, 51, 234, 0.08) 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                      }}
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}

                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    animate={{ scale: active ? 1.05 : 1 }}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors duration-200 ${
                        active ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-medium mt-0.5 transition-colors duration-200 ${
                        active ? 'text-blue-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </div>
              );

              if (item.isAction) {
                return (
                  <button key={item.id} type="button" className="outline-none">
                    {content}
                  </button>
                );
              }

              return (
                <Link key={item.id} href={item.path} className="outline-none">
                  {content}
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
