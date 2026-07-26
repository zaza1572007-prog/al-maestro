'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  // Don't render sidebar on login page
  if (pathname === '/login') return null;

  const navItems = [
    { label: 'الصفحة الرئيسية', path: '/dashboard', icon: '🏠' },
    { label: 'المراحل الدراسية', path: '/stages', icon: '🎓' },
    { label: 'المجموعات التعليمية', path: '/groups', icon: '👥' },
    { label: 'قائمة الطلاب', path: '/students', icon: '👨‍🎓' },
    { label: 'ماسح الـ QR والحضور', path: '/attendance', icon: '📱' },
    { label: 'الجلسات والدروس', path: '/sessions', icon: '📅' },
    { label: 'الواجبات والتقييمات', path: '/homework', icon: '📚' },
    { label: 'الامتحانات والنتائج', path: '/exams', icon: '📝' },
    { label: 'الاشتراكات الشهرية', path: '/subscriptions', icon: '💳' },
    { label: 'المدفوعات والسداد', path: '/payments', icon: '💰' },
    { label: 'طباعة بطاقات الطلاب', path: '/cards', icon: '🎴' },
    { label: 'المكتبة والملفات', path: '/files', icon: '📁' },
    { label: 'إدارة المهام', path: '/tasks', icon: '✅' },
    { label: 'تواصل أولياء الأمور', path: '/parent-comm', icon: '💬' },
    { label: 'حضور وتوقيت الموظفين', path: '/staff', icon: '⏰' },
    { label: 'التقارير والإحصائيات', path: '/reports', icon: '📊' },
    { label: 'التقويم الدراسي', path: '/calendar', icon: '🗓️' },
    { label: 'الأرشيف الدراسي', path: '/archive', icon: '📦' },
    { label: 'مركز التنبيهات', path: '/notifications', icon: '🔔' },
    { label: 'سجل الأنشطة والأمان', path: '/audit-log', icon: '🛡️' },
    { label: 'البروفايل العام للمدرس', path: '/profile', icon: '👤' },
    { label: 'إعدادات المنصة', path: '/settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col h-screen sticky top-0 no-print select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/20">
          م
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight">منصة المايسترو</h1>
          <p className="text-xs text-blue-400 font-medium">أ. أحمد راضي كحلة</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white border border-slate-600">
              أ
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-200">الأستاذ الرئيسي</p>
              <p className="text-slate-500">مالك النظام</p>
            </div>
          </div>
          <Link
            href="/login"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            title="تسجيل الخروج"
          >
            🚪
          </Link>
        </div>
      </div>
    </aside>
  );
}
