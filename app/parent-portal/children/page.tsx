'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { GraduationCap, CheckCircle2, Award, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function ChildrenPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch('/api/parent-portal');
        const data = await res.json();
        if (data.success && data.children) {
          setChildren(data.children);
        } else {
          toast.error(data.error || 'تعذر تحميل قائمة الأبناء');
        }
      } catch (e) {
        console.error(e);
        toast.error('خطأ في الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  const handleAction = (childId: string, path: string) => {
    localStorage.setItem('selectedChildId', childId);
    // Dispatch a storage event or window event to let other components know the child changed
    window.dispatchEvent(new Event('storage'));
    router.push(path);
  };

  if (loading) {
    return <div className="text-center py-20 text-white animate-pulse">جارٍ تحميل بيانات الأبناء...</div>;
  }

  if (children.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <h2 className="text-xl font-bold text-white mb-2">عفواً، لا توجد بيانات</h2>
        <p>لم يتم العثور على أبناء مسجلين بحسابك.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <HeroHeader
        title="متابعة الأبناء 👨‍👩‍👦"
        badge="بوابة ولي الأمر"
        subtitle="الاطلاع على قائمة الأبناء المسجلين ومتابعة أدائهم"
        stats={[
          { label: "عدد الأبناء", value: children.length.toString(), color: "text-purple-400" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children.map((child, idx) => (
          <motion.div
            key={child.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-panel p-6 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                    style={{
                      background: 'linear-gradient(135deg, rgb(var(--p)) 0%, rgb(var(--s)) 100%)'
                    }}
                  >
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{child.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{child.stage} - {child.group}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">الكود: <span className="font-mono text-purple-400">{child.code}</span></p>
                  </div>
                </div>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${
                  child.subscriptionStatus === 'ساري' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  الاشتراك: {child.subscriptionStatus}
                </span>
              </div>

              {/* Dynamic stats preview inside the card */}
              <div className="grid grid-cols-3 gap-2 bg-white/3 border border-white/5 p-3 rounded-2xl text-center text-xs my-4">
                <div>
                  <span className="text-slate-400 block mb-0.5">نسبة الحضور</span>
                  <span className="text-emerald-400 font-extrabold text-sm">{child.attendanceRate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">آخر تقييم</span>
                  <span className="text-purple-300 font-extrabold text-sm truncate block px-1">{child.latestExam}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">تسليم الواجبات</span>
                  <span className="text-blue-300 font-extrabold text-sm">{child.homeworkRate}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <button 
                onClick={() => handleAction(child.id, '/parent-portal/attendance')}
                className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-2xl transition-all text-xs font-bold flex flex-col items-center gap-2 border border-white/10 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>سجل الحضور والغياب</span>
              </button>
              <button 
                onClick={() => handleAction(child.id, '/parent-portal/exams')}
                className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-2xl transition-all text-xs font-bold flex flex-col items-center gap-2 border border-white/10 cursor-pointer"
              >
                <Award className="w-5 h-5 text-purple-400" />
                <span>سجل الدرجات والنتائج</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
