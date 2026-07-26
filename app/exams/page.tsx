'use client';

import { useState } from 'react';

export default function ExamsPage() {
  const [exams, setExams] = useState([
    {
      id: 'e1',
      title: 'اختبار شهر يوليو في الجبر والفرع الأول',
      groupName: 'مجموعة الأحد 6:00',
      examDate: '2026-07-25',
      type: 'MONTHLY',
      maxScore: 100,
      avgScore: 84.5,
      highestScore: 100,
      lowestScore: 62,
    },
  ]);

  const [isAddingExam, setIsAddingExam] = useState(false);
  const [gradingExam, setGradingExam] = useState<any | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newGroup, setNewGroup] = useState('مجموعة الأحد 6:00');

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `e_${Date.now()}`,
      title: newTitle || 'اختبار جديد',
      groupName: newGroup,
      examDate: new Date().toISOString().split('T')[0],
      type: 'MONTHLY',
      maxScore: 100,
      avgScore: 0,
      highestScore: 0,
      lowestScore: 0,
    };
    setExams(prev => [created, ...prev]);
    setIsAddingExam(false);
    setNewTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📝 إدارة الامتحانات والاختبارات (Exams Module)</h1>
          <p className="text-slate-400 text-sm mt-1">إنشاء الاختبارات، رصد الدرجات، وتحليل أعلى وأقل درجة والترتيب التلقائي</p>
        </div>
        <button
          onClick={() => setIsAddingExam(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <span>➕</span> إنشاء امتحان جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exams.map((ex) => (
          <div key={ex.id} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-white">{ex.title}</h3>
                <p className="text-xs text-blue-400 font-medium mt-0.5">{ex.groupName}</p>
              </div>
              <span className="px-2.5 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs rounded-full font-bold">
                امتحان شهري
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <p className="text-slate-400">متوسط الدرجات</p>
                <p className="text-sm font-bold text-blue-400 mt-1">{ex.avgScore} / 100</p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <p className="text-slate-400">أعلى درجة 🥇</p>
                <p className="text-sm font-bold text-emerald-400 mt-1">{ex.highestScore}</p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <p className="text-slate-400">أقل درجة</p>
                <p className="text-sm font-bold text-rose-400 mt-1">{ex.lowestScore}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-slate-400 font-mono">تاريخ الامتحان: {ex.examDate}</span>
              <button
                onClick={() => setGradingExam(ex)}
                className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl font-bold transition"
              >
                رصد وتعديل الدرجات ←
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Exam Modal */}
      {isAddingExam && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">➕ إنشاء امتحان جديد</h3>
              <button onClick={() => setIsAddingExam(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateExam} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">عنوان الامتحان</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: اختبار شهر أغسطس في التفاضل"
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
                  <option value="مجموعة الأحد 6:00">مجموعة الأحد 6:00</option>
                  <option value="مجموعة السبت 4:00">مجموعة السبت 4:00</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingExam(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg">
                  حفظ الامتحان ➕
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Exam Modal */}
      {gradingExam && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">📝 رصد وتعديل درجات: {gradingExam.title}</h3>
              <button onClick={() => setGradingExam(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span>أحمد محمد علي</span>
                <input type="number" defaultValue={95} max={100} className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-emerald-400" />
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span>سارة إبراهيم محمود</span>
                <input type="number" defaultValue={88} max={100} className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-blue-400" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { alert('تم حفظ وتحديث درجات الاختبار بنجاح ✅'); setGradingExam(null); }} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold">
                  اعتماد ورصد الدرجات 💾
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

