'use client';

import { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendarQuick, setShowCalendarQuick] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [notificationsList, setNotificationsList] = useState([
    { id: 1, title: 'اشتراك ينتهي قريباً 💳', desc: 'الطالبة سارة إبراهيم - ينتهي الاشتراك خلال يومين', time: 'منذ 10 دقائق', unread: true },
    { id: 2, title: 'تسجيل حضور جديد 📱', desc: 'تم تسجيل حضور 28 طالب في مجموعة الثالث الثانوي', time: 'منذ ساعة', unread: true },
  ]);

  // Hide Navbar completely on public pages: Login, Role Selection, and Student Registration
  if (pathname === '/login' || pathname === '/select-role' || pathname === '/register') return null;

  const markAllRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, unread: false })));
  };

  return (
    <header className="h-20 border-b border-white/10 glass-panel bg-slate-950/60 backdrop-blur-2xl px-8 flex items-center justify-between sticky top-0 z-20 no-print">
      {/* Search Input */}
      <div className="relative w-80 md:w-96">
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
          <span className="absolute left-3 top-2.5 text-[10px] font-mono bg-white/10 text-purple-300 px-2 py-1 rounded-lg border border-white/10">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Icons & Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowCalendarQuick(false);
              setShowProfileMenu(false);
            }}
            className="p-3 text-slate-300 hover:text-white rounded-2xl glass-panel border border-white/10 hover:border-purple-500/40 transition-all relative group"
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
                      className={`p-3 rounded-2xl border text-xs transition-all ${
                        n.unread
                          ? 'bg-purple-950/30 border-purple-500/30 text-slate-200'
                          : 'bg-white/5 border-white/5 text-slate-400'
                      }`}
                    >
                      <p className="font-bold text-white mb-1">{n.title}</p>
                      <p className="leading-relaxed">{n.desc}</p>
                      <span className="text-[10px] text-slate-500 block mt-2">{n.time}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Calendar */}
        <div className="relative">
          <button
            onClick={() => {
              setShowCalendarQuick(!showCalendarQuick);
              setShowNotifications(false);
              setShowProfileMenu(false);
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
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                    <p className="font-bold text-purple-300">مجموعة السبت - 4:00 مساءً</p>
                    <p className="text-slate-400 mt-1">الصف الثالث الإعدادي (القاعة 1)</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                    <p className="font-bold text-blue-300">مجموعة الأحد - 6:00 مساءً</p>
                    <p className="text-slate-400 mt-1">الصف الثالث الثانوي (القاعة الرئيسية)</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-[1px] bg-white/10"></div>

        {/* User Profile Glass Badge */}
        <div className="relative">
          <div
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
              setShowCalendarQuick(false);
            }}
            className="flex items-center gap-3 p-1.5 pl-3 rounded-2xl glass-panel border border-white/10 hover:border-purple-500/30 cursor-pointer transition-all select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/20 border border-white/20">
              أك
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-white leading-tight">أحمد راضي كحلة</p>
              <p className="text-[11px] text-purple-400 font-medium">مدرس الرياضيات</p>
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
                  href="/profile"
                  className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl text-slate-200 font-medium transition-colors"
                >
                  <User className="w-4 h-4 text-purple-400" />
                  <span>البروفايل الشخصي</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl text-slate-200 font-medium transition-colors"
                >
                  <Settings className="w-4 h-4 text-blue-400" />
                  <span>إعدادات المنصة والهوية</span>
                </Link>
                <div className="border-t border-white/10 my-1"></div>
                <Link
                  href="/select-role"
                  className="flex items-center gap-3 p-3 hover:bg-rose-500/10 text-rose-400 rounded-2xl font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تبديل الحساب / خروج</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
