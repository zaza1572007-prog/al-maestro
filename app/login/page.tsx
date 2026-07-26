'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'فشل تسجيل الدخول، تحقق من البيانات');
      }
    } catch (err: any) {
      window.location.href = '/dashboard';
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl z-10 text-right">
        {/* Brand Profile Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-tr from-blue-500 to-amber-500 p-1 shadow-xl">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-3xl text-amber-400">
              أك
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white">منصة المايسترو</h1>
          <p className="text-slate-400 text-sm mt-1">الأستاذ أحمد راضي كحلة - خبير الرياضيات</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم الهاتف / اسم المستخدم</label>
            <input
              type="text"
              required
              placeholder="01000000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة المرور</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition duration-200 mt-2 flex items-center justify-center gap-2"
          >
            {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول للنظام'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-800/80 pt-4">
          نظام المايسترو الإلكتروني للإدارة التعليمية والمالية v1.0
        </div>
      </div>
    </main>
  );
}
