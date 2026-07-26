'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, Users, BookOpen, RefreshCw, Plus, Trash2, Pencil } from 'lucide-react';

interface Stage {
  id: string;
  name: string;
  level: string;
  grade: string;
  description?: string;
  _count: { students: number; groups: number };
}

const levelColors: Record<string, string> = {
  Primary: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
  Middle: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
  High: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
};

const levelLabels: Record<string, string> = {
  Primary: 'المرحلة الابتدائية',
  Middle: 'المرحلة الإعدادية',
  High: 'المرحلة الثانوية',
};

export default function StagesPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newStage, setNewStage] = useState({ name: '', level: 'Middle', grade: '', description: '' });

  const fetchStages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stages');
      const data = await res.json();
      if (data.success) setStages(data.stages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStages(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStage),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStages();
        setIsAdding(false);
        setNewStage({ name: '', level: 'Middle', grade: '', description: '' });
      } else {
        alert(data.error || 'حدث خطأ');
      }
    } catch {
      alert('تعذّر الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/stages/${editingStage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStage),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStages();
        setEditingStage(null);
      } else {
        alert(data.error || 'حدث خطأ في التحديث');
      }
    } catch {
      alert('تعذّر الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المرحلة "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/stages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchStages();
      else alert(data.error || 'لا يمكن حذف المرحلة');
    } catch {
      alert('خطأ في الاتصال');
    }
  };

  // Group stages by level
  const grouped: Record<string, Stage[]> = {};
  stages.forEach((s) => {
    if (!grouped[s.level]) grouped[s.level] = [];
    grouped[s.level].push(s);
  });
  const levelOrder = ['Primary', 'Middle', 'High'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🎓 المراحل الدراسية</h1>
          <p className="text-slate-400 text-sm mt-1">إدارة المراحل الابتدائية والإعدادية والثانوية مع إحصائياتها الحقيقية</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStages} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /> إضافة مرحلة
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل المراحل...
        </div>
      ) : (
        levelOrder.map((lvl) => {
          const lvlStages = grouped[lvl] || [];
          if (lvlStages.length === 0) return null;
          return (
            <div key={lvl} className="space-y-3">
              <h2 className="text-base font-bold text-slate-300 border-b border-slate-800 pb-2">
                {levelLabels[lvl] || lvl}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lvlStages.map((stage) => {
                  const color = levelColors[stage.level] || 'from-slate-500/20 to-slate-600/20 border-slate-500/30 text-slate-400';
                  return (
                    <div
                      key={stage.id}
                      className={`bg-gradient-to-b ${color} border rounded-3xl p-6 shadow-xl space-y-4`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                        <div>
                          <h3 className="font-bold text-white text-base">{stage.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{stage.grade}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingStage({ ...stage })}
                            className="p-1.5 bg-white/10 hover:bg-amber-500/30 text-amber-400 rounded-lg transition"
                            title="تعديل"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(stage.id, stage.name)}
                            className="p-1.5 bg-white/10 hover:bg-rose-500/30 text-rose-400 rounded-lg transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center text-xs">
                        <div className="bg-black/20 p-3 rounded-xl">
                          <Users className="w-4 h-4 mx-auto mb-1 opacity-70" />
                          <p className="text-slate-400">الطلاب</p>
                          <p className="text-lg font-black text-white">{stage._count.students}</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl">
                          <BookOpen className="w-4 h-4 mx-auto mb-1 opacity-70" />
                          <p className="text-slate-400">المجموعات</p>
                          <p className="text-lg font-black text-white">{stage._count.groups}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Link
                          href={`/students?stageId=${stage.id}`}
                          className="flex-1 text-center py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold transition"
                        >
                          عرض الطلاب
                        </Link>
                        <Link
                          href={`/groups?stageId=${stage.id}`}
                          className="flex-1 text-center py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold transition"
                        >
                          عرض المجموعات
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {!loading && stages.length === 0 && (
        <div className="text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد مراحل دراسية. اضغط "إضافة مرحلة" للبدء.</p>
        </div>
      )}

      {/* Add Stage Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">🎓 إضافة مرحلة دراسية</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-300 mb-1 text-xs">اسم المرحلة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الثالث الإعدادي"
                  value={newStage.name}
                  onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">المرحلة</label>
                  <select
                    value={newStage.level}
                    onChange={(e) => setNewStage({ ...newStage, level: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  >
                    <option value="Primary">ابتدائية</option>
                    <option value="Middle">إعدادية</option>
                    <option value="High">ثانوية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">الصف</label>
                  <input
                    type="text"
                    placeholder="مثال: Grade 9"
                    value={newStage.grade}
                    onChange={(e) => setNewStage({ ...newStage, grade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm">إلغاء</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg text-sm">
                  {isSaving ? 'جاري الحفظ...' : 'إضافة ➕'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stage Modal */}
      {editingStage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">✏️ تعديل: {editingStage.name}</h3>
              <button onClick={() => setEditingStage(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-300 mb-1 text-xs">اسم المرحلة *</label>
                <input
                  type="text"
                  required
                  value={editingStage.name}
                  onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">المرحلة</label>
                  <select
                    value={editingStage.level}
                    onChange={(e) => setEditingStage({ ...editingStage, level: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  >
                    <option value="Primary">ابتدائية</option>
                    <option value="Middle">إعدادية</option>
                    <option value="High">ثانوية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">الصف</label>
                  <input
                    type="text"
                    value={editingStage.grade || ''}
                    onChange={(e) => setEditingStage({ ...editingStage, grade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingStage(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm">إلغاء</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg text-sm">
                  {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
