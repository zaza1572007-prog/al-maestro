'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  GraduationCap,
  ClipboardList,
  FolderArchive,
  Search,
  FileSpreadsheet,
  Bell,
  CreditCard,
  Inbox,
  Plus,
} from 'lucide-react';

export type EmptyStateVariant =
  | 'students'
  | 'groups'
  | 'attendance'
  | 'files'
  | 'search'
  | 'exams'
  | 'notifications'
  | 'payments'
  | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ElementType;
  className?: string;
}

const VARIANT_CONFIGS: Record<
  EmptyStateVariant,
  {
    title: string;
    description: string;
    icon: React.ElementType;
    glowColor: string;
    svgIllustration: React.ReactNode;
  }
> = {
  students: {
    title: 'لا يوجد طلاب حتى الآن',
    description: 'قم بإضافة طلاب جدد أو استيراد قائمة الطلاب للبدء في إدارة المجموعات والاشتراكات.',
    icon: GraduationCap,
    glowColor: 'rgb(139 92 246 / 0.25)',
    svgIllustration: (
      <svg className="w-28 h-28 mx-auto" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="60" fill="url(#grad_stud)" fillOpacity="0.15" />
        <circle cx="80" cy="80" r="45" stroke="url(#grad_stud)" strokeWidth="2" strokeDasharray="6 6" strokeOpacity="0.4" />
        {/* Cap */}
        <path d="M80 48L115 65L80 82L45 65L80 48Z" fill="url(#grad_stud_solid)" />
        <path d="M102 75.5V95C102 102 92 108 80 108C68 108 58 102 58 95V75.5" stroke="url(#grad_stud_solid)" strokeWidth="3" strokeLinecap="round" />
        <path d="M48 67V92" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="48" cy="94" r="3" fill="#A78BFA" />
        <defs>
          <linearGradient id="grad_stud" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="grad_stud_solid" x1="45" y1="48" x2="115" y2="108" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A78BFA" />
            <stop offset="1" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  groups: {
    title: 'لا توجد مجموعات تعليمية',
    description: 'أضف المجموعات الدراسية وحدد مواعيد الحصص والقاعات لتنظيم جدول الحضور.',
    icon: Users,
    glowColor: 'rgb(59 130 246 / 0.25)',
    svgIllustration: (
      <svg className="w-28 h-28 mx-auto" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="60" fill="url(#grad_grp)" fillOpacity="0.15" />
        <rect x="45" y="55" width="70" height="50" rx="12" stroke="url(#grad_grp_solid)" strokeWidth="2.5" fill="#0F172A" fillOpacity="0.6" />
        <circle cx="65" cy="75" r="8" fill="#60A5FA" />
        <circle cx="95" cy="75" r="8" fill="#818CF8" />
        <path d="M55 93C55 87.5 60 85 65 85C70 85 75 87.5 75 93" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
        <path d="M85 93C85 87.5 90 85 95 85C100 85 105 87.5 105 93" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad_grp" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="grad_grp_solid" x1="45" y1="55" x2="115" y2="105" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60A5FA" />
            <stop offset="1" stopColor="#818CF8" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  attendance: {
    title: 'لا يوجد كشف حضور حالياً',
    description: 'لم يتم فتح أو تسجيل أي حضور في هذا التاريخ. ابدأ بفتح الجلسة وتسجيل الطلاب.',
    icon: ClipboardList,
    glowColor: 'rgb(16 185 129 / 0.25)',
    svgIllustration: (
      <svg className="w-28 h-28 mx-auto" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="60" fill="url(#grad_att)" fillOpacity="0.15" />
        <rect x="50" y="45" width="60" height="75" rx="10" stroke="url(#grad_att_solid)" strokeWidth="2.5" fill="#0F172A" fillOpacity="0.6" />
        <rect x="68" y="40" width="24" height="10" rx="3" fill="#34D399" />
        <path d="M63 68L70 75L82 63" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="63" y1="88" x2="97" y2="88" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        <line x1="63" y1="98" x2="88" y2="98" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad_att" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="grad_att_solid" x1="50" y1="45" x2="110" y2="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34D399" />
            <stop offset="1" stopColor="#10B981" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  files: {
    title: 'المكتبة فارغة',
    description: 'لم يتم رفع ملفات أو مذكّرات حتى الآن. يمكنك رفع ملفات جديدة لتكون متاحة للطلاب.',
    icon: FolderArchive,
    glowColor: 'rgb(245 158 11 / 0.25)',
    svgIllustration: (
      <svg className="w-28 h-28 mx-auto" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="60" fill="url(#grad_file)" fillOpacity="0.15" />
        <path d="M45 60C45 54.4772 49.4772 50 55 50H72L82 60H105C110.523 60 115 64.4772 115 70V105C115 110.523 110.523 115 105 115H55C49.4772 115 45 110.523 45 105V60Z" stroke="url(#grad_file_solid)" strokeWidth="2.5" fill="#0F172A" fillOpacity="0.6" />
        <path d="M80 75V95M80 75L73 82M80 75L87 82" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="grad_file" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="grad_file_solid" x1="45" y1="50" x2="115" y2="115" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  search: {
    title: 'لم يتم العثور على مطابقات',
    description: 'جرب البحث باسم آخر، أو تأكد من صحة كتابة الكلمات الدالة.',
    icon: Search,
    glowColor: 'rgb(168 85 247 / 0.25)',
    svgIllustration: (
      <svg className="w-28 h-28 mx-auto" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="60" fill="url(#grad_srch)" fillOpacity="0.15" />
        <circle cx="75" cy="75" r="28" stroke="url(#grad_srch_solid)" strokeWidth="3" />
        <path d="M96 96L116 116" stroke="url(#grad_srch_solid)" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M67 75H83" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad_srch" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A855F7" />
            <stop offset="1" stopColor="#EC4899" />
          </linearGradient>
          <linearGradient id="grad_srch_solid" x1="47" y1="47" x2="116" y2="116" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C084FC" />
            <stop offset="1" stopColor="#F472B6" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  exams: {
    title: 'لا توجد امتحانات مسجلة',
    description: 'قم بإنشاء امتحان جديد وإضافة النتائج والدرجات للطلاب.',
    icon: FileSpreadsheet,
    glowColor: 'rgb(236 72 153 / 0.25)',
    svgIllustration: (
      <svg className="w-28 h-28 mx-auto" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="60" fill="url(#grad_exam)" fillOpacity="0.15" />
        <rect x="52" y="45" width="56" height="75" rx="8" stroke="url(#grad_exam_solid)" strokeWidth="2.5" fill="#0F172A" fillOpacity="0.6" />
        <path d="M65 65H95M65 77H95M65 89H85" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" />
        <path d="M90 98L100 88" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad_exam" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EC4899" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="grad_exam_solid" x1="52" y1="45" x2="108" y2="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F472B6" />
            <stop offset="1" stopColor="#C084FC" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  notifications: {
    title: 'لا توجد تنبيهات جديدة',
    description: 'أنت متطلع على كل الجديد! ستظهر الإشعارات هنا فور حدوثها.',
    icon: Bell,
    glowColor: 'rgb(14 165 233 / 0.25)',
    svgIllustration: (
      <svg className="w-28 h-28 mx-auto" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="60" fill="url(#grad_notif)" fillOpacity="0.15" />
        <path d="M80 45C68.9543 45 60 53.9543 60 65V85L52 95H108L100 85V65C100 53.9543 91.0457 45 80 45Z" stroke="url(#grad_notif_solid)" strokeWidth="2.5" fill="#0F172A" fillOpacity="0.6" />
        <path d="M72 102C72 106.418 75.5817 110 80 110C84.4183 110 88 106.418 88 102" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad_notif" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0EA5E9" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="grad_notif_solid" x1="52" y1="45" x2="108" y2="110" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#818CF8" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  payments: {
    title: 'لا توجد مدفوعات مسجلة',
    description: 'سجل التحصيلات المالية واشتراكات الطلاب لمتابعة الدخل والرسوم.',
    icon: CreditCard,
    glowColor: 'rgb(20 184 166 / 0.25)',
    svgIllustration: (
      <svg className="w-28 h-28 mx-auto" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="60" fill="url(#grad_pay)" fillOpacity="0.15" />
        <rect x="45" y="55" width="70" height="48" rx="8" stroke="url(#grad_pay_solid)" strokeWidth="2.5" fill="#0F172A" fillOpacity="0.6" />
        <line x1="45" y1="70" x2="115" y2="70" stroke="#2DD4BF" strokeWidth="2.5" />
        <rect x="57" y="82" width="18" height="8" rx="2" fill="#2DD4BF" />
        <defs>
          <linearGradient id="grad_pay" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#14B8A6" />
            <stop offset="1" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="grad_pay_solid" x1="45" y1="55" x2="115" y2="103" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2DD4BF" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  generic: {
    title: 'لا توجد بيانات للعرض',
    description: 'لم يتم العثور على أي عناصر هنا حالياً.',
    icon: Inbox,
    glowColor: 'rgb(148 163 184 / 0.2)',
    svgIllustration: (
      <svg className="w-28 h-28 mx-auto" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="60" fill="#94A3B8" fillOpacity="0.1" />
        <rect x="50" y="55" width="60" height="50" rx="8" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" fill="#0F172A" fillOpacity="0.6" />
        <path d="M50 78H68L74 86H86L92 78H110" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

export default function EmptyState({
  variant = 'generic',
  title,
  description,
  actionLabel,
  onAction,
  icon: CustomIcon,
  className = '',
}: EmptyStateProps) {
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.generic;
  const displayTitle = title || config.title;
  const displayDesc = description || config.description;
  const DisplayIcon = CustomIcon || config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative p-8 sm:p-12 text-center rounded-3xl border border-white/10 glass-panel overflow-hidden my-4 ${className}`}
      style={{
        boxShadow: `0 20px 50px -10px ${config.glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* Background radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none rounded-full blur-3xl opacity-30"
        style={{ background: config.glowColor }}
      />

      {/* SVG Animated Illustration */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
        className="relative z-10 mb-4"
      >
        {config.svgIllustration}
      </motion.div>

      {/* Title */}
      <h3 className="relative z-10 text-lg sm:text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
        <DisplayIcon className="w-5 h-5 text-slate-400" />
        <span>{displayTitle}</span>
      </h3>

      {/* Description */}
      <p className="relative z-10 text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
        {displayDesc}
      </p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onAction}
          className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white glass-button-primary cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </motion.button>
      )}
    </motion.div>
  );
}
