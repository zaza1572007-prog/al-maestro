'use client';

import { useState } from 'react';

export default function AttendancePage() {
  const [code, setCode] = useState('');
  const [lastScan, setLastScan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [manualStatus, setManualStatus] = useState('PRESENT');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentCode: code, status: manualStatus }),
      });
      const data = await res.json();
      setLastScan(data);
    } catch (err: any) {
      setLastScan({ success: false, error: err.message });
    } finally {
      setLoading(false);
      setCode('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📱 ماسح الـ QR Code وتسجيل الحضور الفوري</h1>
          <p className="text-slate-400 text-sm mt-1">تسجيل الحضور التلقائي عبر الكاميرا/الرمز مع التنبيه الصوتي وإشعارات الواتساب</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Simulation Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <span>📷</span> الماسح الضوئي اللحظي (QR Scanner)
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              الكاميرا نشطة 🟢
            </span>
          </div>

          {/* Camera Viewport Placeholder */}
          <div className="w-full h-56 bg-slate-950 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="w-36 h-36 border-2 border-blue-500 rounded-xl flex items-center justify-center text-blue-400 animate-pulse">
              <span className="text-xs font-mono">وجه رمز QR هنا</span>
            </div>
            <p className="text-xs text-slate-500 mt-3">يدعم أجهزة اللابتوب والهواتف المحمولة</p>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleScan} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">إدخال كود الطالب / الـ QR يدوياً</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="مثال: STU-1001 أو QR-STU-1001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition text-sm flex items-center gap-2"
                >
                  {loading ? 'تسجيل...' : 'تسجيل حضور ↵'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">حالة التسجيل:</span>
              {['PRESENT', 'LATE', 'EXCUSED'].map((st) => (
                <label key={st} className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={manualStatus === st}
                    onChange={() => setManualStatus(st)}
                  />
                  {st === 'PRESENT' ? 'حاضر' : st === 'LATE' ? 'متأخر' : 'غياب بعذر'}
                </label>
              ))}
            </div>
          </form>
        </div>

        {/* Scan Result Feedback Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="font-bold text-white border-b border-slate-800 pb-4 flex items-center justify-between">
            <span>📋 نتيجة آخر عملية تسجيل</span>
            {lastScan?.whatsappSent && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                تم إرسال إشعار WhatsApp 💬
              </span>
            )}
          </h2>

          {lastScan ? (
            <div className={`p-5 rounded-2xl border ${lastScan.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-lg">{lastScan.student?.name || 'غير معروف'}</span>
                <span className="font-mono text-xs bg-slate-950/60 px-2 py-1 rounded">{lastScan.student?.code}</span>
              </div>
              <p className="text-xs">{lastScan.message || lastScan.error}</p>
              {lastScan.student?.hasActiveSub ? (
                <div className="text-xs text-emerald-400 font-semibold">الاشتراك نشط السداد ✅</div>
              ) : (
                <div className="text-xs text-amber-400 font-semibold">تنبيه: الاشتراك منتهي الصلاحية ⚠️</div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm border border-slate-800/80 rounded-2xl">
              في انتظار أول عملية مسح رمز QR...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
