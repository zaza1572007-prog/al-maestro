'use client';

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getOfflineQueueStats, syncAllOfflineQueues, SyncProgressInfo } from '@/lib/offlineSync';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [progressInfo, setProgressInfo] = useState<SyncProgressInfo | null>(null);

  const updateStats = async () => {
    const stats = await getOfflineQueueStats();
    setPendingCount(stats.total);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    updateStats();

    const handleOnline = () => {
      setIsOnline(true);
      handleTriggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStats();
    };

    const handleQueueChange = () => {
      updateStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('maestro-offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('maestro-offline-queue-changed', handleQueueChange);
    };
  }, []);

  const handleTriggerSync = async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      await syncAllOfflineQueues((info) => {
        setProgressInfo(info);
      });
      await updateStats();
    } catch (err) {
      console.error('Failed to trigger manual sync:', err);
    } finally {
      setSyncing(false);
      setTimeout(() => setProgressInfo(null), 3000);
    }
  };

  if (isOnline && pendingCount === 0 && !progressInfo) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 transition-all duration-300">
      {!isOnline ? (
        <div className="bg-amber-950/90 border border-amber-500/40 text-amber-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-xs">وضع العمل بدون إنترنت (الأوفلاين) 📶</p>
              <p className="text-[11px] text-amber-300/80">
                {pendingCount > 0
                  ? `يوجد ${pendingCount} عملية محفوظة محلياً تنتظر التزامن`
                  : 'يتم حفظ عملياتك محلياً في الذاكرة بأمان'}
              </p>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg">
              {pendingCount}
            </span>
          )}
        </div>
      ) : syncing || (progressInfo && progressInfo.status === 'syncing') ? (
        <div className="bg-blue-950/90 border border-blue-500/40 text-blue-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
            <div>
              <p className="font-bold text-xs">جارٍ مزامنة العمليات المعلقة... 🔄</p>
              <p className="text-[11px] text-blue-300/80">
                {progressInfo?.currentItem || `تم إنجاز ${progressInfo?.percentage || 0}%`}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-400">{progressInfo?.percentage}%</span>
        </div>
      ) : pendingCount > 0 ? (
        <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="font-bold text-xs">تم استعادة الاتصال بالإنترنت! 🌐</p>
              <p className="text-[11px] text-emerald-300/80">يوجد {pendingCount} عملية معلقة جاهزة للرفع</p>
            </div>
          </div>
          <button
            onClick={handleTriggerSync}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition cursor-pointer"
          >
            مزامنة الآن 🔄
          </button>
        </div>
      ) : null}
    </div>
  );
}
