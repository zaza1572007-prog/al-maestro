'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { Bell, Info, AlertTriangle, AlertOctagon, CheckCheck, Loader2, InboxIcon } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
  isRead: boolean;
  timeAgo: string;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: any; bg: string; border: string; badge: string; label: string }> = {
  INFO: {
    icon: Info,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    label: 'معلومة',
  },
  WARNING: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    label: 'تحذير',
  },
  ALERT: {
    icon: AlertOctagon,
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    label: 'تنبيه',
  },
  CRITICAL: {
    icon: AlertOctagon,
    bg: 'bg-red-600/10',
    border: 'border-red-600/20',
    badge: 'bg-red-600/15 text-red-300 border-red-600/30',
    label: 'عاجل',
  },
};

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD'>('ALL');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student-portal/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markSingleRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    } catch {
      // Revert on failure
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: false } : n)
      );
      setUnreadCount(prev => prev + 1);
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingRead(true);

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await fetch('/api/student-portal/notifications', { method: 'PATCH' });
    } catch {
      fetchNotifications(); // Revert on failure
    } finally {
      setMarkingRead(false);
    }
  };

  const displayed = filterType === 'UNREAD'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <div className="space-y-8" dir="rtl">
      <HeroHeader
        title="الإشعارات 🔔"
        badge="بوابة الطالب"
        subtitle="جميع التنبيهات والرسائل المرسلة إليك من الأستاذ"
        stats={[
          { label: 'إجمالي الإشعارات', value: String(notifications.length), color: 'text-blue-400' },
          { label: 'غير مقروءة', value: String(unreadCount), color: 'text-purple-400' },
        ]}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {(['ALL', 'UNREAD'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                filterType === f
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {f === 'ALL' ? 'الكل' : `غير المقروءة (${unreadCount})`}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingRead}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            {markingRead ? 'جاري...' : 'تحديد الكل كمقروء'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">جاري تحميل الإشعارات...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <InboxIcon className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-slate-400 text-lg">
              {filterType === 'UNREAD' ? 'لا توجد إشعارات غير مقروءة 🎉' : 'لا توجد إشعارات حالياً'}
            </p>
            <p className="text-sm mt-1">ستظهر هنا أي رسائل أو تنبيهات من الأستاذ</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {displayed.map((notif, i) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.INFO;
                const Icon = cfg.icon;

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => !notif.isRead && markSingleRead(notif.id)}
                    className={`p-4 rounded-2xl border flex gap-4 transition-all cursor-pointer ${
                      notif.isRead
                        ? 'bg-white/3 border-white/8 opacity-70 hover:opacity-90'
                        : `${cfg.bg} ${cfg.border} hover:brightness-110`
                    }`}
                  >
                    <div className={`p-3 rounded-2xl h-fit flex-shrink-0 ${notif.isRead ? 'bg-white/8 text-slate-400' : `${cfg.bg} ${cfg.border} border`}`}>
                      <Icon className={`w-5 h-5 ${notif.isRead ? '' : 'text-current'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-bold text-sm ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
                            {notif.title}
                          </h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 whitespace-nowrap flex-shrink-0">{notif.timeAgo}</span>
                      </div>
                      <p className={`text-sm leading-relaxed ${notif.isRead ? 'text-slate-500' : 'text-slate-300'}`}>
                        {notif.message}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
