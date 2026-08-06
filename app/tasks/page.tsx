'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Trash2, Calendar, User, AlertCircle, Plus, X, Loader2, Play } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  assignedToId: string;
  assignedTo: {
    id: string;
    name: string;
    role: string;
  };
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED';
  dueDate: string | null;
  createdAt: string;
}

const PRIORITY_CONFIG = {
  HIGH: { label: 'عالية 🔴', badge: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
  MEDIUM: { label: 'متوسطة 🟡', badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  LOW: { label: 'منخفضة 🟢', badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
};

const STATUS_CONFIG = {
  NEW: { label: 'جديدة', badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  IN_PROGRESS: { label: 'قيد التنفيذ', badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  COMPLETED: { label: 'تم الإنجاز ✅', badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  POSTPONED: { label: 'مؤجلة', badge: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  const toast = useToast();

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        setStaff(data.staff);
        if (data.staff.length > 0 && !assignedToId) {
          setAssignedToId(data.staff[0].id);
        }
      } else {
        toast.error(data.error || 'تعذر تحميل قائمة المهام');
      }
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignedToId) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          assignedToId,
          priority,
          dueDate: dueDate || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('تمت إضافة المهمة بنجاح! 🎉');
        setTitle('');
        setDueDate('');
        setIsAddingTask(false);
        fetchTasks();
      } else {
        toast.error(data.error || 'فشل إرسال المهمة');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم تحديث حالة المهمة بنجاح');
        fetchTasks();
      } else {
        toast.error(data.error || 'فشل تحديث حالة المهمة');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف المهمة نهائياً؟')) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم حذف المهمة بنجاح 🗑️');
        fetchTasks();
      } else {
        toast.error(data.error || 'فشل حذف المهمة');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ في الاتصال بالخادم');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>✅</span>
            <span>نظام إدارة المهام الإدارية (Task Manager)</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">توزيع المهام بين الأستاذ والمساعدين وتتبع حالات التنفيذ والأولوية</p>
        </div>
        <button
          onClick={() => {
            setIsAddingTask(true);
            if (staff.length > 0) {
              setAssignedToId(staff[0].id);
            }
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مهمة جديدة</span>
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">جاري تحميل قائمة المهام...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-slate-400 text-lg">لا توجد مهام حالياً</p>
            <p className="text-sm mt-1">اضغط على إضافة مهمة لبدء المتابعة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5 pr-6">عنوان المهمة</th>
                  <th className="p-3.5">المسؤول عن التنفيذ</th>
                  <th className="p-3.5">الأولوية</th>
                  <th className="p-3.5">تاريخ الاستحقاق</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center pl-6">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tasks.map((t) => (
                  <tr 
                    key={t.id} 
                    className={`hover:bg-slate-800/40 transition-colors ${
                      t.status === 'COMPLETED' ? 'opacity-60' : ''
                    }`}
                  >
                    <td className={`p-3.5 pr-6 font-bold text-white text-sm ${t.status === 'COMPLETED' ? 'line-through text-slate-500' : ''}`}>
                      {t.title}
                    </td>
                    <td className="p-3.5 text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {t.assignedTo?.name || 'مساعد'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${PRIORITY_CONFIG[t.priority]?.badge || PRIORITY_CONFIG.MEDIUM.badge}`}>
                        {PRIORITY_CONFIG[t.priority]?.label || PRIORITY_CONFIG.MEDIUM.label}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs text-slate-400 font-mono">
                      {t.dueDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(t.dueDate).toLocaleDateString('ar-EG')}
                        </span>
                      ) : (
                        <span className="text-slate-600">غير محدد</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${STATUS_CONFIG[t.status]?.badge || STATUS_CONFIG.NEW.badge}`}>
                        {STATUS_CONFIG[t.status]?.label || STATUS_CONFIG.NEW.label}
                      </span>
                    </td>
                    <td className="p-3.5 text-center pl-6">
                      <div className="flex items-center justify-center gap-2">
                        {t.status === 'NEW' && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                            className="px-2 py-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>بدء</span>
                          </button>
                        )}
                        {t.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'COMPLETED')}
                            className="px-2 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>إتمام</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="px-2 py-1 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📋</span>
                <span>إضافة مهمة إدارية جديدة</span>
              </h3>
              <button 
                onClick={() => setIsAddingTask(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">عنوان المهمة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تجهيز كشوف حضور مجموعة الأحد"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">المسؤول عن التنفيذ</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role === 'OWNER' ? 'الأستاذ' : 'مساعد'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">الأولوية</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    <option value="HIGH">عالية</option>
                    <option value="MEDIUM">متوسطة</option>
                    <option value="LOW">منخفضة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>إضافة المهمة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

