'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { User, Phone, Settings, Lock, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function ParentProfilePage() {
  const [parent, setParent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/parent-portal/profile');
      const data = await res.json();
      if (data.success) {
        setParent(data.parent);
        setPhone(data.parent.phone || '');
        setWhatsapp(data.parent.whatsapp || '');
      } else {
        toast.error(data.error || 'تعذر تحميل بيانات الملف الشخصي');
      }
    } catch (e) {
      console.error(e);
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error('رقم الهاتف الأساسي مطلوب');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/parent-portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          whatsapp,
          ...(password && { password }),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('تم تحديث البيانات بنجاح! 🎉');
        setPassword('');
        await fetchProfile();
      } else {
        toast.error(data.error || 'حدث خطأ أثناء حفظ البيانات');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-white animate-pulse">جارٍ تحميل الملف الشخصي...</div>;
  }

  if (!parent) {
    return (
      <div className="text-center py-20 text-rose-400 font-bold">
        لم يتم العثور على بيانات الحساب. يرجى تسجيل الدخول مجدداً.
      </div>
    );
  }

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
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 border-4 border-white/10 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--p)) 0%, rgb(var(--s)) 100%)'
            }}
          >
            {parent.name ? parent.name.charAt(0) : 'و'}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{parent.name}</h2>
          <span className="text-xs text-purple-400 font-semibold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            الحساب: {parent.relation === 'Father' ? 'ولي الأمر (الأب)' : parent.relation === 'Mother' ? 'ولي الأمر (الأم)' : `ولي الأمر (${parent.relation})`}
          </span>
        </div>

        <div className="md:col-span-2 glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <span>المعلومات الأساسية وإعدادات الحساب</span>
          </h3>
          
          <form className="space-y-5" onSubmit={handleSave}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">الاسم بالكامل</label>
                <input 
                  type="text" 
                  value={parent.name} 
                  disabled
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-slate-400 opacity-60 cursor-not-allowed text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">الصلة بالطلاب</label>
                <input 
                  type="text" 
                  value={parent.relation === 'Father' ? 'الأب' : parent.relation === 'Mother' ? 'الأم' : parent.relation} 
                  disabled
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-slate-400 opacity-60 cursor-not-allowed text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">رقم الهاتف الأساسي</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-500" />
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl pr-10 pl-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm transition-all"
                    placeholder="رقم الهاتف الجديد"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">رقم WhatsApp (للتنبيهات)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-500" />
                  <input 
                    type="tel" 
                    value={whatsapp} 
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl pr-10 pl-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm transition-all"
                    placeholder="رقم واتساب الفعال"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-2">تغيير كلمة المرور</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-500" />
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="اتركها فارغة إذا لم ترد تغيير كلمة المرور" 
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl pr-10 pl-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm transition-all"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <button 
                type="submit"
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-purple-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ البيانات...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
