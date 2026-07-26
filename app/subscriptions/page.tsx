'use client';

import { useState } from 'react';

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([
    {
      id: 'sub1',
      studentName: 'أحمد محمد علي',
      groupName: 'مجموعة السبت 4:00',
      price: '300 ج.م',
      sessionsCount: 8,
      usedSessions: 2,
      status: 'ACTIVE',
      endDate: '2026-08-15',
    },
    {
      id: 'sub2',
      studentName: 'سارة إبراهيم محمود',
      groupName: 'مجموعة الأحد 6:00',
      price: '350 ج.م',
      sessionsCount: 8,
      usedSessions: 7,
      status: 'EXPIRING_SOON',
      endDate: '2026-07-28',
    },
  ]);

  const [isAddingSub, setIsAddingSub] = useState(false);
  const [studentName, setStudentName] = useState('أحمد محمد علي');
  const [price, setPrice] = useState('300 ج.م');

  const handleCreateSub = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `sub_${Date.now()}`,
      studentName,
      groupName: 'مجموعة السبت 4:00',
      price,
      sessionsCount: 8,
      usedSessions: 0,
      status: 'ACTIVE',
      endDate: '2026-08-30',
    };
    setSubs(prev => [created, ...prev]);
    setIsAddingSub(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💳 إدارة الاشتراكات الشهرية (Subscriptions)</h1>
          <p className="text-slate-400 text-sm mt-1">متابعة تجديد الاشتراكات وعدد الحصص المتبقية لكل طالب</p>
        </div>
        <button
          onClick={() => setIsAddingSub(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <span>➕</span> تجديد / إنشاء اشتراك
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">اسم الطالب</th>
                <th className="p-3.5">المجموعة</th>
                <th className="p-3.5">قيمة الاشتراك</th>
                <th className="p-3.5">استهلاك الحصص</th>
                <th className="p-3.5">تاريخ الانتهاء</th>
                <th className="p-3.5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-bold text-white">{s.studentName}</td>
                  <td className="p-3.5 text-slate-300">{s.groupName}</td>
                  <td className="p-3.5 font-bold text-emerald-400">{s.price}</td>
                  <td className="p-3.5 text-slate-300">
                    {s.usedSessions} من {s.sessionsCount} حصص
                  </td>
                  <td className="p-3.5 text-slate-400 font-mono text-xs">{s.endDate}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {s.status === 'ACTIVE' ? 'نشط' : 'سينتهي قريباً'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subscription Modal */}
      {isAddingSub && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">💳 تجديد / إنشاء اشتراك شهر جديد</h3>
              <button onClick={() => setIsAddingSub(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateSub} className="space-y-3 text-xs">
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
                <label className="block text-slate-300 mb-1">قيمة الاشتراك (ج.م)</label>
                <input
                  type="text"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSub(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg">
                  تأكيد وتجديد الاشتراك 💳
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

