'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, Sparkles, AlertCircle, CheckCircle2, SwitchCamera } from 'lucide-react';

interface CameraQrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  continuous?: boolean;
}

export default function CameraQrScanner({
  isOpen,
  onClose,
  onScan,
  title = 'مسح رمز QR أو الباركود بالكاميرا',
  continuous = true,
}: CameraQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cooldownRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMsg('');
    setHasCamera(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('المتصفح لا يدعم الوصول المباشر لكاميرا الجهاز.');
      setHasCamera(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setHasCamera(true);
        setIsScanning(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('تم رفض إذن الوصول للكاميرا. يرجى السماح للموقع باستخدام الكاميرا من إعدادات المتصفح.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('لم يتم العثور على كاميرا متصلة بالجهاز.');
      } else {
        setErrorMsg('تعذر تشغيل الكاميرا: ' + (err.message || 'خطأ غير معروف'));
      }
      setHasCamera(false);
    }
  }, [cameraFacing, stopCamera]);

  // Frame detection loop
  useEffect(() => {
    if (!isOpen || !isScanning || !hasCamera) return;

    let detector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix'],
        });
      } catch (e) {
        console.warn('BarcodeDetector format init error:', e);
      }
    }

    const scanFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      if (detector && !cooldownRef.current) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawVal = barcodes[0].rawValue || barcodes[0].displayValue;
            if (rawVal && rawVal.trim()) {
              const code = rawVal.trim();
              setLastScanned(code);
              cooldownRef.current = true;

              try {
                if (navigator.vibrate) navigator.vibrate(80);
              } catch {}

              onScan(code);

              if (!continuous) {
                stopCamera();
                onClose();
                return;
              }

              setTimeout(() => {
                cooldownRef.current = false;
              }, 1800);
            }
          }
        } catch (e) {
          // ignore detection frame errors
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isOpen, isScanning, hasCamera, continuous, onClose, onScan, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">وجه الكاميرا نحو كود الـ QR أو الباركود</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCameraFacing}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
              title="تبديل الكاميرا (الأمامية / الخلفية)"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-rose-900/50 hover:text-rose-300 text-slate-400 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Viewport */}
        <div className="relative bg-black aspect-video sm:aspect-square flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Scanner Overlay HUD */}
          {hasCamera && isScanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Darkened edges around target box */}
              <div className="relative w-64 h-64 border-2 border-blue-500/60 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                {/* Target Corners */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />

                {/* Laser scan animation line */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#60a5fa] animate-pulse" />

                {/* Last scan indicator */}
                {lastScanned && (
                  <div className="absolute -bottom-10 bg-emerald-500/90 text-white font-bold text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم التقاط: {lastScanned}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading / Error States */}
          {hasCamera === null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 p-6 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
              <p className="text-xs text-slate-300">جارٍ تهيئة كاميرا الجهاز...</p>
            </div>
          )}

          {hasCamera === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-rose-300">تعذر فتح الكاميرا</p>
              <p className="text-xs text-slate-400 max-w-xs">{errorMsg}</p>
              <button
                onClick={startCamera}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> إعادة المحاولة
              </button>
            </div>
          )}
        </div>

        {/* Footer info & Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>المسح التلقائي قيد العمل ⚡</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
          >
            إغلاق الكاميرا
          </button>
        </div>
      </div>
    </div>
  );
}
