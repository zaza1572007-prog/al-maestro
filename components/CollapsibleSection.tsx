'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  badge?: string | number;
  defaultOpen?: boolean;
  storageKey?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  badge,
  defaultOpen = true,
  storageKey,
  action,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`collapsible_${storageKey}`);
        if (saved !== null) return JSON.parse(saved);
      } catch {}
    }
    return defaultOpen;
  });

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (storageKey) {
        try {
          localStorage.setItem(`collapsible_${storageKey}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  return (
    <div
      className={`glass-panel border border-white/10 rounded-3xl overflow-hidden shadow-2xl transition-all ${className}`}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-slate-950/40 select-none">
        <div
          onClick={toggleOpen}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
        >
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Icon className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                {title}
              </h3>
              {badge !== undefined && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Action & Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {action && <div className="no-collapse-action">{action}</div>}

          <button
            onClick={toggleOpen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition cursor-pointer"
            title={isOpen ? 'طي القسم' : 'توسيع القسم'}
          >
            <motion.div
              animate={{ rotate: isOpen ? 0 : 180 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <ChevronUp className="w-4 h-4" />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Animated Content Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-t border-white/5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
