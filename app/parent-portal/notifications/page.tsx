'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { Bell, Info, AlertTriangle, AlertOctagon, InboxIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const childId = localStorage.getItem('selectedChildId');
        if (!childId) {
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/parent-portal/children/${childId}/notifications`);
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications);
        } else {
          toast.error(data.error || 'تعذر تحميل الإشعارات');
        }
      } catch (e) {
        console.error(e);
        toast.error('خطأ في الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  return (
    <div className="space-y-8">
      <HeroHeader
        title="الإشعارات 🔔"
        badge="بوابة ولي الأمر"
        subtitle="أحدث التنبيهات والرسائل الإدارية الخاصة بالابن المختار"
        stats={[]}
      />

      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">جاري تحميل الإشعارات...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <InboxIcon className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-slate-400 text-lg">لا توجد إشعارات حالياً</p>
            <p className="text-sm mt-1">ستظهر هنا أي رسائل أو تنبيهات مرسلة للابن</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {notifications.map((notif, i) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.INFO;
                const Icon = cfg.icon;

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`p-4 rounded-2xl border flex gap-4 transition-all ${
                      notif.isRead
                        ? 'bg-white/3 border-white/8 opacity-70'
                        : `${cfg.bg} ${cfg.border}`
                    }`}
                  >
                    <div className={`p-3 rounded-2xl h-fit flex-shrink-0 ${notif.isRead ? 'bg-white/8 text-slate-400' : `${cfg.bg} ${cfg.border} border`}`}>
                      <Icon className="w-5 h-5 text-current" />
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
