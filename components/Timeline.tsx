'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  UserCheck,
  UserX,
  FileText,
  CreditCard,
  Bell,
  Settings,
  Zap,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Avatar from './Avatar';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  time: string;
  date?: string;
  type?: 'attendance_present' | 'attendance_absent' | 'payment' | 'system' | 'student' | 'info';
  user?: { name: string; avatar?: string };
  badge?: string;
  link?: string;
}

const TYPE_CONFIGS = {
  attendance_present: {
    icon: UserCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    glow: '0 0 12px rgba(16, 185, 129, 0.3)',
  },
  attendance_absent: {
    icon: UserX,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    glow: '0 0 12px rgba(244, 63, 94, 0.3)',
  },
  payment: {
    icon: CreditCard,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    glow: '0 0 12px rgba(245, 158, 11, 0.3)',
  },
  system: {
    icon: Settings,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
    glow: '0 0 12px rgba(139, 92, 246, 0.3)',
  },
  student: {
    icon: meIcon,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    glow: '0 0 12px rgba(59, 130, 246, 0.3)',
  },
  info: {
    icon: meIcon,
    color: 'text-slate-300',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
    glow: 'none',
  },
};

function meIcon(props: any) {
  return <Zap {...props} />;
}

interface TimelineProps {
  items: TimelineItem[];
  title?: string;
  className?: string;
}

export default function Timeline({ items, title, className = '' }: TimelineProps) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={`glass-panel border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.7) 0%, rgba(6, 9, 19, 0.85) 100%)',
      }}
    >
      {title && (
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-white/10">
          <Clock className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
      )}

      <div className="relative pr-4 sm:pr-6 space-y-6 before:absolute before:right-6 sm:before:right-8 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-purple-500/50 before:via-blue-500/30 before:to-transparent">
        {items.map((item, idx) => {
          const config = TYPE_CONFIGS[item.type || 'info'];
          const Icon = config.icon;

          return (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              className="relative flex items-start gap-3 sm:gap-4 group"
            >
              {/* Timeline Node Icon */}
              <div
                className={`relative z-10 w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-200 group-hover:scale-110 ${config.bg} ${config.border} ${config.color}`}
                style={{ boxShadow: config.glow }}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Card Content */}
              <div className="flex-1 bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 hover:border-purple-500/30 transition-all duration-200 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    {item.user && (
                      <Avatar name={item.user.name} src={item.user.avatar} size="xs" />
                    )}
                    <h4 className="font-bold text-white text-sm group-hover:text-purple-300 transition">
                      {item.title}
                    </h4>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.time} {item.date ? `· ${item.date}` : ''}
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {item.description}
                  </p>
                )}

                {item.badge && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {item.badge}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
