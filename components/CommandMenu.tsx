'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserCheck, Users, GraduationCap, DollarSign, Settings, X, ShieldAlert } from 'lucide-react';

export default function CommandMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setStudents([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.students)) {
          setStudents(data.students.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const navItems = [
    { title: 'مسح الباركود والحضور', href: '/attendance', icon: UserCheck },
    { title: 'إدارة الطلاب', href: '/students', icon: Users },
    { title: 'المجموعات والمراحل', href: '/groups', icon: GraduationCap },
    { title: 'الاشتراكات والمدفوعات', href: '/payments', icon: DollarSign },
    { title: 'إعدادات المنصة', href: '/settings', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden divide-y divide-slate-800">
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3.5 gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن طالب، كود، أو صفحة بالسحب (Ctrl + K)..."
            autoFocus
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-3">
          {/* Quick Nav Options */}
          {!query && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">التنقل السريع</p>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        router.push(item.href);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 text-right text-xs text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-xl text-blue-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold">{item.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">انتقال ↵</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Student Search Results */}
          {query && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">نتائج بحث الطلاب</p>
              {loading ? (
                <p className="text-xs text-slate-400 p-3 text-center">جارٍ البحث...</p>
              ) : students.length > 0 ? (
                <div className="space-y-1">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => {
                        router.push(`/students?id=${student.id}`);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 text-right text-xs text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-white text-sm">{student.name}</p>
                        <p className="text-[10px] text-slate-500">المجموعة: {student.group?.name || 'بدون'}</p>
                      </div>
                      <span className="font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg text-[11px]">
                        {student.code}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 p-4 text-center">لم يتم العثور على نتائج طابق البحث</p>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" /> اختصار البحث الشامل للمايسترو
          </span>
          <span>اضغط <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">Esc</kbd> للإغلاق</span>
        </div>
      </div>
    </div>
  );
}
