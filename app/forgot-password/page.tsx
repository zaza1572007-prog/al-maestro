'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ToastProvider';
import {
  Phone,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Users,
  Send,
  MessageSquare
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const { success: showToastSuccess, error: showToastError } = useToast();
  const [role, setRole] = useState<'STUDENT' | 'PARENT'>('STUDENT');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  let roleTitle = "الطالب";
  let RoleIcon = GraduationCap;

  if (role === 'PARENT') {
    roleTitle = "ولي الأمر";
    RoleIcon = Users;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'تم إرسال كلمة المرور الجديدة عبر الواتساب!');
        showToastSuccess(data.message || 'تم الإرسال بنجاح!');
      } else {
        setError(data.error || 'فشل إرسال كلمة المرور. يرجى التحقق من الرقم والبيانات.');
        showToastError(data.error || 'حدث خطأ أثناء المعالجة.');
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.');
      showToastError('خطأ في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#060913] p-4 relative overflow-hidden">
      {/* Background ambient glows to match login page */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/15 shadow-2xl z-10 text-right backdrop-blur-2xl">
        {/* Back button */}
        <Link href={`/login?role=${role}`} className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 mb-6 font-semibold transition-colors">
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع لصفحة تسجيل الدخول</span>
        </Link>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 p-0.5 shadow-2xl shadow-purple-500/30 flex items-center justify-center border border-white/20"
          >
            <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center font-black text-2xl text-white">
              <RoleIcon className="w-10 h-10 text-purple-400" />
            </div>
          </motion.div>

          <h1 className="text-2xl font-black text-white tracking-tight">استعادة كلمة المرور</h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">
            سيتم توليد كلمة مرور جديدة وإرسالها فوراً لبرنامج الواتساب الخاص بك
          </p>
        </div>

        {/* Role Selector Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-950/60 p-1 rounded-2xl border border-white/5">
          <button
            type="button"
            onClick={() => setRole('STUDENT')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${role === 'STUDENT' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>حساب طالب</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('PARENT')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${role === 'PARENT' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Users className="w-4 h-4" />
            <span>حساب ولي أمر</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        {successMsg ? (
          <div className="space-y-4 text-center py-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl font-semibold leading-relaxed">
              {successMsg}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <MessageSquare className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>يرجى التحقق من تطبيق WhatsApp على هاتفك.</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">رقم الهاتف المسجل بالنظام *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: 01000000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full glass-input py-3.5 px-4 pr-11 text-slate-100 placeholder-slate-500 focus:outline-none"
                />
                <Phone className="w-5 h-5 absolute right-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 glass-button-primary font-bold text-sm rounded-2xl shadow-xl shadow-purple-500/25 transition duration-200 mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  جاري إرسال كلمة المرور...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4 rotate-180" />
                  <span>إرسال كلمة المرور الجديدة للواتساب 💬</span>
                </>
              )}
            </motion.button>
          </form>
        )}

        <div className="mt-8 text-center text-[11px] text-slate-500 border-t border-white/10 pt-4">
          منصة المايسترو الإلكترونية الفاخرة © {new Date().getFullYear()}
        </div>
      </div>
    </main>
  );
}
