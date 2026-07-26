'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendarQuick, setShowCalendarQuick] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [notificationsList, setNotificationsList] = useState([
    { id: 1, title: 'اشتراك ينتهي قريباً', desc: 'الطالبة سارة إبراهيم - ينتهي الاشتراك خلال يومين', time: 'منذ 10 دقائق', unread: true },
    { id: 2, title: 'تسجيل حضور جديد', desc: 'تم تسجيل حضور 28 طالب في مجموعة الثالث الثانوي', time: 'منذ ساعة', unread: true },
  ]);

  if (pathname === '/login') return null;

  const markAllRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, unread: false })));
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 no-print">
      {/* Global Search Bar (Ctrl + K) */}
      <div className="relative w-72 md:w-96">
        <div className="relative">
          <input
            type="text"
            placeholder="البحث الشامل في الطلاب، المجموعات، والجلسات... (Ctrl + K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-4 pr-10 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
          <span className="absolute left-3 top-2.5 text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            Ctrl+K
          </span>
          <span className="absolute right-3 top-2.5 text-slate-400">🔍</span>
        </div>

        {/* Quick Search Preview */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="absolute top-12 right-0 left-0 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-sm">
            <p className="text-xs text-slate-400 mb-2 px-2">نتائج البحث الفورية لـ "{searchQuery}"</p>
            <div className="space-y-1">
              <Link href={`/students?search=${encodeURIComponent(searchQuery)}`} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded-xl text-slate-200">
                <span>البحث في قائمة الطلاب 👨‍🎓</span>
                <span className="text-xs text-blue-400 font-bold">انتقال ↵</span>
              </Link>
              <Link href={`/groups?search=${encodeURIComponent(searchQuery)}`} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded-xl text-slate-200">
                <span>البحث في المجموعات التعليمية 👥</span>
                <span className="text-xs text-blue-400 font-bold">انتقال ↵</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons & Dropdowns */}
      <div className="flex items-center gap-3 relative">
        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowCalendarQuick(false);
              setShowProfileMenu(false);
            }}
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition relative"
            title="مركز التنبيهات"
          >
            <span className="text-xl">🔔</span>
            {notificationsList.some(n => n.unread) && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-900 animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-bold text-sm text-white">🔔 التنبيهات الإدارية</h4>
                <button onClick={markAllRead} className="text-[11px] text-blue-400 hover:underline">
                  تحديد الكل كمرئي
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notificationsList.map(n => (
                  <div key={n.id} className={`p-2.5 rounded-xl border text-xs ${n.unread ? 'bg-blue-950/40 border-blue-800/50 text-slate-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                    <p className="font-bold text-white mb-0.5">{n.title}</p>
                    <p>{n.desc}</p>
                    <span className="text-[10px] text-slate-500 block mt-1">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Calendar Quick View */}
        <div className="relative">
          <button
            onClick={() => {
              setShowCalendarQuick(!showCalendarQuick);
              setShowNotifications(false);
              setShowProfileMenu(false);
            }}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition"
            title="جدول حصص اليوم السريع"
          >
            <span className="text-xl">🗓️</span>
          </button>

          {showCalendarQuick && (
            <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-bold text-sm text-white">🗓️ حصص اليوم السريعة</h4>
                <Link href="/calendar" className="text-[11px] text-emerald-400 hover:underline">التقويم الكامل ←</Link>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-emerald-400">مجموعة السبت - 4:00 مساءً</p>
                  <p className="text-slate-400 mt-0.5">الصف الثالث الإعدادي (القاعة 1)</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="font-bold text-blue-400">مجموعة الأحد - 6:00 مساءً</p>
                  <p className="text-slate-400 mt-0.5">الصف الثالث الثانوي (القاعة الرئيسية)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-slate-800 my-auto"></div>

        {/* Profile Menu Dropdown */}
        <div className="relative">
          <div
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
              setShowCalendarQuick(false);
            }}
            className="flex items-center gap-3 pl-2 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md border border-blue-500/30">
              أك
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-white leading-tight">الأستاذ أحمد راضي كحلة</p>
              <p className="text-xs text-blue-400 font-medium">مدرس الرياضيات الرئيسي</p>
            </div>
          </div>

          {showProfileMenu && (
            <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-xs">
              <Link href="/profile" className="flex items-center gap-2 p-2.5 hover:bg-slate-800 rounded-xl text-slate-200 font-medium">
                👤 البروفايل الشخصي
              </Link>
              <Link href="/settings" className="flex items-center gap-2 p-2.5 hover:bg-slate-800 rounded-xl text-slate-200 font-medium">
                ⚙️ إعدادات المنصة والهوية
              </Link>
              <div className="border-t border-slate-800 my-1"></div>
              <Link href="/login" className="flex items-center gap-2 p-2.5 hover:bg-rose-900/30 text-rose-400 rounded-xl font-bold">
                🚪 تسجيل الخروج
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

