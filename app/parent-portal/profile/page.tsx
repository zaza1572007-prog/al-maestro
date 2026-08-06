'use client';

import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { User, Phone, Settings } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <HeroHeader
        title="الملف الشخصي 👤"
        badge="بوابة ولي الأمر"
        subtitle="إدارة بياناتك الشخصية وإعدادات الحساب"
        stats={[]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 glass-panel p-6 rounded-3xl border border-white/10 shadow-lg text-center flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white mb-4 border-4 border-white/10 shadow-xl">
            أ
          </div>
          <h2 className="text-xl font-bold text-white mb-1">أحمد راضي</h2>
          <span className="text-sm text-purple-400 font-semibold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">ولي أمر</span>
        </div>

        <div className="md:col-span-2 glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <span>المعلومات الأساسية</span>
          </h3>
          
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">الاسم بالكامل</label>
                <input 
                  type="text" 
                  defaultValue="أحمد راضي" 
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-slate-300 opacity-70 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">رقم الهاتف الأساسي</label>
                <input 
                  type="tel" 
                  defaultValue="01012345678" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">رقم WhatsApp المربوط (المنصة)</label>
                <input 
                  type="tel" 
                  defaultValue="01012345678" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <button className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-purple-500/30">
                حفظ التعديلات
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
