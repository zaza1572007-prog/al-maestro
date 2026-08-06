'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { BookOpenCheck, Clock, Upload } from 'lucide-react';

export default function StudentHomeworkPage() {
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/student-portal/homework');
        const data = await res.json();
        if (data.success) {
          setHomeworks(data.homeworks);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-white animate-pulse">جارٍ تحميل الواجبات...</div>;
  }

  const completedCount = homeworks.filter(hw => hw.status.includes('مكتمل')).length;

  return (
    <div className="space-y-8">
      <HeroHeader
        title="واجباتي والتقييمات 📚"
        badge="بوابة الطالب"
        subtitle="الاطلاع على المهام الدراسية وتسليم الواجبات"
        stats={[
          { label: "واجبات مكتملة", value: completedCount.toString(), color: "text-blue-400" },
        ]}
      />

      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <BookOpenCheck className="w-5 h-5 text-purple-400" />
          <span>سجل الواجبات</span>
        </h2>

        <div className="space-y-4">
          {homeworks.map((hw) => (
            <motion.div
              key={hw.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h4 className="font-bold text-white text-sm">{hw.title}</h4>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> تاريخ التسليم: {hw.dueDate}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {hw.status === 'قيد الانتظار' ? (
                  <button className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition-all">
                    <Upload className="w-3.5 h-3.5" /> رفع الحل
                  </button>
                ) : null}
                <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${hw.status === 'مكتمل' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                  {hw.status}
                </span>
                {hw.score && (
                  <span className="text-lg font-black text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-2xl">
                    {hw.score}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
