'use client';

import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { CreditCard, Receipt, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ParentSubscriptionPage() {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const childId = localStorage.getItem('selectedChildId');
        if (!childId) {
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/parent-portal/children/${childId}/subscriptions`);
        const data = await res.json();
        if (data.success && data.subscription) {
          setSub(data.subscription);
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
    return <div className="text-center py-20 text-white animate-pulse">جارٍ تحميل بيانات الاشتراك...</div>;
  }

  return (
    <div className="space-y-8">
      <HeroHeader
        title="الاشتراكات والرسوم 💳"
        badge="بوابة ولي الأمر"
        subtitle="إدارة المدفوعات والاشتراكات الشهرية للابن المختار"
        stats={[
          { label: "حالة الاشتراك", value: sub ? sub.status : "لا يوجد", color: sub?.status === 'ساري' ? "text-emerald-400" : "text-amber-400" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              <span>تفاصيل الاشتراك الحالي</span>
            </h2>
            {sub && (
              <span className={`px-3 py-1 rounded-full text-xs border ${sub.remaining === 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                {sub.remaining === 0 ? 'مدفوع' : 'متبقي'}
              </span>
            )}
          </div>
          
          {sub ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className="text-sm text-slate-400">شهر الاشتراك</span>
                <span className="font-bold text-white">{sub.month}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className="text-sm text-slate-400">المبلغ المطلوب</span>
                <span className="font-bold text-white">{sub.price} جنيه</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">المتبقي</span>
                <span className={`font-bold ${sub.remaining === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{sub.remaining} جنيه</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">لا يوجد اشتراك نشط حالياً للابن المختار.</div>
          )}
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mx-auto mb-4">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">الدفع الإلكتروني (قريباً)</h3>
          <p className="text-sm text-slate-400 mb-6">سيتم تفعيل خدمة الدفع الإلكتروني قريباً لتسهيل سداد الاشتراكات الشهرية من خلال المنصة.</p>
          <button disabled className="bg-white/5 text-slate-500 py-3 px-6 rounded-xl font-bold cursor-not-allowed border border-white/10">
            سداد الاشتراك
          </button>
        </div>
      </div>
    </div>
  );
}
