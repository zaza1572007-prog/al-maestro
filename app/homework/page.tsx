'use client';

import { useState } from 'react';

export default function HomeworkPage() {
  const [homeworks, setHomeworks] = useState([
    {
      id: 'h1',
      title: 'واجب الهندسة وحساب المثلثات - الجلسة 4',
      groupName: 'مجموعة السبت 4:00',
      dueDate: '2026-07-28',
      maxScore: 10,
      isMandatory: true,
      submissionsCount: 28,
    },
  ]);

  const [isAddingHW, setIsAddingHW] = useState(false);
  const [gradingHW, setGradingHW] = useState<any | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newGroup, setNewGroup] = useState('مجموعة السبت 4:00');
  const [newMax, setNewMax] = useState(10);

  const handleCreateHW = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `h_${Date.now()}`,
      title: newTitle || 'واجب جديد',
      groupName: newGroup,
      dueDate: new Date().toISOString().split('T')[0],
      maxScore: newMax,
      isMandatory: true,
      submissionsCount: 0,
    };
    setHomeworks(prev => [created, ...prev]);
    setIsAddingHW(false);
    setNewTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📚 إدارة الواجبات والتقييمات (Homework)</h1>
          <p className="text-slate-400 text-sm mt-1">متابعة تسليمات الطلاب وتصحيح الواجبات وإدخال الدرجات</p>
        </div>
        <button
          onClick={() => setIsAddingHW(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <span>➕</span> إضافة واجب جديد
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">عنوان الواجب</th>
                <th className="p-3.5">المجموعة</th>
                <th className="p-3.5">موعد التسليم</th>
                <th className="p-3.5">الدرجة الكلية</th>
                <th className="p-3.5">التسليمات</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {homeworks.map((h) => (
                <tr key={h.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-bold text-white">{h.title}</td>
                  <td className="p-3.5 text-slate-300">{h.groupName}</td>
                  <td className="p-3.5 text-slate-400 font-mono text-xs">{h.dueDate}</td>
                  <td className="p-3.5 font-bold text-blue-400">{h.maxScore} درجات</td>
                  <td className="p-3.5 text-slate-300">{h.submissionsCount} طالب تم التسليم</td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setGradingHW(h)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-semibold"
                    >
                      تصحيح ورصد الدرجات ←
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Homework Modal */}
      {isAddingHW && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">➕ إضافة واجب جديد</h3>
              <button onClick={() => setIsAddingHW(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateHW} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">عنوان الواجب</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: واجب الهندسة والفرع الثاني"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">المجموعة</label>
                  <select
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="مجموعة السبت 4:00">مجموعة السبت 4:00</option>
                    <option value="مجموعة الأحد 6:00">مجموعة الأحد 6:00</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الدرجة الكلية</label>
                  <input
                    type="number"
                    value={newMax}
                    onChange={(e) => setNewMax(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingHW(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg">
                  حفظ الواجب ➕
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingHW && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">📝 تصحيح ورصد درجات: {gradingHW.title}</h3>
              <button onClick={() => setGradingHW(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span>أحمد محمد علي</span>
                <input type="number" defaultValue={10} max={gradingHW.maxScore} className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-blue-400" />
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span>سارة إبراهيم محمود</span>
                <input type="number" defaultValue={8} max={gradingHW.maxScore} className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-blue-400" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { alert('تم حفظ التقييمات والدرجات بنجاح ✅'); setGradingHW(null); }} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold">
                  حفظ كافة الدرجات 💾
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

