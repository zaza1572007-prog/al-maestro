/**
 * lib/permissions.ts
 *
 * Central permission catalog, categories, presets, and validation logic
 * for Assistants and System Staff.
 */

export interface PermissionItem {
  id: string;
  label: string;
  description: string;
}

export interface PermissionCategory {
  id: string;
  title: string;
  icon: string;
  permissions: PermissionItem[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'attendance',
    title: 'الحضور والغياب والماسح',
    icon: 'QrCode',
    permissions: [
      { id: 'attendance.scan', label: 'ماسح الـ QR وتسجيل الحضور', description: 'مسح باركود/QR الطلاب وتسجيل الحضور الفوري في الحصص' },
      { id: 'attendance.manual', label: 'التحضير اليدوي والاستثنائي', description: 'تعديل وتحديث حالة حضور/تأخير الطلاب يدوياً' },
      { id: 'attendance.daily', label: 'تحصيل غياب اليوم', description: 'عرض وتحصيل غياب اليوم وتدوين أسباب الغياب' },
    ],
  },
  {
    id: 'students',
    title: 'شؤون وقوائم الطلاب',
    icon: 'GraduationCap',
    permissions: [
      { id: 'students.view', label: 'استعراض بيانات الطلاب', description: 'الاطلاع على قوائم وملفات الطلاب وبيانات التواصل' },
      { id: 'students.create', label: 'إضافة طالب جديد', description: 'إنشاء حسابات جديدة للطلاب وأولياء الأمور' },
      { id: 'students.edit', label: 'تعديل بيانات الطلاب', description: 'تحديث بيانات الطالب، المجموعة، أو المرحلة' },
      { id: 'students.delete', label: 'حذف/أرشفة الطلاب', description: 'حذف أو أرشفة ملفات الطلاب من النظام' },
    ],
  },
  {
    id: 'exams_homework',
    title: 'الامتحانات والواجبات والتقييم',
    icon: 'BookOpenCheck',
    permissions: [
      { id: 'homework.manage', label: 'إدارة ورصد الواجبات', description: 'إضافة الواجبات، تسليمها، وتسجيل التقييمات' },
      { id: 'exams.manage', label: 'إدارة الامتحانات والنتائج', description: 'إنشاء الاختبارات ورصد الدرجات والتقييمات للطلاب' },
    ],
  },
  {
    id: 'finance',
    title: 'الماليات والاشتراكات',
    icon: 'Banknote',
    permissions: [
      { id: 'subscriptions.view', label: 'الاطلاع على الاشتراكات الشهرية', description: 'متابعة كشوفات وحالات سداد اشتراكات الشهور' },
      { id: 'payments.collect', label: 'تسجيل وتحصيل المدفوعات', description: 'استلام النقدية وإصدار إيصالات السداد للطلاب' },
      { id: 'subscriptions.manage', label: 'تعديل وإعفاء الاشتراكات', description: 'تطبيق خصومات أو إعفاءات أو تعديل مبالغ الاشتراكات' },
    ],
  },
  {
    id: 'groups_stages',
    title: 'المجموعات والمراحل والجدول',
    icon: 'Users',
    permissions: [
      { id: 'groups.assigned_only', label: 'الوصول للمجموعات المسندة فقط', description: 'حصر تعامل المساعد على مجموعاته المخصصة فقط' },
      { id: 'groups.view_all', label: 'عرض جميع المجموعات والمراحل', description: 'الاطلاع على كل المراحل والمجموعات في السنتر' },
      { id: 'groups.manage', label: 'إضافة وتعديل المجموعات', description: 'إنشاء وتعديل مواعيد وجداول المجموعات' },
    ],
  },
  {
    id: 'registrations',
    title: 'طلبات الحجز والتسجيل',
    icon: 'UserPlus',
    permissions: [
      { id: 'registrations.view', label: 'استعراض طلبات الحجز', description: 'الاطلاع على طلبات الطلاب الجدد المسجلة عبر البوابة' },
      { id: 'registrations.manage', label: 'قبول ورفض الطلبات وتعيينها', description: 'الموافقة على الطلب وتحويله لطالب رسمي وتعيين مجموعته' },
    ],
  },
  {
    id: 'communication',
    title: 'التواصل والواتساب والإشعارات',
    icon: 'MessageSquare',
    permissions: [
      { id: 'whatsapp.send', label: 'إرسال رسائل الواتساب المباشرة', description: 'إرسال بيانات الدخول، تنبيهات الغياب، وإيصالات السداد' },
      { id: 'parent_comm.manage', label: 'سجل تواصل أولياء الأمور', description: 'تسجيل ومتابعة مكالمات وملاحظات أولياء الأمور' },
      { id: 'notifications.send', label: 'إرسال إشعارات المنصة', description: 'بث تنبيهات وإشعارات للطلاب وأولياء الأمور' },
    ],
  },
  {
    id: 'tools',
    title: 'الأدوات والطباعة والملفات',
    icon: 'FolderArchive',
    permissions: [
      { id: 'cards.print', label: 'طباعة بطاقات وكارنيهات الطلاب', description: 'توليد وتصدير كروت وبطاقات التعريف للطلاب' },
      { id: 'qr.print', label: 'طباعة كودات QR', description: 'طباعة شيتات الـ QR للحصص والمجموعات' },
      { id: 'files.manage', label: 'إدارة المكتبة والملفات', description: 'رفع وتنزيل المذكرات والملفات التعليمية' },
      { id: 'tasks.manage', label: 'إدارة المهام والتكليفات', description: 'إنشاء ومتابعة المهام اليومية للمساعدين' },
      { id: 'reports.view', label: 'الاطلاع على التقارير والإحصائيات', description: 'عرض الرسوم البيانية وإحصائيات الحضور والمالية' },
    ],
  },
];

