'use client';

import { useState } from 'react';

export default function ParentCommPage() {
  const [comms, setComms] = useState([
    {
      id: 'c1',
      studentName: 'سارة إبراهيم محمود',
      channel: 'WhatsApp 💬',
      reason: 'متابعة الغياب في حصة الأحد',
      notes: 'تم الاتفاق على حضور حصة التعويض يوم الإثنين',
      date: '2026-07-23',
    },
  ]);

  const [isAddingComm, setIsAddingComm] = useState(false);
  const [studentName, setStudentName] = useState('سارة إبراهيم محمود');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreateComm = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `c_${Date.now()}`,
      studentName,
      channel: 'هاتف 📞 / WhatsApp 💬',
      reason: reason || 'متابعة أداء الطالب',
      notes: notes || 'تم تدوين الملاحظة بنجاح',
      date: new Date().toISOString().split('T')[0],
    };
    setComms(prev => [created, ...prev]);
    setIsAddingComm(false);
    setReason('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💬 سجل تواصل أولياء الأمور (Parent Communication Log)</h1>
          <p className="text-slate-400 text-sm mt-1">توثيق تاريخ الاتصال ووسيلة التواصل والملاحظات التي تم التوصل إليها</p>
        </div>
        <button
          onClick={() => setIsAddingComm(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <span>➕</span> تدوين اتصال جديد
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">اسم الطالب</th>
                <th className="p-3.5">وسيلة التواصل</th>
                <th className="p-3.5">سبب التواصل</th>
                <th className="p-3.5">النتيجة والملاحظات</th>
                <th className="p-3.5">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {comms.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-bold text-white">{c.studentName}</td>
                  <td className="p-3.5 text-xs text-blue-400 font-semibold">{c.channel}</td>
                  <td className="p-3.5 text-slate-300">{c.reason}</td>
                  <td className="p-3.5 text-slate-300">{c.notes}</td>
                  <td className="p-3.5 text-xs text-slate-400 font-mono">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Call Log Modal */}
      {isAddingComm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">💬 تدوين اتصال / ملاحظة ولي أمر جديدة</h3>
              <button onClick={() => setIsAddingComm(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateComm} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">اسم الطالب</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">سبب التواصل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متابعة درجات الاختبار"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">النتيجة والملاحظات</label>
                <textarea
                  required
                  rows={3}
                  placeholder="تدوين ملخص المكالمة أو الاتفاق مع ولي الأمر..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingComm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg">
                  حفظ التدوين 💬
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

