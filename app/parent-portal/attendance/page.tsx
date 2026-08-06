'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { QrCode, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function ParentAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [attendanceRate, setAttendanceRate] = useState('0%');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const childId = localStorage.getItem('selectedChildId');
        if (!childId) {
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/parent-portal/children/${childId}/attendance`);
        const data = await res.json();
        if (data.success) {
          setRecords(data.records);
          setAttendanceRate(data.attendanceRate);
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
    return <div className="text-center py-20 text-white animate-pulse">جارٍ تحميل البيانات...</div>;
  }

  if (records.length === 0) {
    return <div className="text-center py-20 text-white">لا توجد بيانات حضور للابن المختار حالياً، تأكد من اختيار الابن من لوحة التحكم.</div>;
  }

  return (
    <div className="space-y-8">
      <HeroHeader
        title="تقرير الحضور والغياب"
        badge="بوابة ولي الأمر"
        subtitle="متابعة دقيقة لانضباط الابن المختار في الحصص التعليمية"
        stats={[
          { label: "نسبة الحضور العامة", value: attendanceRate, color: "text-emerald-400" },
        ]}
      />

      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-purple-400" />
          <span>سجل الحصص الأخيرة</span>
        </h2>

        <div className="space-y-4">
          {records.map((record) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${record.status === 'حاضر' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {record.status === 'حاضر' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">حصة {record.date}</h4>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> وقت الحضور: {record.time}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${record.status === 'حاضر' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                {record.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
