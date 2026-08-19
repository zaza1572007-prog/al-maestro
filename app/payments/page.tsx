'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Plus, User, CreditCard, Banknote, Search } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { addOfflinePayment } from '@/lib/offlineSync';

interface Payment {
  id: string;
  student: { id: string; name: string; code: string };
  subscription: { id: string; totalSessions: number; price: number; month: number | null; year: number | null };
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  recordedBy: { name: string };
  notes?: string;
  paidAt: string;
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
  code: string;
  group: { id: string; name: string };
  subscriptions?: { id: string; price: number; status: string; month: number | null; year: number | null }[];
}

const methodLabels: Record<string, string> = {
  CASH: 'نقدي',
  BANK_TRANSFER: 'تحويل بنكي',
  CREDIT_CARD: 'بطاقة ائتمان',
  OTHER: 'أخرى',
};

const monthsList = [
  { value: '1', label: 'يناير (1)' },
  { value: '2', label: 'فبراير (2)' },
  { value: '3', label: 'مارس (3)' },
  { value: '4', label: 'أبريل (4)' },
  { value: '5', label: 'مايو (5)' },
  { value: '6', label: 'يونيو (6)' },
  { value: '7', label: 'يوليو (7)' },
  { value: '8', label: 'أغسطس (8)' },
  { value: '9', label: 'سبتمبر (9)' },
  { value: '10', label: 'أكتوبر (10)' },
  { value: '11', label: 'نوفمبر (11)' },
  { value: '12', label: 'ديسمبر (12)' },
];

