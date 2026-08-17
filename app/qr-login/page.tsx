'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function QrLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMsg('رمز QR مفقود أو غير صالح');
      return;
    }

    const login = async () => {
      try {
        const res = await fetch('/api/auth/qr-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (data.success) {
          setStatus('success');
          // Short delay to show success state then redirect
          setTimeout(() => {
            router.replace(data.redirectTo);
          }, 600);
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'رمز QR غير صالح');
        }
      } catch {
        setStatus('error');
        setErrorMsg('حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.');
      }
    };

    login();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full">
        {status === 'loading' && (
          <div className="space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-purple-500 animate-spin" />
              <div className="absolute inset-3 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="text-3xl">📱</span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">جارٍ التحقق من رمز QR</h2>
              <p className="text-slate-400 text-sm mt-2">يتم التحقق من هويتك وتسجيل دخولك تلقائياً...</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
              <span className="text-5xl">✅</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-400">تم تسجيل الدخول بنجاح!</h2>
              <p className="text-slate-400 text-sm mt-2">جارٍ تحويلك للبوابة المناسبة...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center">
              <span className="text-5xl">❌</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-400">فشل تسجيل الدخول</h2>
              <p className="text-slate-400 text-sm mt-2">{errorMsg}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20"
              >
                🔑 تسجيل الدخول يدوياً
              </button>
              <button
                onClick={() => router.push('/select-role')}
                className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all duration-200"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QrLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <QrLoginInner />
    </Suspense>
  );
}
