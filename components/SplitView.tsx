'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';

interface SplitViewProps {
  master: React.ReactNode;
  detail: React.ReactNode | null;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}

export default function SplitView({
  master,
  detail,
  isOpen,
  onClose,
  title = 'التفاصيل',
  className = '',
}: SplitViewProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Master Pane */}
        <div
          className={`transition-all duration-300 ${
            isOpen ? 'lg:col-span-7' : 'lg:col-span-12'
          }`}
        >
          {master}
        </div>

        {/* Detail Pane (Desktop side-by-side) */}
        <AnimatePresence>
          {isOpen && detail && (
            <motion.div
              initial={{ opacity: 0, x: 25, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 25, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 sticky top-20 glass-panel border border-white/10 rounded-3xl p-5 shadow-2xl overflow-hidden max-h-[calc(100vh-6rem)] flex flex-col"
              style={{
                background:
                  'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(6, 9, 19, 0.95) 100%)',
              }}
            >
              {/* Detail Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 mb-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4 text-purple-400" />
                  <span>{title}</span>
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                  title="إغلاق لوحة التفاصيل"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Scrollable Body */}
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">{detail}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
