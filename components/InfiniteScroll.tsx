'use client';

import React, { useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface InfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  endMessage?: string;
  className?: string;
}

export default function InfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  endMessage = 'تم عرض جميع العناصر ✓',
  className = '',
}: InfiniteScrollProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const el = triggerRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div ref={triggerRef} className={`py-6 text-center select-none ${className}`}>
      {isLoading ? (
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold shadow-lg">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          <span>جارٍ تحميل المزيد من العناصر...</span>
        </div>
      ) : !hasMore ? (
        <p className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5 opacity-80">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{endMessage}</span>
        </p>
      ) : null}
    </div>
  );
}
