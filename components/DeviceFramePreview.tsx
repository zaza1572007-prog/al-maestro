'use client';

import React from 'react';
import { DevicePortraitConfig } from './TeacherOverlay';
import { Layout, Maximize2, ShieldCheck, Sparkles, User, Users, BookOpen, CreditCard } from 'lucide-react';

interface DeviceFramePreviewProps {
  device: 'desktop' | 'tablet' | 'mobile';
  config: DevicePortraitConfig;
  imgSrc: string | null;
  platformName?: string;
}

export default function DeviceFramePreview({
  device,
  config,
  imgSrc,
  platformName = 'منصة المايسترو',
}: DeviceFramePreviewProps) {
  const isCenter = config.position === 'center';
  const isVisible = config.visible;

  // Calculate transform style
  const imageTransform = `scale(${config.scale}) translate(${config.posX || 0}%, ${
    (config.posY || 0) + (1 - config.scale) * 8
  }%)`;

  const maskGradient =
    device === 'mobile'
      ? 'radial-gradient(ellipse at 50% 80%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 85%)'
      : isCenter
      ? 'linear-gradient(to top, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)'
      : 'linear-gradient(to top, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%), linear-gradient(to right, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)';

  return (
    <div className="w-full flex flex-col items-center justify-center p-3 sm:p-6 bg-slate-950/80 rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ──────────────── Desktop / Laptop Mockup ──────────────── */}
      {device === 'desktop' && (
        <div className="w-full max-w-xl flex flex-col items-center">
          {/* Laptop Lid / Screen */}
          <div className="w-full aspect-[16/10] bg-slate-900 rounded-t-2xl border-2 border-slate-700/80 shadow-2xl overflow-hidden flex flex-col relative">
            {/* Top window bar */}
            <div className="h-7 bg-slate-950/90 border-b border-white/5 px-3 flex items-center justify-between text-[10px] text-slate-400 select-none z-20">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-slate-800/80 text-slate-300 font-mono text-[9px] border border-white/5">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                {platformName} — لوحة التحكم
              </div>
              <div className="w-10" />
            </div>

            {/* Mock Dashboard Screen Interior */}
            <div className="flex-1 bg-slate-950 flex flex-row overflow-hidden relative select-none">
              {/* Teacher Image Overlay (Positioned inside mockup) */}
              {imgSrc && isVisible && (
                <div
                  className="absolute bottom-0 left-0 h-full pointer-events-none z-0 flex items-end justify-center overflow-hidden transition-all duration-200"
                  style={{
                    width: isCenter ? '100%' : '50%',
                  }}
                >
                  <div
                    className="w-full h-full flex items-end justify-center"
                    style={{
                      transform: imageTransform,
                      transformOrigin: isCenter ? 'center bottom' : 'left bottom',
                      maskImage: maskGradient,
                      WebkitMaskImage: maskGradient,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt=""
                      className="w-full h-full object-contain object-bottom"
                      style={{ opacity: config.opacity }}
                    />
                  </div>
                </div>
              )}

              {/* Sidebar silhouette */}
              <div className="w-16 bg-slate-900/60 border-l border-white/5 p-2 flex flex-col gap-2 z-10 backdrop-blur-xs">
                <div className="w-full h-4 bg-purple-500/20 rounded-md" />
                <div className="w-full h-3 bg-white/5 rounded-md" />
                <div className="w-full h-3 bg-white/5 rounded-md" />
                <div className="w-full h-3 bg-white/5 rounded-md" />
                <div className="w-full h-3 bg-white/5 rounded-md" />
              </div>

              {/* Main Content silhouette */}
              <div className="flex-1 p-3 flex flex-col gap-2 z-10">
                {/* Greeting banner */}
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-900/30 to-slate-900/40 border border-purple-500/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="w-24 h-3 bg-purple-300/40 rounded" />
                    <div className="w-16 h-2 bg-slate-500/40 rounded" />
                  </div>
                  <Sparkles className="w-4 h-4 text-purple-400/60" />
                </div>

                {/* Stat cards grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-slate-900/70 border border-white/5 backdrop-blur-xs space-y-1">
                    <Users className="w-3 h-3 text-blue-400" />
                    <div className="w-10 h-2 bg-slate-400/30 rounded" />
                    <div className="w-6 h-3 bg-white/60 rounded" />
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/70 border border-white/5 backdrop-blur-xs space-y-1">
                    <BookOpen className="w-3 h-3 text-emerald-400" />
                    <div className="w-10 h-2 bg-slate-400/30 rounded" />
                    <div className="w-6 h-3 bg-white/60 rounded" />
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/70 border border-white/5 backdrop-blur-xs space-y-1">
                    <CreditCard className="w-3 h-3 text-amber-400" />
                    <div className="w-10 h-2 bg-slate-400/30 rounded" />
                    <div className="w-6 h-3 bg-white/60 rounded" />
                  </div>
                </div>

                {/* Table preview */}
                <div className="flex-1 rounded-lg bg-slate-900/40 border border-white/5 p-2 space-y-1.5">
                  <div className="w-full h-2.5 bg-white/10 rounded" />
                  <div className="w-full h-2 bg-white/5 rounded" />
                  <div className="w-full h-2 bg-white/5 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Laptop Base Stand */}
          <div className="w-[110%] h-3 bg-slate-700 rounded-b-xl border-t border-slate-600 shadow-xl flex items-center justify-center">
            <div className="w-14 h-1 bg-slate-800 rounded-full" />
          </div>
        </div>
      )}

      {/* ──────────────── Tablet Mockup ──────────────── */}
      {device === 'tablet' && (
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Tablet Chassis */}
          <div className="w-full aspect-[3/4] bg-slate-900 rounded-3xl p-3 border-4 border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
            {/* Front camera notch */}
            <div className="w-2 h-2 rounded-full bg-slate-800 mx-auto mb-1.5" />

            {/* Screen Inner */}
            <div className="flex-1 bg-slate-950 rounded-2xl border border-white/5 flex flex-col overflow-hidden relative select-none">
              {/* Teacher Image Overlay */}
              {imgSrc && isVisible && (
                <div
                  className="absolute bottom-0 left-0 h-full pointer-events-none z-0 flex items-end justify-center overflow-hidden transition-all duration-200"
                  style={{
                    width: isCenter ? '100%' : '65%',
                  }}
                >
                  <div
                    className="w-full h-full flex items-end justify-center"
                    style={{
                      transform: imageTransform,
                      transformOrigin: isCenter ? 'center bottom' : 'left bottom',
                      maskImage: maskGradient,
                      WebkitMaskImage: maskGradient,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt=""
                      className="w-full h-full object-contain object-bottom"
                      style={{ opacity: config.opacity }}
                    />
                  </div>
                </div>
              )}

              {/* Tablet Top Header */}
              <div className="h-8 bg-slate-900/80 border-b border-white/5 px-3 flex items-center justify-between text-[9px] text-slate-300 font-bold z-10 backdrop-blur-xs">
                <span>{platformName}</span>
                <span className="text-[8px] text-purple-400 font-mono">Tablet View 📱</span>
              </div>

              {/* Tablet Content */}
              <div className="p-3 flex-1 flex flex-col gap-2.5 z-10">
                <div className="p-2.5 rounded-xl bg-purple-900/20 border border-purple-500/20 space-y-1">
                  <div className="w-20 h-2.5 bg-purple-300/40 rounded" />
                  <div className="w-12 h-2 bg-slate-500/40 rounded" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5 space-y-1">
                    <Users className="w-3 h-3 text-blue-400" />
                    <div className="w-12 h-2 bg-white/40 rounded" />
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5 space-y-1">
                    <BookOpen className="w-3 h-3 text-emerald-400" />
                    <div className="w-12 h-2 bg-white/40 rounded" />
                  </div>
                </div>

                <div className="flex-1 rounded-lg bg-slate-900/50 border border-white/5 p-2 space-y-2">
                  <div className="w-full h-2 bg-white/15 rounded" />
                  <div className="w-3/4 h-2 bg-white/10 rounded" />
                  <div className="w-1/2 h-2 bg-white/10 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── Mobile Mockup ──────────────── */}
      {device === 'mobile' && (
        <div className="w-full max-w-[260px] flex flex-col items-center">
          {/* Mobile Chassis */}
          <div className="w-full aspect-[9/18.5] bg-slate-900 rounded-[38px] p-2.5 border-4 border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
            {/* Dynamic Island / Speaker Pill */}
            <div className="w-16 h-3.5 bg-black rounded-full mx-auto mb-1.5 z-30 flex items-center justify-end px-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-900/80" />
            </div>

            {/* Phone Screen Inner */}
            <div className="flex-1 bg-slate-950 rounded-[28px] border border-white/5 flex flex-col overflow-hidden relative select-none">
              {/* Teacher Image Overlay */}
              {imgSrc && isVisible && (
                <div
                  className="absolute bottom-0 left-0 w-full h-[70%] pointer-events-none z-0 flex items-end justify-center overflow-hidden transition-all duration-200"
                >
                  <div
                    className="w-full h-full flex items-end justify-center"
                    style={{
                      transform: imageTransform,
                      transformOrigin: 'center bottom',
                      maskImage: maskGradient,
                      WebkitMaskImage: maskGradient,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt=""
                      className="w-full h-full object-contain object-bottom"
                      style={{ opacity: config.opacity }}
                    />
                  </div>
                </div>
              )}

              {/* Mobile Status Header */}
              <div className="h-7 px-3 flex items-center justify-between text-[8px] text-slate-400 font-mono z-10">
                <span>9:41</span>
                <span className="text-purple-400 font-bold">5G 📶</span>
              </div>

              {/* Mobile App Bar */}
              <div className="px-3 py-1 flex items-center justify-between z-10">
                <span className="text-[10px] font-bold text-white">{platformName}</span>
                <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[8px] text-purple-300 font-bold">
                  أ
                </div>
              </div>

              {/* Mobile Body Content */}
              <div className="p-2.5 flex-1 flex flex-col gap-2 z-10">
                <div className="p-2 rounded-xl bg-purple-900/30 border border-purple-500/20 space-y-1">
                  <div className="w-16 h-2 bg-purple-300/40 rounded" />
                  <div className="w-10 h-1.5 bg-slate-400/40 rounded" />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="p-1.5 rounded-lg bg-slate-900/80 border border-white/5 space-y-1">
                    <Users className="w-2.5 h-2.5 text-blue-400" />
                    <div className="w-8 h-1.5 bg-white/40 rounded" />
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/80 border border-white/5 space-y-1">
                    <BookOpen className="w-2.5 h-2.5 text-emerald-400" />
                    <div className="w-8 h-1.5 bg-white/40 rounded" />
                  </div>
                </div>
              </div>

              {/* Mobile Bottom Navigation Bar */}
              <div className="h-9 bg-slate-900/90 border-t border-white/5 px-4 flex items-center justify-around z-20 backdrop-blur-md">
                <div className="w-3 h-3 bg-purple-400 rounded-xs" />
                <div className="w-3 h-3 bg-slate-600 rounded-xs" />
                <div className="w-3 h-3 bg-slate-600 rounded-xs" />
                <div className="w-3 h-3 bg-slate-600 rounded-xs" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Frame device indicator badge */}
      <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        معاينة حية فورية:
        <span className="text-purple-300 font-bold">
          {device === 'desktop' ? '💻 شاشات الكمبيوتر واللابتوب (> 1024px)' : device === 'tablet' ? '📱 شاشات الأجهزة اللوحية والتابلت (768px - 1024px)' : '📲 شاشات الهواتف الذكية (< 768px)'}
        </span>
      </div>
    </div>
  );
}
