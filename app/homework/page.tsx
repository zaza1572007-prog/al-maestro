'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, BookOpen, Calendar, Users } from 'lucide-react';

interface Homework {
  id: string;
  title: string;
  description?: string;
  group: { id: string; name: string };
  dueDate: string;
  maxScore?: number;
  isMandatory: boolean;
  _count: { submissions: number };
}

interface Group {
  id: string;
  name: string;
}

export default function HomeworkPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingHW, setIsAddingHW] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newHW, setNewHW] = useState({
    title: '',
    description: '',
    groupId: '',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    maxScore: 10,
    isMandatory: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hwRes, grpRes] = await Promise.all([
        fetch('/api/homework'),
        fetch('/api/groups'),
      ]);
      const hwData = await hwRes.json();
      const grpData = await grpRes.json();
      if (hwData.success) setHomeworks(hwData.homeworks || []);
      if (grpData.success || grpData.groups) setGroups(grpData.groups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateHW = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHW),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setIsAddingHW(false);
        setNewHW({ title: '', description: '', groupId: '', dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], maxScore: 10, isMandatory: true });
      } else {
        alert(data.error || 'حدث خطأ');
      }
    } catch (err) {
      alert('تعذّر الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📚 الواجبات والتقييمات</h1>
          <p className="text-slate-400 text-sm mt-1">إدارة الواجبات المنزلية وتتبع تسليمات الطلاب</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAddingHW(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            إضافة واجب
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ التحميل...
        </div>
      ) : (
        <div className="space-y-3">
          {homeworks.map((hw) => {
            const overdue = isOverdue(hw.dueDate);
            return (
              <div key={hw.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {hw.isMandatory && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold">إلزامي</span>
                    )}
                    {overdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold">انتهى الموعد</span>
                    )}
                  </div>
                  <h3 className="font-bold text-white">{hw.title}</h3>
                  {hw.description && <p className="text-xs text-slate-400 line-clamp-1">{hw.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {hw.group?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      الموعد: {new Date(hw.dueDate).toLocaleDateString('ar-EG')}
                    </span>
                    {hw.maxScore && <span>الدرجة القصوى: {hw.maxScore}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">التسليمات</p>
                    <p className="text-lg font-black text-white flex items-center gap-1">
                      <Users className="w-4 h-4 text-blue-400" />
                      {hw._count?.submissions ?? 0}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`حذف واجب "${hw.title}"؟`)) return;
                      const res = await fetch(`/api/homework/${hw.id}`, { method: 'DELETE' });
                      const data = await res.json();
                      if (data.success) fetchData();
                      else alert(data.error || 'خطأ في الحذف');
                    }}
                    className="p-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-xs transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
          {homeworks.length === 0 && (
            <div className="text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              لا توجد واجبات مسجلة. اضغط "إضافة واجب" للبدء
            </div>
          )}
        </div>
      )}

      {/* Add Homework Modal */}
      {isAddingHW && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">📚 إضافة واجب جديد</h3>
              <button onClick={() => setIsAddingHW(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateHW} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-300 mb-1 text-xs">عنوان الواجب *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: واجب الهندسة - الجلسة الثالثة"
                  value={newHW.title}
                  onChange={(e) => setNewHW({ ...newHW, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-xs">المجموعة *</label>
                <select
                  required
                  value={newHW.groupId}
                  onChange={(e) => setNewHW({ ...newHW, groupId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                >
                  <option value="">اختر المجموعة...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-xs">وصف الواجب (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="وصف تفصيلي للواجب..."
                  value={newHW.description}
                  onChange={(e) => setNewHW({ ...newHW, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">تاريخ التسليم *</label>
                  <input
                    type="date"
                    required
                    value={newHW.dueDate}
                    onChange={(e) => setNewHW({ ...newHW, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">الدرجة القصوى</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newHW.maxScore}
                    onChange={(e) => setNewHW({ ...newHW, maxScore: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newHW.isMandatory}
                  onChange={(e) => setNewHW({ ...newHW, isMandatory: e.target.checked })}
                  className="accent-blue-600"
                />
                واجب إلزامي
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddingHW(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg text-sm">
                  {isSaving ? 'جاري الحفظ...' : 'إضافة الواجب ➕'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
