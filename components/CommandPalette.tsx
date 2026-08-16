'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  GraduationCap,
  Users,
  QrCode,
  ClipboardList,
  BookOpenCheck,
  FileSpreadsheet,
  CreditCard,
  Banknote,
  IdCard,
  FolderArchive,
  CheckSquare,
  MessageSquare,
  BarChart3,
  BellRing,
  Settings,
  UserPlus,
  Layers,
  Command,
  ArrowRight,
  Clock,
  Hash,
  ChevronLeft,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
  keywords?: string[];
  shortcut?: string;
}

// ─── Nav Commands ─────────────────────────────────────────────────────────────
function useCommands(router: ReturnType<typeof useRouter>): CommandItem[] {
  return [
    // Navigation
    { id: 'dashboard', label: 'لوحة التحكم الرئيسي', description: 'الصفحة الرئيسية والإحصائيات', icon: LayoutDashboard, action: () => router.push('/dashboard'), category: 'تنقل', keywords: ['home', 'main', 'رئيسي', 'احصائيات'] },
    { id: 'students', label: 'قائمة الطلاب', description: 'عرض وإدارة جميع الطلاب', icon: GraduationCap, action: () => router.push('/students'), category: 'تنقل', keywords: ['طالب', 'student'] },
    { id: 'groups', label: 'المجموعات التعليمية', description: 'إدارة مجموعات الحصص', icon: Users, action: () => router.push('/groups'), category: 'تنقل', keywords: ['مجموعة', 'group', 'حصة'] },
    { id: 'stages', label: 'المراحل الدراسية', description: 'المراحل الدراسية والمستويات', icon: Layers, action: () => router.push('/stages'), category: 'تنقل', keywords: ['مرحلة', 'stage', 'مستوى'] },
    { id: 'attendance', label: 'ماسح QR والحضور', description: 'تسجيل الحضور والغياب', icon: QrCode, action: () => router.push('/attendance'), category: 'تنقل', keywords: ['حضور', 'غياب', 'qr', 'باركود', 'scan'] },
    { id: 'daily-attendance', label: 'تحصيل غياب اليوم', description: 'كشوف الحضور اليومية', icon: ClipboardList, action: () => router.push('/daily-attendance'), category: 'تنقل', keywords: ['تحصيل', 'غياب', 'يوم', 'كشف'] },
    { id: 'homework', label: 'الواجبات والتقييمات', description: 'متابعة الواجبات', icon: BookOpenCheck, action: () => router.push('/homework'), category: 'تنقل', keywords: ['واجب', 'تقييم', 'homework'] },
    { id: 'exams', label: 'الامتحانات والنتائج', description: 'إدارة الامتحانات', icon: FileSpreadsheet, action: () => router.push('/exams'), category: 'تنقل', keywords: ['امتحان', 'نتيجة', 'exam'] },
    { id: 'subscriptions', label: 'الاشتراكات الشهرية', description: 'إدارة اشتراكات الطلاب', icon: CreditCard, action: () => router.push('/subscriptions'), category: 'تنقل', keywords: ['اشتراك', 'شهري', 'sub'] },
    { id: 'payments', label: 'المدفوعات والسداد', description: 'سجل المدفوعات', icon: Banknote, action: () => router.push('/payments'), category: 'تنقل', keywords: ['دفع', 'فلوس', 'سداد', 'payment'] },
    { id: 'cards', label: 'طباعة بطاقات الطلاب', description: 'بطاقات الـ QR', icon: IdCard, action: () => router.push('/cards'), category: 'تنقل', keywords: ['بطاقة', 'card', 'طباعة', 'qr'] },
    { id: 'files', label: 'المكتبة والملفات', description: 'رفع وإدارة الملفات', icon: FolderArchive, action: () => router.push('/files'), category: 'تنقل', keywords: ['ملف', 'مكتبة', 'file'] },
    { id: 'tasks', label: 'إدارة المهام', description: 'قائمة المهام والتذكيرات', icon: CheckSquare, action: () => router.push('/tasks'), category: 'تنقل', keywords: ['مهمة', 'task', 'تذكير'] },
    { id: 'parent-comm', label: 'تواصل أولياء الأمور', description: 'إرسال رسائل الأهالي', icon: MessageSquare, action: () => router.push('/parent-comm'), category: 'تنقل', keywords: ['ولي', 'رسالة', 'واتساب', 'whatsapp'] },
    { id: 'reports', label: 'التقارير والإحصائيات', description: 'تقارير الحضور والأداء', icon: BarChart3, action: () => router.push('/reports'), category: 'تنقل', keywords: ['تقرير', 'احصاء', 'report'] },
    { id: 'notifications', label: 'مركز التنبيهات', description: 'إشعارات النظام', icon: BellRing, action: () => router.push('/notifications'), category: 'تنقل', keywords: ['تنبيه', 'اشعار', 'notification'] },
    { id: 'registration', label: 'طلبات التسجيل', description: 'طلبات الحجز الجديدة', icon: UserPlus, action: () => router.push('/registration-requests'), category: 'تنقل', keywords: ['تسجيل', 'طلب', 'register'] },
    { id: 'settings', label: 'إعدادات المنصة', description: 'تخصيص النظام والثيم', icon: Settings, action: () => router.push('/settings'), category: 'تنقل', keywords: ['اعداد', 'setting', 'ثيم', 'لون'] },
    // Quick actions
    { id: 'add-student', label: 'إضافة طالب جديد', description: 'فتح صفحة إضافة طالب', icon: GraduationCap, action: () => router.push('/students?action=add'), category: 'إجراءات سريعة', keywords: ['اضافة', 'جديد', 'add'] },
    { id: 'open-attendance', label: 'فتح تسجيل الحضور', description: 'الانتقال لصفحة الحضور مباشرة', icon: QrCode, action: () => router.push('/attendance'), category: 'إجراءات سريعة', keywords: ['حضور', 'فتح', 'open'] },
  ];
}

