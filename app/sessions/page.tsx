'use client';

import { useState } from 'react';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([
    {
      id: 'ses1',
      title: 'جلسة شرح الهندسة التحليلية - الدرس الثاني',
      groupName: 'مجموعة السبت 4:00',
      date: '2026-07-25',
      time: '04:00 م - 06:00 م',
      type: 'LECTURE',
      status: 'IN_PROGRESS',
      attendanceCount: 30,
    },
  ]);

  const [isAddingSession, setIsAddingSession] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGroup, setNewGroup] = useState('مجموعة السبت 4:00');
  const [newTime, setNewTime] = useState('04:00 م - 06:00 م');

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `ses_${Date.now()}`,
      title: newTitle || 'جلسة جديدة',
      groupName: newGroup,
      date: new Date().toISOString().split('T')[0],
      time: newTime,
      type: 'LECTURE',
      status: 'IN_PROGRESS',
      attendanceCount: 0,
    };
    setSessions(prev => [created, ...prev]);
    setIsAddingSession(false);
    setNewTitle('');
  };

  const toggleSessionStatus = (id: string) => {
    setSessions(prev =>
      prev.map(s => (s.id === id ? { ...s, status: s.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS' } : s))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📅 إدارة الجلسات والدروس (Lesson Sessions)</h1>
          <p className="text-slate-400 text-sm mt-1">الربط المباشر بين الجلسات والدروس والحضور والامتحانات</p>
        </div>
        <button
          onClick={() => setIsAddingSession(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <span>➕</span> إنشاء جلسة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map((s) => (
          <div key={s.id} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-white">{s.title}</h3>
                <p className="text-xs text-blue-400 font-medium mt-0.5">{s.groupName}</p>
              </div>
              <button
                onClick={() => toggleSessionStatus(s.id)}
                className={`px-3 py-1 text-xs rounded-full font-bold border transition ${
                  s.status === 'IN_PROGRESS'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-rose-900/40 hover:text-rose-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="اضغط لإغلاق/بدء الجلسة"
              >
                {s.status === 'IN_PROGRESS' ? 'قيد التنفيذ 🟢 (اضغط للإيقاف)' : 'منتهية ⏹️ (اضغط للتفعيل)'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-center">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <p className="text-slate-400">توقيت الجلسة</p>
                <p className="text-slate-200 font-bold mt-1">{s.time}</p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <p className="text-slate-400">عدد الحاضرين</p>
                <p className="text-emerald-400 font-bold mt-1">{s.attendanceCount} طالب</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Session Modal */}
      {isAddingSession && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">➕ إنشاء جلسة درس جديدة</h3>
              <button onClick={() => setIsAddingSession(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">عنوان الجلسة / الدرس</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شرح الهندسة التحليلية - الدرس 3"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">المجموعة المستهدفة</label>
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
                <label className="block text-slate-300 mb-1">التوقيت</label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSession(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg">
                  حفظ الجلسة ➕
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
