'use client';

import { useState } from 'react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([
    {
      id: 'p1',
      studentName: 'أحمد محمد علي',
      totalAmount: 300,
      paidAmount: 300,
      remainingAmount: 0,
      method: 'CASH',
      date: '2026-07-20',
      recordedBy: 'الأستاذ أحمد راضي',
    },
    {
      id: 'p2',
      studentName: 'سارة إبراهيم محمود',
      totalAmount: 350,
      paidAmount: 200,
      remainingAmount: 150,
      method: 'CASH',
      date: '2026-07-22',
      recordedBy: 'أحمد الإداري',
    },
  ]);

  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [studentName, setStudentName] = useState('أحمد محمد علي');
  const [totalAmount, setTotalAmount] = useState(300);
  const [paidAmount, setPaidAmount] = useState(300);

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `p_${Date.now()}`,
      studentName,
      totalAmount,
      paidAmount,
      remainingAmount: Math.max(0, totalAmount - paidAmount),
      method: 'CASH',
      date: new Date().toISOString().split('T')[0],
      recordedBy: 'الأستاذ أحمد راضي',
    };
    setPayments(prev => [created, ...prev]);
    setIsAddingPayment(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💰 إدارة المدفوعات والقيود المالية (Payments)</h1>
          <p className="text-slate-400 text-sm mt-1">
            تسجيل السداد والحساب التلقائي للمبلغ المتبقي (المتبقي = المطلوب - المدفوع) دون خصومات
          </p>
        </div>
        <button
          onClick={() => setIsAddingPayment(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          <span>➕</span> تسجيل عملية دفع جديدة
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">اسم الطالب</th>
                <th className="p-3.5">المبلغ المطلوب</th>
                <th className="p-3.5">المبلغ المدفوع</th>
                <th className="p-3.5">المبلغ المتبقي</th>
                <th className="p-3.5">التاريخ والشخص المسجل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-bold text-white">{p.studentName}</td>
                  <td className="p-3.5 font-bold text-slate-300">{p.totalAmount} ج.م</td>
                  <td className="p-3.5 font-bold text-emerald-400">{p.paidAmount} ج.م</td>
                  <td className="p-3.5">
                    {p.remainingAmount > 0 ? (
                      <span className="font-bold text-rose-400">{p.remainingAmount} ج.م (متبقي)</span>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">خالص السداد ✅</span>
                    )}
                  </td>
                  <td className="p-3.5 text-xs text-slate-400">
                    {p.date} • <strong className="text-slate-300">{p.recordedBy}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {isAddingPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">💰 تسجيل عملية دفع وسداد جديدة</h3>
              <button onClick={() => setIsAddingPayment(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreatePayment} className="space-y-3 text-xs">
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">المبلغ المطلوب (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">المبلغ المدفوع (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
              <p className="text-[11px] text-blue-400 font-semibold">
                المبلغ المتبقي المحسوب: {Math.max(0, totalAmount - paidAmount)} ج.م
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPayment(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg">
                  تسجيل عملية الدفع 💰
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

