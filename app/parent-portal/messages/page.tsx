'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function MessagesPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const id = localStorage.getItem('selectedChildId');
    setChildId(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId) {
      toast.error('يرجى اختيار الابن أولاً من لوحة التحكم لمتابعة مراسلته.');
      return;
    }
    if (!title.trim() || !message.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/parent-portal/children/${childId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'تم إرسال رسالتك بنجاح! 📨');
        setTitle('');
        setMessage('');
      } else {
        toast.error(data.error || 'فشل إرسال الرسالة. حاول مرة أخرى.');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setSubmitting(false);
    }
  };

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

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">موضوع الرسالة</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: استفسار عن مستوى الابن" 
              className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">نص الرسالة</label>
            <textarea 
              rows={5} 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا بالتفصيل ليتمكن المعلم من المراجعة والرد..." 
              className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm transition-all resize-none"
            ></textarea>
          </div>
          <button 
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-8 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-purple-500/30 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إرسال الرسالة...</span>
              </>
            ) : (
              <>
                <span>إرسال الرسالة</span>
                <Send className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
