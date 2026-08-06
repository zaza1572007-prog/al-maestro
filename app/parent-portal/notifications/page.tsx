'use client';

import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { Bell, Info } from 'lucide-react';

export default function NotificationsPage() {
  const notifications = [
    { id: 1, title: 'تذكير بموعد الامتحان', message: 'يرجى العلم بأنه تم تحديد موعد امتحان الشهر يوم الثلاثاء القادم.', date: 'منذ ساعتين', isNew: true },
    { id: 2, title: 'غياب بدون عذر', message: 'نود إعلامكم بتغيب ابنكم عن حصة يوم الأحد، يرجى المتابعة.', date: 'أمس', isNew: true },
    { id: 3, title: 'تحديث في المذكرة', message: 'تم رفع المذكرة الجديدة الخاصة بالباب الثاني.', date: 'منذ 3 أيام', isNew: false },
  ];

  return (
    <div className="space-y-8">
      <HeroHeader
        title="الإشعارات 🔔"
        badge="بوابة ولي الأمر"
        subtitle="أحدث التنبيهات والرسائل الإدارية"
        stats={[]}
      />

      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
        <div className="space-y-4">
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border flex gap-4 ${notif.isNew ? 'bg-purple-500/10 border-purple-500/20' : 'bg-white/5 border-white/10'}`}
            >
              <div className={`p-3 rounded-full h-fit flex-shrink-0 ${notif.isNew ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-slate-300'}`}>
                {notif.isNew ? <Bell className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-bold text-sm ${notif.isNew ? 'text-white' : 'text-slate-300'}`}>{notif.title}</h4>
                  <span className="text-xs text-slate-500">{notif.date}</span>
                </div>
                <p className="text-sm text-slate-400">{notif.message}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
