'use client';

import { useState, useEffect } from 'react';

export default function ParentCommPage() {
  const [comms, setComms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isAddingComm, setIsAddingComm] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState('هاتف 📞');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [commsRes, studentsRes] = await Promise.all([
        fetch('/api/parent-comm'),
        fetch('/api/students')
      ]);
      const commsData = await commsRes.json();
      const studentsData = await studentsRes.json();

      if (commsData.success) setComms(commsData.comms);
      if (studentsData.success) {
        setStudents(studentsData.students);
        if (studentsData.students.length > 0) {
          setStudentId(studentsData.students[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateComm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/parent-comm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, channel, reason, notes })
      });
      const data = await res.json();
      if (data.success) {
        setComms(prev => [data.comm, ...prev]);
        setIsAddingComm(false);
        setReason('');
        setNotes('');
      } else {
        alert(data.error || 'حدث خطأ أثناء حفظ التدوين');
      }
    } catch (error) {
      alert('تعذّر الاتصال بالخادم');
    }
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
                  <td className="p-3.5 font-bold text-white">{c.student?.name || 'غير معروف'}</td>
                  <td className="p-3.5 text-xs text-blue-400 font-semibold">{c.method === 'WHATSAPP' ? 'WhatsApp 💬' : 'هاتف 📞'}</td>
                  <td className="p-3.5 text-slate-300">{c.reason}</td>
                  <td className="p-3.5 text-slate-300">{c.notes}</td>
                  <td className="p-3.5 text-xs text-slate-400 font-mono">{new Date(c.date).toLocaleDateString('ar-EG')}</td>
                </tr>
              ))}
              {comms.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">لا توجد سجلات تواصل</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 animate-pulse">جاري تحميل السجلات...</td>
                </tr>
              )}
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
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - {s.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">وسيلة التواصل</label>
                <select
                  required
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="هاتف 📞">هاتف 📞</option>
                  <option value="WhatsApp 💬">WhatsApp 💬</option>
                </select>
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