// ─── Highlight matching text ──────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-transparent font-bold" style={{ color: 'rgb(var(--p))' }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allCommands = useCommands(router);

  // Load recent commands
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cmd_recent') || '[]');
      setRecentIds(saved);
    } catch {}
  }, []);

  const saveRecent = useCallback((id: string) => {
    setRecentIds(prev => {
      const next = [id, ...prev.filter(r => r !== id)].slice(0, 5);
      try { localStorage.setItem('cmd_recent', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Filter commands based on query
  const filtered = query.trim()
    ? allCommands.filter(cmd => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          (cmd.description || '').toLowerCase().includes(q) ||
          (cmd.keywords || []).some(k => k.toLowerCase().includes(q))
        );
      })
    : allCommands;

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  // Flat list for keyboard nav
  const flatList = filtered;

  // Show recent when no query
  const recentCommands = !query.trim()
    ? recentIds.map(id => allCommands.find(c => c.id === id)).filter(Boolean) as CommandItem[]
    : [];

  const displayFlat = query.trim() ? flatList : recentCommands.length ? recentCommands : flatList.slice(0, 8);

  // Open/close with Ctrl+K
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIdx(0);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, displayFlat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = displayFlat[selectedIdx];
      if (cmd) {
        saveRecent(cmd.id);
        cmd.action();
        setOpen(false);
        setQuery('');
      }
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleSelect = (cmd: CommandItem) => {
    saveRecent(cmd.id);
    cmd.action();
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Trigger button (optional, shown in Navbar) */}
      <button
        id="command-palette-trigger"
        onClick={() => { setOpen(true); setQuery(''); }}
        className="hidden"
        aria-label="فتح لوحة الأوامر"
      />

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md"
              onClick={() => setOpen(false)}
            />

            {/* Palette */}
            <div className="fixed inset-0 z-[201] flex items-start justify-center pt-[12vh] px-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full max-w-xl pointer-events-auto rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: 'rgba(10, 13, 28, 0.97)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
                }}
              >
                {/* Search Input */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="ابحث في أوامر المنصة..."
                    className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none"
                    autoComplete="off"
                  />
                  <div className="flex items-center gap-1.5">
                    <kbd
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono text-slate-500"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      ESC
                    </kbd>
                  </div>
                </div>

                {/* Results */}
                <div
                  ref={listRef}
                  className="overflow-y-auto"
                  style={{ maxHeight: '60vh' }}
                >
                  {displayFlat.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">لا توجد نتائج لـ &ldquo;{query}&rdquo;</p>
                    </div>
                  ) : (
                    <>
                      {/* Section label */}
                      {!query.trim() && recentCommands.length > 0 && (
                        <div
                          className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600"
                        >
                          <Clock className="w-3 h-3 inline ml-1" />
                          الأوامر الأخيرة
                        </div>
                      )}
                      {!query.trim() && recentCommands.length === 0 && (
                        <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          <Hash className="w-3 h-3 inline ml-1" />
                          جميع الأوامر
                        </div>
                      )}
                      {query.trim() && (
                        <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          <Search className="w-3 h-3 inline ml-1" />
                          نتائج البحث ({displayFlat.length})
                        </div>
                      )}

                      <div className="py-1">
                        {displayFlat.map((cmd, idx) => {
                          const Icon = cmd.icon;
                          const isSelected = idx === selectedIdx;
                          return (
                            <motion.button
                              key={cmd.id}
                              data-idx={idx}
                              onClick={() => handleSelect(cmd)}
                              onMouseEnter={() => setSelectedIdx(idx)}
                              initial={false}
                              animate={{
                                backgroundColor: isSelected
                                  ? 'rgba(139, 92, 246, 0.12)'
                                  : 'transparent',
                              }}
                              transition={{ duration: 0.1 }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-right group transition-colors cursor-pointer"
                            >
                              {/* Icon */}
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                                style={{
                                  background: isSelected
                                    ? 'rgb(var(--p) / 0.2)'
                                    : 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${isSelected ? 'rgb(var(--p) / 0.3)' : 'rgba(255,255,255,0.07)'}`,
                                }}
                              >
                                <Icon
                                  className="w-4 h-4"
                                  style={{ color: isSelected ? 'rgb(var(--p))' : '#94a3b8' }}
                                />
                              </div>

                              {/* Label + desc */}
                              <div className="flex-1 min-w-0 text-right">
                                <p
                                  className="text-sm font-semibold leading-tight"
                                  style={{ color: isSelected ? '#f1f5f9' : '#cbd5e1' }}
                                >
                                  <Highlight text={cmd.label} query={query} />
                                </p>
                                {cmd.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                    {cmd.description}
                                  </p>
                                )}
                              </div>

                              {/* Category badge */}
                              <div className="flex items-center gap-2 shrink-0">
                                {isSelected && (
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded font-semibold"
                                    style={{
                                      background: 'rgb(var(--p) / 0.15)',
                                      color: 'rgb(var(--p))',
                                    }}
                                  >
                                    {cmd.category}
                                  </span>
                                )}
                                <ArrowRight
                                  className="w-3.5 h-3.5 text-slate-600 transition-all"
                                  style={{
                                    opacity: isSelected ? 1 : 0,
                                    color: 'rgb(var(--p))',
                                    transform: isSelected ? 'translateX(0)' : 'translateX(4px)',
                                  }}
                                />
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="px-4 py-2.5 flex items-center justify-between border-t"
                  style={{
                    borderColor: 'rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div className="flex items-center gap-3 text-[10px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>↑↓</kbd>
                      للتنقل
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>↵</kbd>
                      لفتح
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>ESC</kbd>
                      للإغلاق
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <Command className="w-3 h-3" />
                    <span>منصة المايسترو</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
