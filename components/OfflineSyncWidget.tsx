'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, CheckCircle2, AlertCircle, RefreshCw, Loader2, ArrowUpRight } from 'lucide-react';
import {
  getOfflineQueueStats,
  syncAllOfflineQueues,
  QueueStats,
  SyncProgressInfo,
} from '@/lib/offlineSync';
import { useNetworkStatus } from '@/components/PwaStatusManager';
import { useToast } from '@/components/ToastProvider';

export default function OfflineSyncWidget() {
  const isOnline = useNetworkStatus();
  const toast = useToast();

  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    students: 0,
    groups: 0,
    payments: 0,
    attendances: 0,
  });

  const [progressInfo, setProgressInfo] = useState<SyncProgressInfo>({
    status: 'idle',
    current: 0,
    total: 0,
    percentage: 0,
  });

  const loadStats = useCallback(async () => {
    const s = await getOfflineQueueStats();
    setStats(s);
  }, []);

  useEffect(() => {
    loadStats();

    const handleQueueChange = () => loadStats();
    window.addEventListener('maestro-offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('maestro-offline-queue-changed', handleQueueChange);
    };
  }, [loadStats]);

  // Auto-sync when internet comes back online and there are items in queue
  useEffect(() => {
    if (isOnline && stats.total > 0 && progressInfo.status !== 'syncing') {
      startSync();
    }
  }, [isOnline, stats.total]);

  const startSync = async () => {
    if (!isOnline) {
      toast.error('لا يمكن بدء الرفع والسيرفر/الإنترنت غير متصل');
      return;
    }

    setProgressInfo({
      status: 'syncing',
      current: 0,
      total: stats.total,
      percentage: 0,
    });

    try {
      const result = await syncAllOfflineQueues((info) => {
        setProgressInfo(info);
      });

      if (result.status === 'completed') {
        toast.success(`تمت مزامنة ورفع ${result.total} سجلات إلى السيرفر بنجاح! 🎉`);
        await loadStats();
        setTimeout(() => {
          setProgressInfo({ status: 'idle', current: 0, total: 0, percentage: 0 });
        }, 3000);
      }
    } catch (err: any) {
      setProgressInfo({
        status: 'error',
        current: 0,
        total: stats.total,
        percentage: 0,
        error: err.message || 'فشلت المزامنة',
      });
    }
  };

  // If 0 items pending and not syncing, hide widget
  if (stats.total === 0 && progressInfo.status === 'idle') {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-5 z-[9990] max-w-sm w-full pointer-events-auto">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="glass-panel p-4 rounded-3xl border border-indigo-500/30 bg-slate-950/90 shadow-2xl space-y-3 backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <UploadCloud className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">خانة متابعة معدل الرفع</h5>
                <p className="text-[10px] text-slate-400">
                  {stats.total > 0
                    ? `يوجد (${stats.total}) سجلات متبقية للرفع`
                    : 'جميع السجلات مرفوعة بنجاح'}
                </p>
              </div>
            </div>

            {isOnline && progressInfo.status !== 'syncing' && stats.total > 0 && (
              <button
                onClick={startSync}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[11px] transition shadow flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>رفع الآن</span>
              </button>
            )}
          </div>

          {/* Breakdown summary */}
          {stats.total > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-300 bg-white/5 p-2 rounded-xl border border-white/5">
              {stats.students > 0 && <span className="bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/30">طلاب: {stats.students}</span>}
              {stats.groups > 0 && <span className="bg-blue-500/20 px-2 py-0.5 rounded-lg border border-blue-500/30">مجموعات: {stats.groups}</span>}
              {stats.payments > 0 && <span className="bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">اشتراكات: {stats.payments}</span>}
              {stats.attendances > 0 && <span className="bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">حضور: {stats.attendances}</span>}
            </div>
          )}

          {/* Progress Bar during Sync */}
          {progressInfo.status === 'syncing' && (
            <div className="space-y-1.5 pt-1 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-indigo-300 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>معدل الرفع الحالي:</span>
                </span>
                <span className="text-emerald-400 font-mono">
                  {progressInfo.current} / {progressInfo.total} ({progressInfo.percentage}%)
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/10">
                <motion.div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressInfo.percentage}%` }}
                />
              </div>

              {progressInfo.currentItem && (
                <p className="text-[10px] text-slate-400 truncate text-right">
                  جارٍ رفع: <b className="text-slate-200">{progressInfo.currentItem}</b>
                </p>
              )}
            </div>
          )}

          {/* Status Message when Completed */}
          {progressInfo.status === 'completed' && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>تم رفع وتحديث جميع التغييرات على السيرفر بنجاح! ✅</span>
            </div>
          )}

          {/* Status Message when Offline */}
          {!isOnline && (
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>أنت أوفلاين. سيتم بدء الرفع التلقائي بمجرد توفر اتصال السيرفر 📡</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
