'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { Users, GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ChildrenPage() {
  const [children, setChildren] = useState([
    { id: 1, name: 'عمر أحمد راضي', stage: 'الصف الأول الثانوي', group: 'مجموعة الأحد والأربعاء', status: 'منتظم' },
    { id: 2, name: 'يوسف أحمد راضي', stage: 'الصف الثالث الإعدادي', group: 'مجموعة السبت والثلاثاء', status: 'بحاجة لمتابعة' },
  ]);

  return (
    <div className="space-y-8">
      <HeroHeader
        title="متابعة الأبناء 👨‍👩‍👦"
        badge="بوابة ولي الأمر"
        subtitle="الاطلاع على قائمة الأبناء المسجلين ومتابعة أدائهم"
        stats={[
          { label: "عدد الأبناء", value: "2", color: "text-purple-400" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children.map((child) => (
          <motion.div
            key={child.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{child.name}</h3>
                  <p className="text-sm text-slate-400">{child.stage} - {child.group}</p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full border ${child.status === 'منتظم' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                {child.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-2xl transition-colors text-sm font-semibold flex flex-col items-center gap-2 border border-white/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>تقرير الحضور</span>
              </button>
              <button className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-2xl transition-colors text-sm font-semibold flex flex-col items-center gap-2 border border-white/10">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span>سجل الدرجات</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
