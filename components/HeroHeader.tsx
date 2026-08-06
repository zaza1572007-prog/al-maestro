'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowUpRight } from 'lucide-react';

interface HeroHeaderProps {
  title: string;
  badge?: string;
  subtitle?: string;
  stats?: { label: string; value: string | number; color?: string }[];
  actionBtn?: { label: string; onClick?: () => void; href?: string };
}

export default function HeroHeader({
  title,
  badge = "منصة المايسترو الفاخرة",
  subtitle,
  stats = [],
  actionBtn,
}: HeroHeaderProps) {
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkPortrait = async () => {
      try {
        const res = await fetch('/api/settings/branding?type=portrait', { method: 'HEAD' });
        if (res.ok) {
          setPortraitUrl('/api/settings/branding?type=portrait');
        }
      } catch (e) {
        console.error('Failed to fetch portrait watermark in HeroHeader', e);
      }
    };
    checkPortrait();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mb-8 rounded-3xl p-6 md:p-8 glass-panel border border-white/15 shadow-2xl overflow-hidden bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-950/60"
    >
      {/* Background Ambient Spotlights */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Teacher Portrait Watermark inside the banner */}
      {portraitUrl && (
        <div 
          className="absolute left-0 bottom-0 top-0 w-72 pointer-events-none z-0 overflow-hidden hidden md:block"
          style={{
            opacity: 0.12,
            maskImage: 'linear-gradient(to right, black 25%, transparent 95%)',
            WebkitMaskImage: 'linear-gradient(to right, black 25%, transparent 95%)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={portraitUrl} 
            alt="" 
            className="w-full h-full object-contain object-left-bottom translate-x-[-5%]"
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-purple-300 text-xs font-semibold mb-3 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>{badge}</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2">
            {title}
          </h1>

          {subtitle && (
            <p className="text-slate-400 text-sm md:text-base max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Quick Stats Badges or Action */}
        <div className="flex flex-wrap items-center gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="px-4 py-3 rounded-2xl bg-slate-900/60 border border-white/10 text-center min-w-[110px]"
            >
              <p className="text-xs text-slate-400 font-medium mb-0.5">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color || 'text-purple-300'}`}>
                {stat.value}
              </p>
            </div>
          ))}

          {actionBtn && (
            <button
              onClick={actionBtn.onClick}
              className="glass-button-primary px-6 py-3 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/20"
            >
              <span>{actionBtn.label}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
