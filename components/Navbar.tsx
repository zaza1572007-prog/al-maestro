'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Search,
  Bell,
  Calendar,
  User,
  Settings,
  LogOut,
  Sparkles,
  ChevronDown,
  Menu,
  Clock,
  Palette
} from 'lucide-react';
import { useSidebar } from '@/components/SidebarContext';
import { NetworkStatusBadge, PwaInstallButton } from '@/components/PwaStatusManager';
import ThemeCustomizerModal from '@/components/ThemeCustomizerModal';


export default function Navbar() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendarQuick, setShowCalendarQuick] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toggleMobileOpen } = useSidebar();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success && data.notifications) {
        const formatted = data.notifications.map((n: any) => ({
          id: n.id,
          title: n.title,
          desc: n.message,
          time: new Date(n.createdAt).toLocaleDateString('ar-EG', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          unread: !n.isRead,
        }));
        setNotificationsList(formatted);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const fetchTodaySessions = async () => {
    try {
      const res = await fetch('/api/attendance/today-groups');
      const data = await res.json();
      if (data.success && data.groups) {
        setTodaySessions(data.groups);
      }
    } catch (err) {
      console.error('Failed to load today groups:', err);
    }
  };

  useEffect(() => {
    // Hide navbar on public pages
    if (pathname === '/login' || pathname === '/select-role' || pathname === '/register') return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    if (showCalendarQuick) {
      fetchTodaySessions();
    }
  }, [showCalendarQuick]);

  const to12h = (time24: string): string => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const period = h >= 12 ? 'م' : 'ص';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${m} ${period}`;
  };

  // Hide Navbar completely on public pages: Login, Role Selection, and Student Registration
  if (
    pathname === '/login' ||
    pathname === '/select-role' ||
    pathname === '/register' ||
    pathname.startsWith('/parent-report')
  ) return null;

  const markAllRead = async () => {
    try {
      const unread = notificationsList.filter(n => n.unread);
      await Promise.all(
        unread.map(n =>
          fetch(`/api/notifications/${n.id}`, {
            method: 'PATCH',
          })
        )
      );
      setNotificationsList(prev => prev.map(n => ({ ...n, unread: false })));
    } catch (e) {
      console.error(e);
    }
  };

  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const update = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <header
      className="h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 no-print"
      style={{
        background: 'rgba(6,9,19,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 1px 30px rgba(0,0,0,0.4)',
      }}
    >
      {/* Right side: Hamburger + Search */}
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleMobileOpen}
          className="p-2 rounded-xl border text-slate-300 hover:text-white transition-all lg:hidden cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
          title="القائمة"
        >
          <Menu className="w-5 h-5" />
        </motion.button>

        {/* Command Palette Trigger Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          onClick={() => document.getElementById('command-palette-trigger')?.click()}
          className="hidden sm:flex items-center gap-3 w-64 md:w-80 px-3 py-2 rounded-xl text-sm text-slate-500 cursor-pointer transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          title="فتح لوحة الأوامر (Ctrl+K)"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-right text-[13px]">البحث في المنصة...</span>
          <div className="flex items-center gap-1 shrink-0">
            <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgb(var(--p) / 0.8)' }}>
              Ctrl+K
            </kbd>
          </div>
        </motion.button>
      </div>


      {/* Action Icons & Network Status */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Network Status Badge */}
        <div className="hidden sm:flex">
          <NetworkStatusBadge size="sm" />
        </div>

        {/* Live clock */}
        {currentTime && (
          <div
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgb(var(--p))',
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{currentTime}</span>
          </div>
        )}
        {/* Notification Bell */}
        <div 
          className="relative"
          onMouseEnter={() => {
            setShowNotifications(true);
            setShowCalendarQuick(false);
            setShowProfileMenu(false);
          }}
          onMouseLeave={() => setShowNotifications(false)}
        >
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
            style={{
              background: showNotifications ? 'rgb(var(--p) / 0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showNotifications ? 'rgb(var(--p) / 0.35)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: showNotifications ? `0 0 16px rgb(var(--p) / 0.2)` : 'none',
            }}
            title="التنبيهات"
          >
            <Bell className="w-4.5 h-4.5" />
            {notificationsList.some((n) => n.unread) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-950 animate-pulse" />
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute left-0 mt-3 w-80 glass-panel border border-white/15 rounded-3xl shadow-2xl p-4 z-50 space-y-3 bg-slate-950/90"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-400" />
                    التنبيهات
                  </h4>
                  <button onClick={markAllRead} className="text-[11px] text-purple-400 hover:underline">
                    تحديد كمرئي
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notificationsList.map((n) => (
                    <div
                      key={n.id}
                      onClick={async () => {
                        if (n.unread) {
                          try {
                            await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' });
                            setNotificationsList(prev =>
                              prev.map(item => (item.id === n.id ? { ...item, unread: false } : item))
                            );
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className={`p-3 rounded-2xl border text-xs transition-all cursor-pointer hover:border-purple-500/20 ${
                        n.unread
                          ? 'bg-purple-950/30 border-purple-500/30 text-slate-200'
                          : 'bg-white/5 border-white/5 text-slate-400'
                      }`}
                    >
                      <p className="font-bold text-white mb-1 flex items-center gap-1.5 justify-between">
                        <span>{n.title}</span>
                        {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                      </p>
                      <p className="leading-relaxed">{n.desc}</p>
                      <span className="text-[10px] text-slate-500 block mt-2">{n.time}</span>
                    </div>
                  ))}
                  {notificationsList.length === 0 && (
                    <p className="text-slate-500 text-center py-4 text-xs">لا توجد تنبيهات حالياً</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Calendar */}
        <div 
          className="relative"
          onMouseEnter={() => {
            setShowCalendarQuick(true);
            setShowNotifications(false);
            setShowProfileMenu(false);
          }}
          onMouseLeave={() => setShowCalendarQuick(false)}
        >
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowCalendarQuick(!showCalendarQuick)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
            style={{
              background: showCalendarQuick ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showCalendarQuick ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: showCalendarQuick ? '0 0 16px rgba(59,130,246,0.2)' : 'none',
            }}
            title="جدول الحصص السريع"
          >
            <Calendar className="w-4.5 h-4.5" />
          </motion.button>

          <AnimatePresence>
            {showCalendarQuick && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute left-0 mt-3 w-80 glass-panel border border-white/15 rounded-3xl shadow-2xl p-4 z-50 space-y-3 bg-slate-950/90"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    حصص اليوم
                  </h4>
                  <Link href="/calendar" className="text-[11px] text-blue-400 hover:underline">
                    التقويم الكامل ←
                  </Link>
                </div>
                <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
                  {todaySessions.map((session) => (
                    <div key={session.id} className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
                      <p className="font-bold text-purple-300">
                        {session.name} — {to12h(session.startTime)}
                      </p>
                      <p className="text-slate-400">
                        {session.academicStage?.name || 'مرحلة دراسية'} {session.room ? `(${session.room})` : ''}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          session.isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {session.isOpen ? 'مفتوحة الحضور 🟢' : 'مغلقة الحضور 🔴'}
                        </span>
                        <span className="text-[10px] text-slate-500">الحضور: {session.presentCount || 0} طالب</span>
                      </div>
                    </div>
                  ))}
                  {todaySessions.length === 0 && (
                    <p className="text-slate-500 text-center py-4">لا توجد مجموعات اليوم</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Theme Customizer Trigger */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsThemeModalOpen(true)}
          className="p-2.5 rounded-xl text-purple-400 hover:text-white transition-all cursor-pointer"
          style={{
            background: 'rgb(var(--p) / 0.1)',
            border: '1px solid rgb(var(--p) / 0.25)',
          }}
          title="تخصيص المظهر والثيمات (الوضع الليلي والنهاري والألوان)"
        >
          <Palette className="w-4.5 h-4.5" />
        </motion.button>
      </div>

      <ThemeCustomizerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </header>
  );
}
