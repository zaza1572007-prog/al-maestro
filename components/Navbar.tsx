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
  Menu
} from 'lucide-react';
import { useSidebar } from '@/components/SidebarContext';


export default function Navbar() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendarQuick, setShowCalendarQuick] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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

  return (
    <header className="h-20 border-b border-white/10 glass-panel bg-slate-950/60 backdrop-blur-2xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 no-print">
      {/* Right side: Hamburger menu + Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileOpen}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 lg:hidden transition-colors"
          title="القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Input */}
        <div className="relative w-full max-w-[160px] sm:max-w-xs md:w-96 hidden sm:block">
          <div className="relative">
            <input
              type="text"
              placeholder="البحث الشامل... (Ctrl + K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
              className="w-full glass-input py-2.5 px-4 pr-11 pl-16 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            <Search className="w-5 h-5 absolute right-3.5 top-3 text-slate-400" />
            <span 
              className="absolute left-3 top-2.5 text-[10px] font-mono px-2 py-1 rounded-lg border"
              style={{
                backgroundColor: 'rgb(var(--p) / 0.1)',
                borderColor: 'rgb(var(--p) / 0.2)',
                color: 'rgb(var(--p))'
              }}
            >
              Ctrl+K
            </span>
          </div>

          {/* Quick Search Dropdown */}
          <AnimatePresence>
            {isSearchOpen && searchQuery.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-14 right-0 left-0 glass-panel border border-white/15 rounded-2xl shadow-2xl p-4 z-50 text-sm bg-slate-900/90"
              >
                <p className="text-xs text-slate-400 mb-3">نتائج البحث عن "{searchQuery}"</p>
                <div className="space-y-2">
                  {currentUser?.role !== 'STUDENT' && currentUser?.role !== 'PARENT' && (
                    <>
                      <Link
                        href={`/students?search=${encodeURIComponent(searchQuery)}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-slate-200 transition-colors"
                      >
                        <span className="font-medium">البحث في قائمة الطلاب 👨‍🎓</span>
                        <span className="text-xs text-purple-400 font-bold">عرض الكل ↵</span>
                      </Link>
                      <Link
                        href={`/groups?search=${encodeURIComponent(searchQuery)}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-slate-200 transition-colors"
                      >
                        <span className="font-medium">البحث في المجموعات 👥</span>
                        <span className="text-xs text-purple-400 font-bold">عرض الكل ↵</span>
                      </Link>
                    </>
                  )}
                  {(currentUser?.role === 'STUDENT' || currentUser?.role === 'PARENT') && (
                     <div className="p-3 text-slate-400 text-center">البحث متاح لأسماء الملفات فقط حالياً.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>


      {/* Action Icons & Profile */}
      <div className="flex items-center gap-4">
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
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
            }}
            className="p-3 text-slate-300 hover:text-white rounded-2xl glass-panel border border-white/10 transition-all relative group"
            style={{
              borderColor: showNotifications ? 'rgb(var(--p) / 0.4)' : undefined
            }}
            title="التنبيهات"
          >
            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {notificationsList.some((n) => n.unread) && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-950 animate-ping" />
            )}
          </button>

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
          <button
            onClick={() => {
              setShowCalendarQuick(!showCalendarQuick);
            }}
            className="p-3 text-slate-300 hover:text-white rounded-2xl glass-panel border border-white/10 hover:border-blue-500/40 transition-all group"
            title="جدول الحصص السريع"
          >
            <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

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

        <div className="h-8 w-[1px] bg-white/10"></div>

        {/* User Profile Glass Badge */}
        <div 
          className="relative"
          onMouseEnter={() => {
            setShowProfileMenu(true);
            setShowNotifications(false);
            setShowCalendarQuick(false);
          }}
          onMouseLeave={() => setShowProfileMenu(false)}
        >
          <div
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
            }}
            className="flex items-center gap-3 p-1.5 pl-3 rounded-2xl glass-panel border border-white/10 cursor-pointer transition-all select-none"
            style={{
              borderColor: showProfileMenu ? 'rgb(var(--p) / 0.4)' : undefined
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/20 overflow-hidden"
              style={{
                background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, rgb(var(--p)) 0%, rgb(var(--s)) 100%)',
                boxShadow: '0 4px 15px rgb(var(--p) / 0.2)'
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={currentUser?.name} className="w-full h-full object-cover" />
              ) : (
                currentUser?.name?.charAt(0) || 'أ'
              )}
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-white leading-tight">{currentUser?.name || 'جاري التحميل...'}</p>
              <p className="text-[11px] font-medium" style={{ color: 'rgb(var(--p))' }}>
                {currentUser?.role === 'STUDENT' ? 'طالب' : currentUser?.role === 'PARENT' ? 'ولي أمر' : 'مدرس رياضيات'}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute left-0 mt-3 w-60 glass-panel border border-white/15 rounded-3xl shadow-2xl p-2 z-50 space-y-1 text-xs bg-slate-950/90"
              >
                <Link
                  href={currentUser?.role === 'STUDENT' ? '/student-portal/profile' : currentUser?.role === 'PARENT' ? '/parent-portal/profile' : '/profile'}
                  className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl text-slate-200 font-medium transition-colors"
                >
                  <User className="w-4 h-4 text-purple-400" />
                  <span>البروفايل الشخصي</span>
                </Link>
                {currentUser?.role !== 'STUDENT' && currentUser?.role !== 'PARENT' && (
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl text-slate-200 font-medium transition-colors"
                  >
                    <Settings className="w-4 h-4 text-blue-400" />
                    <span>إعدادات المنصة والهوية</span>
                  </Link>
                )}
                <div className="border-t border-white/10 my-1"></div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/logout', { method: 'POST' });
                    } catch {}
                    window.location.href = '/select-role';
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-rose-500/10 text-rose-400 rounded-2xl font-bold transition-colors cursor-pointer text-right"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج / تبديل الحساب</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
