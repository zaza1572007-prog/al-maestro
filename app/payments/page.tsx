'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, User, CreditCard, Banknote } from 'lucide-react';

interface Payment {
  id: string;
  student: { id: string; name: string; code: string };
  subscription: { id: string; totalSessions: number; price: number };
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  recordedBy: { name: string };
  notes?: string;
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
  code: string;
  subscriptions?: { id: string; price: number; status: string }[];
}

const methodLabels: Record<string, string> = {
  CASH: 'نقدي',
  BANK_TRANSFER: 'تحويل بنكي',
  CREDIT_CARD: 'بطاقة ائتمان',
  OTHER: 'أخرى',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newPayment, setNewPayment] = useState({
    studentId: '',
    subscriptionId: '',
    totalAmount: 0,
    paidAmount: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, studRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/students'),
      ]);
      const payData = await payRes.json();
      const studData = await studRes.json();
      if (payData.success) setPayments(payData.payments || []);
      if (studData.students) setStudents(studData.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const selectedStudent = students.find((s) => s.id === newPayment.studentId);
  const activeSubs = selectedStudent?.subscriptions?.filter((s) => s.status === 'ACTIVE') || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.studentId) return alert('اختر طالباً');
    if (!newPayment.subscriptionId) return alert('اختر اشتراكاً');
    setIsSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setIsAdding(false);
        setNewPayment({ studentId: '', subscriptionId: '', totalAmount: 0, paidAmount: 0 });
      } else {
        alert(data.error || 'حدث خطأ');
      }
    } catch (err) {
      alert('تعذّر الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return;
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.error || 'تعذّر حذف الدفعة');
    } catch { alert('خطأ في الاتصال'); }
  };

  // Summary stats
  const totalCollected = payments.reduce((acc, p) => acc + p.paidAmount, 0);
  const totalRemaining = payments.reduce((acc, p) => acc + p.remainingAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💵 المدفوعات والسداد</h1>
          <p className="text-slate-400 text-sm mt-1">تسجيل المدفوعات وتتبع المبالغ المحصّلة والمتبقية</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-green-600/20"
          >
            <Plus className="w-4 h-4" />
            تسجيل دفعة
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-center">
            <Banknote className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">إجمالي المحصّل</p>
            <p className="text-2xl font-black text-emerald-400">{totalCollected.toLocaleString()} ج.م</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-center">
            <CreditCard className="w-6 h-6 text-rose-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">إجمالي المتبقي</p>
            <p className="text-2xl font-black text-rose-400">{totalRemaining.toLocaleString()} ج.م</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-center">
            <User className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">عدد المعاملات</p>
            <p className="text-2xl font-black text-blue-400">{payments.length}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل سجل المدفوعات...
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((pay) => (
            <div key={pay.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center text-green-400 text-xs font-bold">
                    {pay.student?.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{pay.student?.name}</h3>
                    <p className="text-xs text-slate-400">كود: {pay.student?.code}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>{new Date(pay.createdAt).toLocaleDateString('ar-EG')}</span>
                  <span>{methodLabels[pay.paymentMethod] || pay.paymentMethod}</span>
                  {pay.recordedBy && <span>سجّله: {pay.recordedBy.name}</span>}
                </div>
              </div>
              <div className="flex gap-3 text-center text-sm items-center">
                <div>
                  <p className="text-xs text-slate-500">المدفوع</p>
                  <p className="font-black text-emerald-400">{pay.paidAmount} ج.م</p>
                </div>
                {pay.remainingAmount > 0 && (
                  <div>
                    <p className="text-xs text-slate-500">المتبقي</p>
                    <p className="font-black text-rose-400">{pay.remainingAmount} ج.م</p>
                  </div>
                )}
                {pay.remainingAmount === 0 && (
                  <span className="self-center text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold">
                    مسدّد ✓
                  </span>
                )}
                <button
                  onClick={() => handleDeletePayment(pay.id)}
                  className="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-xs transition"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {payments.length === 0 && (
            <div className="text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
              لا توجد مدفوعات مسجلة
            </div>
          )}
        </div>
      )}

      {/* Add Payment Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">💵 تسجيل دفعة جديدة</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-300 mb-1 text-xs">الطالب *</label>
                <select
                  required
                  value={newPayment.studentId}
                  onChange={(e) => setNewPayment({ ...newPayment, studentId: e.target.value, subscriptionId: '' })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                >
                  <option value="">اختر الطالب...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              {activeSubs.length > 0 && (
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">الاشتراك *</label>
                  <select
                    required
                    value={newPayment.subscriptionId}
                    onChange={(e) => {
                      const sub = activeSubs.find((s) => s.id === e.target.value);
                      setNewPayment({ ...newPayment, subscriptionId: e.target.value, totalAmount: sub?.price || 0, paidAmount: sub?.price || 0 });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  >
                    <option value="">اختر الاشتراك...</option>
                    {activeSubs.map((s) => (
                      <option key={s.id} value={s.id}>اشتراك نشط - {s.price} ج.م</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedStudent && activeSubs.length === 0 && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">لا يوجد اشتراك نشط لهذا الطالب. أضف اشتراكاً أولاً.</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">إجمالي المبلغ</label>
                  <input
                    type="number"
                    min={0}
                    value={newPayment.totalAmount}
                    onChange={(e) => setNewPayment({ ...newPayment, totalAmount: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">المبلغ المدفوع</label>
                  <input
                    type="number"
                    min={0}
                    max={newPayment.totalAmount}
                    value={newPayment.paidAmount}
                    onChange={(e) => setNewPayment({ ...newPayment, paidAmount: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={isSaving || !newPayment.subscriptionId} className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg text-sm disabled:opacity-50">
                  {isSaving ? 'جاري التسجيل...' : 'تسجيل الدفعة 💵'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
