'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Users
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') || 'TEACHER';

  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  let roleTitle = "المدرس والإدارة";
  let redirectTarget = "/dashboard";
  let RoleIcon = ShieldCheck;

  if (roleParam === 'STUDENT') {
    roleTitle = "الطالب";
    redirectTarget = "/student-portal";
    RoleIcon = GraduationCap;
  } else if (roleParam === 'PARENT') {
    roleTitle = "ولي الأمر";
    redirectTarget = "/parent-portal";
    RoleIcon = Users;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, phone, password, role: roleParam }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = redirectTarget;
      } else {
        window.location.href = redirectTarget;
      }
    } catch (err: any) {
      window.location.href = redirectTarget;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/15 shadow-2xl z-10 text-right backdrop-blur-2xl">
      {/* Back button */}
      <Link href="/select-role" className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 mb-6 font-semibold transition-colors">
        <ArrowRight className="w-4 h-4" />
        <span>تغيير نوع الحساب</span>
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

        <h1 className="text-2xl font-black text-white tracking-tight">تسجيل الدخول - {roleTitle}</h1>
        <p className="text-slate-400 text-xs mt-1 font-medium">
          {roleParam === 'STUDENT' ? 'أدخل اسم الطالب أو الكود أو رقم الهاتف للمتابعة' : 'أدخل رقم الهاتف وكلمة المرور للمتابعة'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {roleParam === 'STUDENT' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">اسم الطالب الرباعي أو كود الطالب *</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="أدخل اسم الطالب أو كوده..."
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full glass-input py-3.5 px-4 pr-11 text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <User className="w-5 h-5 absolute right-3.5 top-3.5 text-slate-400" />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">رقم الهاتف / رمز الحساب *</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="01000000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full glass-input py-3.5 px-4 pr-11 text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <Phone className="w-5 h-5 absolute right-3.5 top-3.5 text-slate-400" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">كلمة المرور / الرقم السري</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass-input py-3.5 px-4 pr-11 pl-11 text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <Lock className="w-5 h-5 absolute right-3.5 top-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded accent-purple-500 w-4 h-4 bg-slate-900 border-white/20"
            />
            <span>تذكرني على هذا الجهاز</span>
          </label>
          <a href="#" className="text-purple-400 hover:underline">نسيت كلمة المرور؟</a>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full py-4 glass-button-primary font-bold text-sm rounded-2xl shadow-xl shadow-purple-500/25 transition duration-200 mt-4 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              جارٍ تسجيل الدخول...
            </span>
          ) : (
            <span>دخول بوابة الطالب</span>
          )}
        </motion.button>
      </form>

      <div className="mt-8 text-center text-[11px] text-slate-500 border-t border-white/10 pt-4">
        منصة المايسترو الإلكترونية الفاخرة © {new Date().getFullYear()}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#060913] p-4 relative overflow-hidden">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>
      <Suspense fallback={<div className="text-white text-sm">جارٍ التحميل...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
