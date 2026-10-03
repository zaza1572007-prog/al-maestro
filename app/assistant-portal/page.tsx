'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { useToast } from '@/components/ToastProvider';
import { hasPermission } from '@/lib/permissions';
import {
  LayoutDashboard,
  QrCode,
  ClipboardList,
  BookOpenCheck,
  FileSpreadsheet,
  Banknote,
  GraduationCap,
  Users,
  MessageSquare,
  IdCard,
  CheckSquare,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Phone,
  Loader2,
  Send,
  Play
} from 'lucide-react';

interface SummaryData {
  assistant: {
    id: string;
    name: string;
    phone: string;
    role: string;
    permissions: string[];
    assignedGroupIds: string[];
    notes?: string;
  };
  assignedGroups: Array<{
    id: string;
    name: string;
    academicStage?: { id: string; name: string };
    _count?: { students: number; lessonSessions: number };
  }>;
  todaySessions: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    group: { id: string; name: string; academicStage?: { name: string } };
    _count?: { attendances: number };
  }>;
  tasks: Array<{
    id: string;
    title: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED';
    dueDate?: string | null;
  }>;
  stats: {
    assignedGroupsCount: number;
    todaySessionsCount: number;
    todayAttendancesCount: number;
    pendingTasksCount: number;
    totalPermissionsCount: number;
  };
}

