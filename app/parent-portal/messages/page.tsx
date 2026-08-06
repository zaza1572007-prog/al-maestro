'use client';

import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { MessageSquare, Send } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="space-y-8">
      <HeroHeader
        title="التواصل والملاحظات 💬"
        badge="بوابة ولي الأمر"
        subtitle="التواصل المباشر مع الأستاذ أو الإدارة"
        stats={[]}
      />

      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <span>إرسال رسالة جديدة</span>
        </h2>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">موضوع الرسالة</label>
            <input 
              type="text" 
              placeholder="مثال: استفسار عن مستوى الابن" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">نص الرسالة</label>
            <textarea 
              rows={5} 
              placeholder="اكتب رسالتك هنا..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            ></textarea>
          </div>
          <button className="bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-8 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-purple-500/30">
            <span>إرسال الرسالة</span>
            <Send className="w-4 h-4 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
