'use client';

import React from 'react';

// Preset vibrant gradient pairs (Tailwind color pairs)
const GRADIENTS = [
  { from: '#8B5CF6', to: '#6366F1' }, // Violet -> Indigo
  { from: '#EC4899', to: '#8B5CF6' }, // Pink -> Violet
  { from: '#3B82F6', to: '#06B6D4' }, // Blue -> Cyan
  { from: '#10B981', to: '#059669' }, // Emerald -> Teal
  { from: '#F59E0B', to: '#EF4444' }, // Amber -> Red
  { from: '#6366F1', to: '#EC4899' }, // Indigo -> Pink
  { from: '#06B6D4', to: '#3B82F6' }, // Cyan -> Blue
  { from: '#D946EF', to: '#8B5CF6' }, // Fuchsia -> Violet
];

function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getAvatarInitials(name: string): string {
  if (!name || !name.trim()) return 'ط';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0);
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'active' | 'inactive' | 'pending' | 'none';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm font-bold',
  lg: 'w-12 h-12 text-base font-bold',
  xl: 'w-16 h-16 text-xl font-black',
};

const STATUS_INDICATORS = {
  active: 'bg-emerald-500 ring-emerald-950',
  inactive: 'bg-slate-500 ring-slate-950',
  pending: 'bg-amber-500 ring-amber-950',
  none: '',
};

export default function Avatar({
  name,
  src,
  size = 'md',
  status = 'none',
  className = '',
}: AvatarProps) {
  const hash = stringToHash(name || 'default');
  const gradient = GRADIENTS[hash % GRADIENTS.length];
  const initials = getAvatarInitials(name);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${sizeClass} rounded-2xl flex items-center justify-center text-white shadow-md border border-white/20 overflow-hidden transition-transform duration-200 hover:scale-105 select-none`}
        style={{
          background: src ? 'transparent' : `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
          boxShadow: `0 4px 14px ${gradient.from}40`,
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="leading-none drop-shadow-sm">{initials}</span>
        )}
      </div>

      {/* Status Ring */}
      {status !== 'none' && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ${STATUS_INDICATORS[status]}`}
        />
      )}
    </div>
  );
}