// Flat list of all available permission keys
export const ALL_PERMISSIONS = PERMISSION_CATEGORIES.flatMap(cat => cat.permissions.map(p => p.id));

// Preset profiles for quick assignment
export interface PermissionPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  permissions: string[];
}

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: 'attendance_officer',
    name: 'مسؤول الحضور والغياب (Qr & Attendance)',
    description: 'تسجيل الحضور بالـ QR والتحضير اليدوي وتحصيل غياب اليوم وإرسال تنبيهات الواتساب',
    badge: 'حضور وغياب',
    permissions: [
      'attendance.scan',
      'attendance.manual',
      'attendance.daily',
      'students.view',
      'whatsapp.send',
      'qr.print',
    ],
  },
  {
    id: 'control_academic',
    name: 'مسؤول الكنترول والتقييم (Control & Exams)',
    description: 'إدارة ورصد درجات الامتحانات والواجبات والمكتبة والتواصل مع أولياء الأمور',
    badge: 'كنترول وواجبات',
    permissions: [
      'students.view',
      'homework.manage',
      'exams.manage',
      'files.manage',
      'parent_comm.manage',
      'reports.view',
      'whatsapp.send',
    ],
  },
  {
    id: 'financial_admin',
    name: 'مسؤول الحسابات والاشتراكات (Finance)',
    description: 'تحصيل الاشتراكات والمدفوعات ومتابعة المتأخرات وطلبات الحجز والطباعة',
    badge: 'مالية واشتراكات',
    permissions: [
      'students.view',
      'students.create',
      'students.edit',
      'subscriptions.view',
      'subscriptions.manage',
      'payments.collect',
      'registrations.view',
      'registrations.manage',
      'cards.print',
      'whatsapp.send',
    ],
  },
  {
    id: 'general_deputy',
    name: 'نائب المستر / مساعد شامل (Full Deputy)',
    description: 'كامل الصلاحيات التشغيلية لإدارة الطلاب، الحصص، الامتحانات، الحسابات، والطباعة',
    badge: 'صلاحيات شاملة',
    permissions: ALL_PERMISSIONS.filter(p => !p.startsWith('settings.')),
  },
];

/**
 * Checks if a user has a specific permission.
 * - OWNER always has full access (true for all permissions).
 * - ASSISTANT requires the permission to be in their permissions array.
 */
export function hasPermission(
  user: { role?: string; permissions?: string[] | null } | null | undefined,
  permission: string
): boolean {
  if (!user) return false;
  if (user.role === 'OWNER') return true;
  if (user.role !== 'ASSISTANT') return false;

  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
  return userPerms.includes(permission) || userPerms.includes('*');
}

/**
 * Checks if a user has at least one of the required permissions.
 */
export function hasAnyPermission(
  user: { role?: string; permissions?: string[] | null } | null | undefined,
  permissions: string[]
): boolean {
  if (!user) return false;
  if (user.role === 'OWNER') return true;
  return permissions.some(perm => hasPermission(user, perm));
}