export default function AssistantPortalPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const toast = useToast();

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/assistant-portal/summary');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        toast.error(json.error || 'تعذر تحميل بيانات البوابة');
        if (json.error && (json.error.includes('معطل') || json.error.includes('تجميد'))) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    setUpdatingTaskId(taskId);
    try {
      const newStatus = currentStatus === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(newStatus === 'COMPLETED' ? 'تم إنجاز المهمة بنجاح ✅' : 'تم تحديث حالة المهمة');
        setData(prev => {
          if (!prev) return prev;
          const updatedTasks = prev.tasks.map(t =>
            t.id === taskId ? { ...t, status: newStatus as any } : t
          );
          return {
            ...prev,
            tasks: updatedTasks,
            stats: {
              ...prev.stats,
              pendingTasksCount: updatedTasks.filter(t => t.status !== 'COMPLETED').length,
            }
          };
        });
      } else {
        toast.error(json.error || 'تعذر تحديث المهمة');
      }
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#090a0f] p-6 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">جاري إعداد لوحة تحكم المساعد...</p>
      </div>
    );
  }

  const assistant = data?.assistant;
  const permissions = assistant?.permissions || [];
  const stats = data?.stats;

  // Quick Action Config based on permissions
  const quickActions = [
    {
      id: 'attendance',
      title: 'ماسح الـ QR والحضور',
      desc: 'تسجيل حضور الطلاب بالباركود',
      href: '/attendance',
      icon: QrCode,
      color: 'from-blue-600 to-indigo-600',
      allowed: hasPermission(assistant, 'attendance.scan') || hasPermission(assistant, 'attendance.manual'),
    },
    {
      id: 'daily_attendance',
      title: 'تحصيل غياب اليوم',
      desc: 'كشف وحصر الغائبين اليوم',
      href: '/daily-attendance',
      icon: ClipboardList,
      color: 'from-amber-600 to-orange-600',
      allowed: hasPermission(assistant, 'attendance.daily'),
    },
    {
      id: 'homework',
      title: 'الواجبات والتقييمات',
      desc: 'رصد الواجبات والدرجات',
      href: '/homework',
      icon: BookOpenCheck,
      color: 'from-emerald-600 to-teal-600',
      allowed: hasPermission(assistant, 'homework.manage'),
    },
    {
      id: 'exams',
      title: 'الامتحانات والنتائج',
      desc: 'رصد درجات الاختبارات',
      href: '/exams',
      icon: FileSpreadsheet,
      color: 'from-purple-600 to-pink-600',
      allowed: hasPermission(assistant, 'exams.manage'),
    },
    {
      id: 'payments',
      title: 'تحصيل الاشتراكات',
      desc: 'تسجيل المدفوعات النقدية',
      href: '/payments',
      icon: Banknote,
      color: 'from-cyan-600 to-blue-600',
      allowed: hasPermission(assistant, 'payments.collect') || hasPermission(assistant, 'subscriptions.view'),
    },
    {
      id: 'students',
      title: 'قائمة وشؤون الطلاب',
      desc: 'إضافة وتعديل بيانات الطلاب',
      href: '/students',
      icon: GraduationCap,
      color: 'from-violet-600 to-indigo-600',
      allowed: hasPermission(assistant, 'students.view') || hasPermission(assistant, 'students.create'),
    },
    {
      id: 'parent_comm',
      title: 'تواصل أولياء الأمور',
      desc: 'سجل الاتصالات والملاحظات',
      href: '/parent-comm',
      icon: MessageSquare,
      color: 'from-fuchsia-600 to-rose-600',
      allowed: hasPermission(assistant, 'parent_comm.manage'),
    },
    {
      id: 'cards',
      title: 'طباعة كروت الطلاب',
      desc: 'تصدير وطباعة الكارنيهات',
      href: '/cards',
      icon: IdCard,
      color: 'from-zinc-700 to-zinc-900',
      allowed: hasPermission(assistant, 'cards.print'),
    },
  ].filter(action => action.allowed);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#090a0f] text-zinc-900 dark:text-zinc-100 p-4 md:p-8 transition-colors duration-200">
      {/* Hero Welcome Header */}
      <HeroHeader
        title={`مرحباً بك، ${assistant?.name || 'مساعدنا العزيز'}`}
        subtitle="لوحة المساعد الذكية - متابعة حصص اليوم، تسجيل الحضور، رصد التقييمات، وإنجاز المهام المسندة إليك بكل سهولة وسرعة."
        badge="لوحة تحكم المساعد المعتمد"
      />

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">مجموعاتك المسندة</p>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {stats?.assignedGroupsCount || 0}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">حصص اليوم المجدولة</p>
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {stats?.todaySessionsCount || 0}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">حضور اليوم المسجل</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats?.todayAttendancesCount || 0}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">مهام قيد الإنجاز</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats?.pendingTasksCount || 0}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <CheckSquare className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Quick Action Buttons (Filtered by permissions) */}
      <div className="my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>العمليات السريعة المتاحة لك</span>
          </h2>
          <span className="text-xs text-zinc-400 font-semibold">
            {quickActions.length} أدوات مصرح بها
          </span>
        </div>

        {quickActions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/60 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-center">
            <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">لم يتم تفعيل صلاحيات تشغيلية لحسابك بعد</p>
            <p className="text-xs text-zinc-500 mt-1">يرجى مراجعة الأستاذ لتفعيل الصلاحيات المطلوبة لمهامك.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Link key={action.id} href={action.href} className="group">
                  <motion.div
                    whileHover={{ y: -3 }}
                    className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-blue-500/50 transition-all shadow-xs hover:shadow-md flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${action.color} text-white flex items-center justify-center shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{action.desc}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: Today's Schedule + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
        {/* Left 2 Cols: Today's Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>جدول حصص اليوم</span>
            </h2>
            <span className="text-xs text-zinc-400 font-semibold">
              {data?.todaySessions.length || 0} حصص مجدولة
            </span>
          </div>

          {!data?.todaySessions || data.todaySessions.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">لا توجد حصص مجدولة لليوم</h3>
              <p className="text-xs text-zinc-500 mt-1">استمتع بيوم هادئ أو تابع الواجبات والمهام المسندة إليك.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.todaySessions.map(session => (
                <div
                  key={session.id}
                  className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{session.title || session.group.name}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {session.group.academicStage?.name} • الميعاد: {session.startTime} - {session.endTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      حضور: {session._count?.attendances || 0}
                    </span>

                    {hasPermission(assistant, 'attendance.scan') && (
                      <Link
                        href={`/attendance?groupId=${session.group.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>تحضير QR</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assigned Groups Card List */}
          <div className="mt-8 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>مجموعاتك التعليمية المخصصة ({data?.assignedGroups.length || 0})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data?.assignedGroups.map(grp => (
                <div
                  key={grp.id}
                  className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{grp.name}</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{grp.academicStage?.name}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {grp._count?.students || 0} طالب
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: My Assigned Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-amber-500" />
              <span>مهامك وتكليفاتك ({data?.tasks.length || 0})</span>
            </h2>
            {hasPermission(assistant, 'tasks.manage') && (
              <Link href="/tasks" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                عرض الكل
              </Link>
            )}
          </div>

          {!data?.tasks || data.tasks.length === 0 ? (
            <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">لا توجد مهام معلقة لك</h3>
              <p className="text-xs text-zinc-500 mt-1">لقد أتممت كافة التكليفات المطلوبة منك بنجاح 🌟</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.tasks.map(task => {
                const isCompleted = task.status === 'COMPLETED';
                const isUpdating = updatingTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
                      isCompleted
                        ? 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/40 opacity-75'
                        : 'bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1">
                      <button
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        disabled={isUpdating}
                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-500'
                        }`}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : null}
                      </button>

                      <div>
                        <p className={`text-xs font-bold leading-snug ${isCompleted ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-white'}`}>
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <span className="text-[10px] text-zinc-400 mt-1 block">
                            الموعد: {new Date(task.dueDate).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        task.priority === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-600'
                          : task.priority === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-blue-500/10 text-blue-600'
                      }`}
                    >
                      {task.priority === 'HIGH' ? 'هام' : task.priority === 'MEDIUM' ? 'متوسط' : 'عادي'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Permissions Overview Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-purple-600/10 border border-blue-500/20 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white">صلاحياتك الممنوحة</h3>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
              لديك {permissions.length} صلاحيات محددة من قبل الأستاذ أحمد راضي كحلة.
            </p>
            <div className="flex flex-wrap gap-1">
              {permissions.map(perm => (
                <span key={perm} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
