'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Wifi, WifiOff, Laptop } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

/**
 * Real live network & backend server connectivity status hook.
 * Performs real live heartbeat HTTP pings to /api/health with timeout.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const checkRealConnection = useCallback(async () => {
    // 1. Check browser network interface first
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return;
    }

    // 2. Perform live HTTP heartbeat check against /api/health with a 4s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/health?t=' + Date.now(), {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      // Network error, timeout, or server unreachable
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check connection immediately on mount
    checkRealConnection();

    // Listen to browser network change events
    const handleOnline = () => checkRealConnection();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Live heartbeat ping every 10 seconds to verify real backend status
    const interval = setInterval(checkRealConnection, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkRealConnection]);

  return isOnline;
}

export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [canInstall, setCanInstall] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already running in standalone display mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setCanInstall(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return { canInstall, isInstalled, triggerInstall };
}

/**
 * Synthesizes a soft, harmonic notification chime when connection returns
 */
function playSoftOnlineChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, now + 0.04); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.16); // C6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.04);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch {
    // AudioContext autoplay restriction safeguard
  }
}

/**
 * Global PWA Status Manager component that registers the Service Worker
 * and shows online/offline toast notifications based on real server connection.
 */
export default function PwaStatusManager() {
  const isOnline = useNetworkStatus();
  const [prevStatus, setPrevStatus] = useState<boolean | null>(null);
  const toast = useToast();

  useEffect(() => {
    // Register Service Worker for PWA capabilities
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Service Worker registered:', reg.scope))
        .catch((err) => console.warn('Service Worker registration failed:', err));
    }
  }, []);

  useEffect(() => {
    if (prevStatus !== null && prevStatus !== isOnline) {
      if (isOnline) {
        playSoftOnlineChime();
        toast.success('تمت استعادة الاتصال بالسيرفر 🌐 - جاري مزامنة البيانات');
        // Dispatch event for offline sync queue if listeners exist
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('maestro-sync-offline-queue'));
        }
      } else {
        toast.info('وضع عدم الاتصال ⚡ - يتم الحفظ محلياً تلقائياً');
      }
    }
    setPrevStatus(isOnline);
  }, [isOnline, prevStatus, toast]);

  return null;
}

/**
 * Dynamic Real Network & Server Status Badge component (Online 🟢 / Offline ⚡)
 */
export function NetworkStatusBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const isOnline = useNetworkStatus();

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all border shadow-sm ${
        isOnline
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10'
          : 'bg-amber-500/15 border-amber-500/35 text-amber-600 dark:text-amber-400 shadow-amber-500/10 animate-pulse'
      } ${
        size === 'sm' ? 'text-[10px] py-0.5 px-2' : size === 'lg' ? 'text-sm py-1.5 px-4' : 'text-xs'
      }`}
    >
      {isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>النظام متصل بالسيرفر 🟢</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>وضع عدم الاتصال ⚡ - يتم الحفظ محلياً</span>
        </>
      )}
    </motion.div>
  );
}

/**
 * PWA Install Button component
 */
export function PwaInstallButton({ className = '' }: { className?: string }) {
  const { canInstall, isInstalled, triggerInstall } = usePwaInstallPrompt();
  const toast = useToast();

  const handleInstallClick = async () => {
    const installed = await triggerInstall();
    if (installed) {
      toast.success('تم تثبيت تطبيق المايسترو بنجاح على جهازك! 🎉');
    }
  };

  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/10 text-xs font-semibold text-slate-300">
        <Laptop className="w-3.5 h-3.5 text-emerald-400" />
        <span>تطبيق مثبت ✅</span>
      </div>
    );
  }

  if (!canInstall) {
    return (
      <button
        onClick={() => {
          toast.info('التطبيق مثبت بالفعل أو يمكنك تثبيته من خيارات المتصفح (⋮) -> "التثبيت كـ تطبيق" 📲');
        }}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer ${className}`}
        title="تثبيت التطبيق على جهازك"
      >
        <Download className="w-3.5 h-3.5 text-purple-400 animate-bounce" />
        <span>تثبيت التطبيق 📱</span>
      </button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={handleInstallClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer border border-white/20 ${className}`}
    >
      <Download className="w-4 h-4 text-white animate-bounce" />
      <span>📥 تثبيت التطبيق على الجهاز</span>
    </motion.button>
  );
}
