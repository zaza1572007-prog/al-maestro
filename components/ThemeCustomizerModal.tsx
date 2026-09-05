'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Sparkles, Check, X, Palette } from 'lucide-react';
import {
  ThemeMode,
  AccentColor,
  getThemeState,
  setThemeMode,
  setAccentColor,
} from './ThemeProvider';
import { playSuccessChime } from '@/lib/sound-fx';
import { triggerHaptic } from '@/lib/haptics';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCENT_OPTIONS: { id: AccentColor; name: string; darkHex: string; lightHex: string; desc: string }[] = [
  {
    id: 'purple',
    name: 'البنفسجي الإمبراطوري',
    darkHex: '#a855f7',
    lightHex: '#7c3aed',
    desc: 'الفخامة الملكية والهيبة التعليمية',
  },
  {
    id: 'blue',
    name: 'الأزرق الملكي',
    darkHex: '#3b82f6',
    lightHex: '#2563eb',
    desc: 'الوضوح والتركيز الأكاديمي العالي',
  },
  {
    id: 'gold',
    name: 'الذهبي الملكي',
    darkHex: '#eab308',
    lightHex: '#a16207',
    desc: 'التميز والتكريم والتباين الفائق (WCAG)',
  },
];

export default function ThemeCustomizerModal({ isOpen, onClose }: ThemeCustomizerModalProps) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [accent, setAccent] = useState<AccentColor>('purple');

  useEffect(() => {
    if (isOpen) {
      const current = getThemeState();
      setMode(current.mode);
      setAccent(current.accent);
    }
  }, [isOpen]);

  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    setThemeMode(newMode);
    triggerHaptic('light');
  };

  const handleAccentChange = (newAccent: AccentColor) => {
    setAccent(newAccent);
    setAccentColor(newAccent);
    playSuccessChime();
    triggerHaptic('medium');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl glass-panel p-5 sm:p-6 shadow-2xl border border-white/15 bg-slate-950/95 text-white z-10 space-y-5 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تخصيص المظهر والثيمات</h3>
                <p className="text-xs text-slate-400">تحكم بالوضع الليلي ولون التمييز المفضل</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Theme Mode Switcher */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>وضع العرض (Display Mode)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Obsidian Dark */}
              <button
                type="button"
                onClick={() => handleModeChange('dark')}
                className={`relative p-3.5 rounded-2xl border text-right transition-all flex flex-col gap-1.5 ${
                  mode === 'dark'
                    ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-xl bg-slate-900 text-purple-400 border border-white/10">
                    <Moon className="w-4 h-4" />
                  </div>
                  {mode === 'dark' && <Check className="w-4 h-4 text-purple-400" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">الوضع الليلي الفاخر</p>
                  <p className="text-[10px] text-slate-400">Obsidian Dark (مانع للتلطيخ)</p>
                </div>
              </button>

              {/* Clean Minimalist Light */}
              <button
                type="button"
                onClick={() => handleModeChange('light')}
                className={`relative p-3.5 rounded-2xl border text-right transition-all flex flex-col gap-1.5 ${
                  mode === 'light'
                    ? 'border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-xl bg-slate-100 text-amber-500 border border-black/10">
                    <Sun className="w-4 h-4" />
                  </div>
                  {mode === 'light' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">الوضع النهاري المشرق</p>
                  <p className="text-[10px] text-slate-400">Clean Minimalist Light</p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Accent Color Palette */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>لون التمييز (Accent Color)</span>
              <span className="text-[10px] text-slate-400 font-normal">تباين متوافق مع WCAG</span>
            </label>
            <div className="space-y-2.5">
              {ACCENT_OPTIONS.map((opt) => {
                const isSelected = accent === opt.id;
                const activeHex = mode === 'light' ? opt.lightHex : opt.darkHex;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAccentChange(opt.id)}
                    className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-right ${
                      isSelected
                        ? 'border-white/40 bg-white/10 shadow-lg'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: activeHex + 'aa',
                            boxShadow: `0 4px 20px ${activeHex}25`,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white border border-white/20 shadow-md flex-shrink-0"
                        style={{ background: activeHex }}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{opt.name}</p>
                        <p className="text-[10px] text-slate-400">{opt.desc}</p>
                      </div>
                    </div>
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ background: activeHex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition shadow-lg shadow-purple-600/20"
            >
              تم الحفظ والتطبيق بنجاح ✨
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
