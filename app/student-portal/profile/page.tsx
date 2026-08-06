'use client';

import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { User, Settings, QrCode } from 'lucide-react';

export default function StudentProfilePage() {
  return (
    <div className="space-y-8">
      <HeroHeader
        title="الملف الشخصي 👤"
        badge="بوابة الطالب"
        subtitle="إدارة بياناتك الشخصية وعرض رمز الـ QR الخاص بك"
        stats={[]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 glass-panel p-6 rounded-3xl border border-white/10 shadow-lg text-center flex flex-col items-center">
          <div className="w-32 h-32 bg-white rounded-2xl p-2 mb-4 flex items-center justify-center">
            {/* Placeholder for QR Code */}
            <QrCode className="w-full h-full text-slate-900" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">عمر أحمد راضي</h2>
          <span className="text-sm text-purple-400 font-semibold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 mb-2">كود: 10234</span>
          <p className="text-xs text-slate-400">الصف الأول الثانوي</p>
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
                  defaultValue="عمر أحمد راضي" 
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-slate-300 opacity-70 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">المرحلة الدراسية</label>
                <input 
                  type="text" 
                  defaultValue="الصف الأول الثانوي" 
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-slate-300 opacity-70 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">رقم الهاتف الأساسي</label>
                <input 
                  type="tel" 
                  defaultValue="01011122233" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">كلمة المرور</label>
                <input 
                  type="password" 
                  placeholder="******" 
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