const yearsList = [
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
  { value: '2030', label: '2030' },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Month and Year filters
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()));

  // Search Combobox states
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const [newPayment, setNewPayment] = useState({
    studentId: '',
    subscriptionId: '',
    totalAmount: 0,
    paidAmount: 0,
    paymentMethod: 'CASH',
  });
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState<string>('');

  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterMonth && filterMonth !== 'ALL') queryParams.append('month', filterMonth);
      if (filterYear && filterYear !== 'ALL') queryParams.append('year', filterYear);

      const [payRes, studRes] = await Promise.all([
        fetch(`/api/payments?${queryParams.toString()}`),
        fetch('/api/students'),
      ]);
      const payData = await payRes.json();
      const studData = await studRes.json();
      if (payData.success) setPayments(payData.payments || []);
      if (studData.students) setStudents(studData.students || []);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحميل سجل المدفوعات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterMonth, filterYear]);

  // Handle outside click for Combobox
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedStudent = students.find((s) => s.id === newPayment.studentId);
  const activeSubs = selectedStudent?.subscriptions?.filter((s) => 
    ['ACTIVE', 'UNPAID', 'PARTIALLY_PAID', 'OVERDUE', 'EXPIRING_SOON'].includes(s.status)
  ) || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.studentId) return toast.error('اختر طالباً أولاً');
    if (!newPayment.subscriptionId) return toast.error('اختر اشتراكاً أولاً');
    setIsSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPayment,
          paidAt: payDate,
          notes: payNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم تسجيل الدفعة بنجاح! 💵');
        await fetchData();
        setIsAdding(false);
        setNewPayment({ studentId: '', subscriptionId: '', totalAmount: 0, paidAmount: 0, paymentMethod: 'CASH' });
        setSearchStudentQuery('');
        setPayNotes('');
        setPayDate(new Date().toISOString().split('T')[0]);
      } else {
        toast.error(data.error || 'حدث خطأ أثناء حفظ الدفعة.');
      }
    } catch (err) {
      try {
        const paymentPayload = {
          ...newPayment,
          studentName: selectedStudent?.name || 'طالب',
          paidAt: payDate,
          notes: payNotes,
        };

        const { payment: addedOffline } = await addOfflinePayment(paymentPayload);
        setPayments((prev) => [addedOffline, ...prev]);
        setIsAdding(false);
        setNewPayment({ studentId: '', subscriptionId: '', totalAmount: 0, paidAmount: 0, paymentMethod: 'CASH' });
        setSearchStudentQuery('');
        setPayNotes('');
        setPayDate(new Date().toISOString().split('T')[0]);
        toast.success(`[أوفلاين] تم تسجيل دفعة الطالب (${selectedStudent?.name}) محلياً! 📲 وستنرفع فور توفر النت.`);
      } catch (offlineErr) {
        toast.error('حدث خطأ أثناء حفظ الدفعة محلياً');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return;
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('تم حذف الدفعة بنجاح.');
        fetchData();
      } else toast.error(data.error || 'تعذّر حذف الدفعة.');
    } catch { toast.error('خطأ في الاتصال بالخادم.'); }
  };

  // Filter students in combobox
  const filteredStudents = students.filter((s) => {
    const q = searchStudentQuery.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });

  // Summary stats
  const totalCollected = payments.reduce((acc, p) => acc + p.paidAmount, 0);
  const totalRemaining = payments.reduce((acc, p) => acc + p.remainingAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💵 المدفوعات والسداد</h1>
          <p className="text-slate-400 text-sm mt-1">تسجيل المدفوعات وتتبع المبالغ المحصّلة والمتبقية شهرياً</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-green-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            تسجيل دفعة
          </button>
        </div>
      </div>

      {/* Month/Year Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-300">تصفية حسب شهر الاشتراك:</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="ALL">كل الأشهر</option>
              {monthsList.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="ALL">كل السنوات</option>
              {yearsList.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mr-2">
            <span>عدد الحركات المعروضة:</span>
            <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono text-emerald-400 font-bold">
              {payments.length} معاملة
            </span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-center">
            <Banknote className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">إجمالي المحصّل (بالفلترة)</p>
            <p className="text-2xl font-black text-emerald-400">{totalCollected.toLocaleString()} ج.م</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-center">
            <CreditCard className="w-6 h-6 text-rose-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">إجمالي المتبقي (بالفلترة)</p>
            <p className="text-2xl font-black text-rose-400">{totalRemaining.toLocaleString()} ج.م</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-center">
            <User className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">عدد الحركات بالفلترة</p>
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
                    <p className="text-xs text-slate-400">كود الطالب: {pay.student?.code}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400 items-center">
                  <span className="bg-slate-950 px-2 py-0.5 border border-slate-850 rounded text-slate-300 font-bold">
                    تاريخ الدفع: {new Date(pay.paidAt || pay.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                  {pay.subscription && pay.subscription.month && (
                    <span className="bg-slate-950 px-2 py-0.5 border border-slate-850 rounded text-emerald-400 font-semibold">
                      لشهر: {pay.subscription.month}/{pay.subscription.year}
                    </span>
                  )}
                  <span>طريقة السداد: {methodLabels[pay.paymentMethod] || pay.paymentMethod}</span>
                  {pay.recordedBy && <span>المسجل: {pay.recordedBy.name}</span>}
                </div>
                {pay.notes && (
                  <p className="text-xs text-amber-300/80 bg-slate-950/60 p-2 rounded-lg border border-slate-850 inline-block mt-1">
                    ✏️ ملاحظة: {pay.notes}
                  </p>
                )}
              </div>
              <div className="flex gap-3 text-center text-sm items-center">
                <div>
                  <p className="text-xs text-slate-500">المدفوع</p>
                  <p className="font-black text-emerald-400">{pay.paidAmount} ج.م</p>
                </div>
                {pay.remainingAmount > 0 && (
                  <div>
                    <p className="text-xs text-slate-500">المتبقي</p>
                    <p className="font-black text-rose-450 text-rose-450 text-rose-450 text-rose-400">{pay.remainingAmount} ج.م</p>
                  </div>
                )}
                {pay.remainingAmount === 0 && (
                  <span className="self-center text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold">
                    مسدّد بالكامل ✓
                  </span>
                )}
                <button
                  onClick={() => handleDeletePayment(pay.id)}
                  className="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-xs transition cursor-pointer"
                  title="حذف حركة الدفع"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {payments.length === 0 && (
            <div className="text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
              لا توجد مدفوعات مسجلة في الفلترة المحددة
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
              <button onClick={() => { setIsAdding(false); setSearchStudentQuery(''); }} className="text-slate-400 hover:text-white text-xl cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              {/* Searchable Student Combobox */}
              <div className="relative" ref={comboboxRef}>
                <label className="block text-slate-300 mb-1 text-xs">الطالب *</label>
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="ابحث باسم الطالب أو كوده..."
                    value={searchStudentQuery}
                    onChange={(e) => {
                      setSearchStudentQuery(e.target.value);
                      setIsComboboxOpen(true);
                    }}
                    onFocus={() => setIsComboboxOpen(true)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                  {newPayment.studentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchStudentQuery('');
                        setNewPayment({ ...newPayment, studentId: '', subscriptionId: '', totalAmount: 0, paidAmount: 0 });
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {isComboboxOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl max-h-56 overflow-y-auto shadow-2xl">
                    {filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setNewPayment({ ...newPayment, studentId: s.id, subscriptionId: '', totalAmount: 0, paidAmount: 0 });
                          setSearchStudentQuery(`${s.name} (كود: ${s.code})`);
                          setIsComboboxOpen(false);
                        }}
                        className="w-full text-right px-4 py-2.5 hover:bg-slate-800/80 text-sm text-slate-200 transition border-b border-slate-900 last:border-0 cursor-pointer block"
                      >
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">كود: {s.code} · المجموعة: {s.group?.name || 'غير محدد'}</div>
                      </button>
                    ))}
                    {filteredStudents.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-500">لا يوجد طلاب يطابقون بحثك</div>
                    )}
                  </div>
                )}
              </div>

              {newPayment.studentId && activeSubs.length > 0 && (
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">اشتراكات الطالب المستحقة سدادها *</label>
                  <select
                    required
                    value={newPayment.subscriptionId}
                    onChange={(e) => {
                      const sub = activeSubs.find((s) => s.id === e.target.value);
                      if (sub) {
                        // Calculate total and remaining for this sub
                        setNewPayment({
                          ...newPayment,
                          subscriptionId: e.target.value,
                          totalAmount: sub.price,
                          paidAmount: sub.price,
                        });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm cursor-pointer focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="">اختر الاشتراك...</option>
                    {activeSubs.map((s) => (
                      <option key={s.id} value={s.id}>
                        شهر {s.month}/{s.year} - رسوم الاشتراك: {s.price} ج.م ({s.status === 'PARTIALLY_PAID' ? 'دفع جزئي' : 'غير مدفوع'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selectedStudent && activeSubs.length === 0 && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  ⚠️ لا يوجد أي اشتراكات مستحقة أو غير مدفوعة حالياً لهذا الطالب. أضف اشتراكاً جديداً للطالب من صفحة الاشتراكات أولاً.
                </p>
              )}

              {newPayment.subscriptionId && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 mb-1 text-xs">إجمالي المبلغ (ج.م)</label>
                      <input
                        type="number"
                        min={0}
                        readOnly
                        value={newPayment.totalAmount}
                        className="w-full bg-slate-950/60 border border-slate-800 text-slate-400 rounded-xl p-2.5 text-sm outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 text-xs">المبلغ المدفوع الآن (ج.م)</label>
                      <input
                        type="number"
                        min={1}
                        max={newPayment.totalAmount}
                        value={newPayment.paidAmount}
                        onChange={(e) => setNewPayment({ ...newPayment, paidAmount: parseFloat(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 mb-1 text-xs">طريقة السداد *</label>
                      <select
                        value={newPayment.paymentMethod}
                        onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm cursor-pointer focus:outline-none focus:border-emerald-500 transition"
                      >
                        <option value="CASH">نقدي</option>
                        <option value="BANK_TRANSFER">تحويل بنكي</option>
                        <option value="CREDIT_CARD">بطاقة ائتمان</option>
                        <option value="OTHER">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 text-xs">تاريخ الدفع الفعلي *</label>
                      <input
                        type="date"
                        required
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 text-xs">ملاحظات</label>
                    <textarea
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm h-16 resize-none focus:outline-none focus:border-emerald-500 transition"
                      placeholder="مثال: سداد قسط، دفعة عن طريق ولي الأمر..."
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setIsAdding(false); setSearchStudentQuery(''); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm cursor-pointer">
                  إلغاء
                </button>
                <button type="submit" disabled={isSaving || !newPayment.subscriptionId || newPayment.paidAmount <= 0} className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg text-sm disabled:opacity-50 cursor-pointer">
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
