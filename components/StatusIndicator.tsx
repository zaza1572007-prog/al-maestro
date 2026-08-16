'use client';

import React from 'react';

export type StatusVariant =
  | 'success'
  | 'open'
  | 'active'
  | 'error'
  | 'closed'
  | 'absent'
  | 'warning'
  | 'pending'
  | 'in_progress'
  | 'info'
  | 'vacation';

interface StatusIndicatorProps {
  status: StatusVariant;
  label?: string;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CONFIGS: Record<
  StatusVariant,
  {
    dotColor: string;
    pingColor: string;
    badgeBg: string;
    badgeBorder: string;
    textColor: string;
    defaultLabel: string;
  }
> = {
  success: {
    dotColor: 'bg-emerald-500',
    pingColor: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    defaultLabel: 'نشط',
  },
  open: {
    dotColor: 'bg-emerald-500',
    pingColor: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    defaultLabel: 'مفتوحة 🟢',
  },
  active: {
    dotColor: 'bg-emerald-500',
    pingColor: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    defaultLabel: 'حاضر',
  },
  error: {
    dotColor: 'bg-rose-500',
    pingColor: 'bg-rose-400',
    badgeBg: 'bg-rose-500/10',
    badgeBorder: 'border-rose-500/30',
    textColor: 'text-rose-400',
    defaultLabel: 'غائب',
  },
  closed: {
    dotColor: 'bg-slate-500',
    pingColor: 'bg-slate-400',
    badgeBg: 'bg-slate-800',
    badgeBorder: 'border-slate-700',
    textColor: 'text-slate-400',
    defaultLabel: 'مغلقة 🔒',
  },
  absent: {
    dotColor: 'bg-rose-500',
    pingColor: 'bg-rose-400',
    badgeBg: 'bg-rose-500/10',
    badgeBorder: 'border-rose-500/30',
    textColor: 'text-rose-400',
    defaultLabel: 'غائب ❌',
  },
  warning: {
    dotColor: 'bg-amber-500',
    pingColor: 'bg-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    textColor: 'text-amber-400',
    defaultLabel: 'متأخر ⚠️',
  },
  pending: {
    dotColor: 'bg-amber-500',
    pingColor: 'bg-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    textColor: 'text-amber-400',
    defaultLabel: 'لم تبدأ ⏳',
  },
  in_progress: {
    dotColor: 'bg-blue-500',
    pingColor: 'bg-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/30',
    textColor: 'text-blue-400',
    defaultLabel: 'جارية الآن 🔵',
  },
  info: {
    dotColor: 'bg-blue-500',
    pingColor: 'bg-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/30',
    textColor: 'text-blue-400',
    defaultLabel: 'معلومات',
  },
  vacation: {
    dotColor: 'bg-indigo-500',
    pingColor: 'bg-indigo-400',
    badgeBg: 'bg-indigo-500/10',
    badgeBorder: 'border-indigo-500/30',
    textColor: 'text-indigo-400',
    defaultLabel: 'إجازة 📅',
  },
};

export default function StatusIndicator({
  status,
  label,
  pulse = true,
  size = 'md',
  className = '',
}: StatusIndicatorProps) {
  const config = CONFIGS[status] || CONFIGS.info;
  const displayLabel = label !== undefined ? label : config.defaultLabel;

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${config.badgeBg} ${config.badgeBorder} ${config.textColor} ${className}`}
    >
      <span className="relative flex items-center justify-center shrink-0">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.pingColor}`}
          />
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${config.dotColor}`} />
      </span>
      {displayLabel && <span>{displayLabel}</span>}
    </span>
  );
}
