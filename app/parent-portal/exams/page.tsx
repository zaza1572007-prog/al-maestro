'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { Award, Trophy } from 'lucide-react';

export default function ParentExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [average, setAverage] = useState('0%');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const childId = localStorage.getItem('selectedChildId');
        if (!childId) {
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/parent-portal/children/${childId}/exams`);
        const data = await res.json();
        if (data.success) {
          setExams(data.exams);
          setAverage(data.average);
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

  if (exams.length === 0) {
    return <div className="text-center py-20 text-white">لا توجد نتائج امتحانات للابن المختار حالياً.</div>;
  }

  return (
    <div className="space-y-8">
      <HeroHeader
        title="نتائج الامتحانات 📝"
        badge="بوابة ولي الأمر"
        subtitle="متابعة مستوى الابن ودرجاته في الاختبارات المختلفة"
        stats={[
          { label: "المتوسط العام", value: average, color: "text-purple-400" },
        ]}
      />

      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-400" />
          <span>سجل الامتحانات</span>
        </h2>

        <div className="space-y-4">
          {exams.map((exam) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h4 className="font-bold text-white text-sm">{exam.title}</h4>
                <p className="text-xs text-slate-400 mt-1">تاريخ الامتحان: {exam.date}</p>
                <div className="flex items-center gap-2 mt-2">
                  {exam.rank && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> {exam.rank}
                    </span>
                  )}
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {exam.evaluation}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-2xl font-black text-purple-300 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-2xl shadow-inner">
                  {exam.score}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
