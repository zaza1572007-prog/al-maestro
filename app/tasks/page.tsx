'use client';

import { useState } from 'react';

export default function TasksPage() {
  const [tasks, setTasks] = useState([
    {
      id: 't1',
      title: 'طباعة بطاقات QR لمجموعة السبت 4:00 مساءً',
      assignedTo: 'أحمد المساعد',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: '2026-07-26',
    },
    {
      id: 't2',
      title: 'رصد درجات امتحان الشهر لمجموعة الأحد',
      assignedTo: 'محمد المساعد',
      priority: 'MEDIUM',
      status: 'NEW',
      dueDate: '2026-07-27',
    },
  ]);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('أحمد المساعد');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `t_${Date.now()}`,
      title: title || 'مهمة جديدة',
      assignedTo,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: new Date().toISOString().split('T')[0],
    };
    setTasks(prev => [created, ...prev]);
    setIsAddingTask(false);
    setTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">✅ نظام إدارة المهام الإدارية (Task Manager)</h1>
          <p className="text-slate-400 text-sm mt-1">توزيع المهام بين الأستاذ والمساعدين وتتبع حالات التنفيذ والأولوية</p>
        </div>
        <button
          onClick={() => setIsAddingTask(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <span>➕</span> إضافة مهمة جديدة
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">عنوان المهمة</th>
                <th className="p-3.5">المسؤول عن التنفيذ</th>
                <th className="p-3.5">الأولوية</th>
                <th className="p-3.5">تاريخ الاستلام</th>
                <th className="p-3.5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-bold text-white">{t.title}</td>
                  <td className="p-3.5 text-slate-300">{t.assignedTo}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      عالية 🔴
                    </span>
                  </td>
                  <td className="p-3.5 text-xs text-slate-400 font-mono">{t.dueDate}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      قيد التنفيذ
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">✅ إضافة مهمة إدارية جديدة</h3>
              <button onClick={() => setIsAddingTask(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">عنوان المهمة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تجهيز كشوف حضور مجموعة الأحد"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">المسؤول عن التنفيذ</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="أحمد المساعد">أحمد المساعد</option>
                  <option value="محمد المساعد">محمد المساعد</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg">
                  إضافة المهمة ➕
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

