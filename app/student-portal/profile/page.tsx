'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { User, Settings, QrCode, Phone, Lock, Save, Printer, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function StudentProfilePage() {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/student-portal/profile');
      const data = await res.json();
      if (data.success) {
        setStudent(data.student);
        setPhone(data.student.phone || '');
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
      toast.error('رقم الهاتف مطلوب');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/student-portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          ...(password && { password }),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('تم تحديث البيانات الشخصية بنجاح! 🎉');
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-20 text-white animate-pulse">جارٍ تحميل الملف الشخصي...</div>;
  }

  if (!student) {
    return (
      <div className="text-center py-20 text-rose-400 font-bold">
        لم يتم العثور على بيانات الطالب. يرجى تسجيل الدخول مجدداً.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header - Hidden on Print */}
      <div className="no-print">
        <HeroHeader
          title="الملف الشخصي 👤"
          badge="بوابة الطالب"
          subtitle="إدارة بياناتك الشخصية وعرض رمز الـ QR الخاص بك"
          stats={[]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Printable Digital ID Card */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div 
            id="student-id-card"
            className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900/90 text-center flex flex-col items-center select-none"
            style={{
              boxShadow: '0 10px 30px -10px rgb(var(--p) / 0.3)'
            }}
          >
            {/* Glowing Accent Ring */}
            <div className="absolute -top-20 -right-20 w-44 h-44 bg-gradient-to-br from-purple-600/20 to-blue-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-gradient-to-br from-pink-500/15 to-purple-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Card Header branding */}
            <div className="w-full flex items-center justify-between border-b border-white/10 pb-3.5 mb-4">
              <span className="text-[10px] font-black text-purple-400 tracking-wider">بطاقة الطالب الرقمية</span>
              <span className="text-[9px] text-slate-400 font-bold">منصة المايسترو 🎓</span>
            </div>

            {/* Profile Avatar */}
            <div className="relative mb-3.5">
              <div 
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-extrabold text-3xl border-2 border-white/10 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--p)) 0%, rgb(var(--s)) 100%)'
                }}
              >
                {student.name ? student.name.charAt(0) : 'ط'}
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 border-2 border-slate-950 w-4.5 h-4.5 rounded-full" />
            </div>

            <h2 className="text-lg font-black text-white leading-tight">{student.name}</h2>
            <span className="text-[11px] text-purple-300 font-bold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 mt-1.5 mb-3.5 select-all">
              كود الحساب: {student.code}
            </span>

            {/* Stage and Group Details */}
            <div className="w-full space-y-1.5 text-right bg-white/5 border border-white/5 rounded-2xl p-3 text-xs mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">المرحلة الدراسية:</span>
                <span className="text-slate-200 font-bold">{student.stageName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">المجموعة التعليمية:</span>
                <span className="text-slate-200 font-bold">{student.groupName}</span>
              </div>
            </div>

            {/* Dynamic CSS Barcode */}
            <div className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-inner w-full">
              <div className="h-12 flex items-stretch gap-[1.5px] bg-white px-2 w-full justify-center">
                {(student.qrCode || student.code || "STU-0000").split('').map((char: string, i: number) => {
                  const width = (char.charCodeAt(0) % 3) + 1;
                  const isGap = (char.charCodeAt(0) % 2) === 0;
                  return (
                    <div 
                      key={i} 
                      className="bg-black" 
                      style={{ 
                        width: `${width}px`, 
                        opacity: isGap ? 0.15 : 1 
                      }} 
                    />
                  );
                })}
              </div>
              <span className="font-mono text-[9px] text-black tracking-widest font-bold">
                {student.qrCode || student.code}
              </span>
            </div>
          </div>

          <button 
            onClick={handlePrint}
            className="no-print bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all w-full text-xs shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4 text-purple-400" />
            <span>طباعة بطاقة الطالب (ID)</span>
          </button>
        </div>

        {/* Right Column: Editable Basic Information */}
        <div className="md:col-span-2 glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg no-print">
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
                  value={student.name} 
                  disabled
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-slate-400 opacity-60 cursor-not-allowed text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">كود الحساب (رقم العضوية)</label>
                <input 
                  type="text" 
                  value={student.code} 
                  disabled
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-slate-400 opacity-60 cursor-not-allowed text-sm font-mono"
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
                    placeholder="أدخل رقم الهاتف الجديد"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">تغيير كلمة المرور</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-500" />
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="اتركها فارغة إذا لم ترد التغيير" 
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl pr-10 pl-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Parent Details section */}
            <div className="border-t border-white/10 pt-5 mt-6">
              <h4 className="text-sm font-bold text-slate-300 mb-4">بيانات ولي الأمر (للمتابعة)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/3 border border-white/5 rounded-2xl p-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">اسم ولي الأمر:</span>
                  <span className="text-white font-bold text-sm">{student.parentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">صلة القرابة:</span>
                  <span className="text-white font-bold text-sm">{student.parentRelation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">رقم هاتف ولي الأمر:</span>
                  <span className="text-white font-bold text-sm font-mono">{student.parentPhone}</span>
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
                    <span>جاري الحفظ...</span>
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
