'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Wifi, WifiOff, Laptop } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
      // Prevent automatic browser banner so we can trigger custom prompt
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
 * Global PWA Status Manager component that registers the Service Worker
 * and shows online/offline toast notifications.
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
        toast.success('تمت إعادة الاتصال بالإنترنت - أنت أونلاين الآن 🌐');
      } else {
        toast.error('انقطع الاتصال بالإنترنت - تعمل الآن في وضع الأوفلاين 📡');
      }
    }
    setPrevStatus(isOnline);
  }, [isOnline, prevStatus, toast]);

  return null;
}

/**
 * Dynamic Network Status Badge component (Online 🟢 / Offline 🔴)
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
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
          : 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/10 animate-pulse'
      } ${
        size === 'sm' ? 'text-[10px] py-0.5 px-2' : size === 'lg' ? 'text-sm py-1.5 px-4' : 'text-xs'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>النظام متصل (أونلاين) 🟢</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>وضع الأوفلاين (غير متصل) 🔴</span>
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
          toast.info('لتثبيت التطبيق على جهازك: افتح خيارات المتصفح (⋮) واضغط "التثبيت كـ تطبيق" أو "Install App" 📲');
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
