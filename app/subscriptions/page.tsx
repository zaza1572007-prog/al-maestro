'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Plus, CreditCard, User, Gift, Search, Bell } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface Subscription {
  id: string;
  student: { id: string; name: string; code: string; parent?: { phone?: string; whatsapp?: string } };
  group: { id: string; name: string };
  startDate: string;
  endDate: string;
  totalSessions: number;
  usedSessions: number;
  price: number;
  status: string;
  month: number | null;
  year: number | null;
  payments: { paidAmount: number }[];
}

interface Student {
  id: string;
  name: string;
  code: string;
  group: { id: string; name: string };
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  EXPIRING_SOON: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  EXPIRED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  SUSPENDED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  CANCELLED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  PAID: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PARTIALLY_PAID: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  UNPAID: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  OVERDUE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'نشط',
  EXPIRING_SOON: 'ينتهي قريباً',
  EXPIRED: 'منتهي',
  SUSPENDED: 'موقوف',
  CANCELLED: 'ملغي',
  PAID: 'مدفوع بالكامل ✓',
  PARTIALLY_PAID: 'مدفوع جزئياً 🟡',
  UNPAID: 'غير مدفوع 💸',
  OVERDUE: 'متأخر ⚠️',
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

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering by Month and Year
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()));

  // Search Combobox states for Add Subscription
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // States for Add Subscription Form
  const [newSub, setNewSub] = useState({
    studentId: '',
    groupId: '',
    price: 350,
    totalSessions: 8,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // States for Payment Modal (Pop-up)
  const [payingSub, setPayingSub] = useState<Subscription | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('CASH');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // States for WhatsApp Reminders loaders
  const [remindingSubId, setRemindingSubId] = useState<string | null>(null);

  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterMonth && filterMonth !== 'ALL') queryParams.append('month', filterMonth);
      if (filterYear && filterYear !== 'ALL') queryParams.append('year', filterYear);

      const [subRes, studRes] = await Promise.all([
        fetch(`/api/subscriptions?${queryParams.toString()}`),
        fetch('/api/students'),
      ]);
      const subData = await subRes.json();
      const studData = await studRes.json();
      if (subData.success) setSubs(subData.subscriptions || []);
      if (studData.students) setStudents(studData.students || []);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء جلب البيانات من الخادم.');
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

  const selectedStudent = students.find((s) => s.id === newSub.studentId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.studentId) return alert('اختر طالباً أولاً');
    setIsSaving(true);
    try {
      const groupId = selectedStudent?.group?.id || newSub.groupId;
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSub, groupId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم إنشاء الاشتراك الشهري الجديد بنجاح! ➕');
        await fetchData();
        setIsAdding(false);
        setSearchStudentQuery('');
        setNewSub({
          studentId: '',
          groupId: '',
          price: 350,
          totalSessions: 8,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        });
      } else {
        toast.error(data.error || 'حدث خطأ أثناء إضافة الاشتراك.');
      }
    } catch (err) {
      toast.error('تعذّر الاتصال بالخادم.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSub = async (id: string, studentName: string) => {
    if (!confirm(`هل أنت متأكد من حذف اشتراك "${studentName}"؟`)) return;
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('تم حذف الاشتراك بنجاح.');
        fetchData();
      } else toast.error(data.error || 'تعذّر حذف الاشتراك.');
    } catch { toast.error('خطأ في الاتصال بالخادم.'); }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم تحديث حالة الاشتراك.');
        fetchData();
      } else {
        toast.error(data.error || 'فشل تحديث الحالة.');
      }
    } catch {
      toast.error('خطأ في الاتصال.');
    }
  };

  const handleExemptStudent = async (id: string, studentName?: string) => {
    if (!confirm(`هل أنت متأكد من تجديد اشتراك الطالب "${studentName || ''}" كإعفاء كامل (مجاناً بدون تسجيل مدفوعات)؟`)) return;
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renewExempt: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`تم تجديد اشتراك ${studentName || 'الطالب'} كإعفاء بنجاح 🎁`);
        fetchData();
      } else {
        toast.error(data.error || 'تعذّر تجديد الاشتراك كإعفاء');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    }
  };

  // WhatsApp Overdue Reminder
  const handleSendReminder = async (id: string, studentName: string) => {
    setRemindingSubId(id);
    try {
      const res = await fetch(`/api/subscriptions/${id}/remind`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`تم إرسال تذكير السداد بنجاح لولي أمر الطالب ${studentName} ✅`);
      } else {
        toast.error(data.error || 'تعذّر إرسال رسالة التذكير بالواتساب.');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setRemindingSubId(null);
    }
  };

  // Monthly subscription payment handler
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSub) return;
    setIsSubmittingPay(true);
    try {
      const res = await fetch(`/api/subscriptions/${payingSub.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidAmount: payAmount,
          paymentMethod: payMethod,
          paidAt: payDate,
          notes: payNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.waError) {
          toast.info(`تم تسجيل الدفعة بنجاح، ولكن: ${data.waError} ⚠️`);
        } else {
          toast.success('تم تسجيل الدفعة وإرسال إيصال الواتساب بنجاح! ✅');
        }
        setPayingSub(null);
        fetchData();
      } else {
        toast.error(data.error || 'تعذّر تسجيل الدفعة.');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const filtered = subs.filter((s) => {
    const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return matchesStatus;

    const matchesSearch =
      (s.student?.name || '').toLowerCase().includes(q) ||
      (s.student?.code || '').toLowerCase().includes(q) ||
      (s.group?.name || '').toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const totalPaid = (sub: Subscription) => sub.payments?.reduce((acc, p) => acc + p.paidAmount, 0) || 0;

  // Filter students list in combobox by name or code
  const filteredStudents = students.filter((s) => {
    const q = searchStudentQuery.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💳 الاشتراكات الشهرية</h1>
          <p className="text-slate-400 text-sm mt-1">متابعة اشتراكات الطلاب وتتبع الجلسات والمدفوعات الشهرية</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            اشتراك جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && subs.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {(['ALL', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'OVERDUE'] as const).map((st) => {
            const count = st === 'ALL' ? subs.length : subs.filter((s) => s.status === st).length;
            const labelsMap: Record<string, string> = { ...statusLabels, ALL: 'الكل' };
            const colorsMap: Record<string, string> = {
              ...statusColors,
              ALL: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            };
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${filterStatus === st ? colorsMap[st] : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'}`}
              >
                <p className="text-xl md:text-2xl font-black">{count}</p>
                <p className="text-[10px] md:text-xs mt-1">{labelsMap[st]}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Month/Year Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="البحث باسم الطالب، الكود، أو اسم المجموعة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-9 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
              title="مسح البحث"
            >
              ✕
            </button>
          )}
        </div>
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
            <span>النتائج:</span>
            <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono text-emerald-400 font-bold">
              {filtered.length} اشتراك
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل الاشتراكات...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((sub) => {
            const pct = sub.totalSessions > 0 ? Math.round((sub.usedSessions / sub.totalSessions) * 100) : 0;
            const paid = totalPaid(sub);
            const remaining = sub.price - paid;
            return (
              <div key={sub.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center">
                        <User className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm md:text-base">{sub.student?.name}</h3>
                        <p className="text-xs text-slate-400">{sub.group?.name} · كود الطالب: {sub.student?.code}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold text-center ${statusColors[sub.status] || ''}`}>
                        {statusLabels[sub.status] || sub.status}
                      </span>
                      {sub.month && sub.year && (
                        <span className="text-[10px] text-slate-500 font-semibold bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                          شهر {sub.month}/{sub.year}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>الجلسات المستخدمة: {sub.usedSessions}/{sub.totalSessions}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${pct >= 80 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-slate-950/60 p-1.5 rounded-xl border border-slate-850">
                      <p className="text-[10px] text-slate-500">الرسوم</p>
                      <p className="font-bold text-xs text-white">{sub.price} ج.م</p>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-xl border border-slate-850">
                      <p className="text-[10px] text-slate-500">المدفوع</p>
                      <p className="font-bold text-xs text-emerald-400">{paid} ج.م</p>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-xl border border-slate-850">
                      <p className="text-[10px] text-slate-500">المتبقي</p>
                      <p className={`font-bold text-xs ${remaining > 0 ? 'text-rose-450 text-rose-400' : 'text-emerald-400'}`}>{remaining} ج.م</p>
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>من: {new Date(sub.startDate).toLocaleDateString('ar-EG')}</span>
                    <span>إلى: {new Date(sub.endDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-3 border-t border-slate-800/80 flex-wrap">
                  {sub.status !== 'PAID' && (
                    <button
                      onClick={() => handleSendReminder(sub.id, sub.student?.name)}
                      disabled={remindingSubId === sub.id}
                      className="px-2.5 py-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      title="إرسال رسالة تذكير بالواتساب لولي الأمر"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {remindingSubId === sub.id ? 'جاري الإرسال...' : 'إنذار ⚠️'}
                    </button>
                  )}
                  {sub.status !== 'PAID' && (
                    <button
                      onClick={() => {
                        setPayingSub(sub);
                        const rem = sub.price - paid;
                        setPayAmount(rem > 0 ? rem : sub.price);
                        setPayMethod('CASH');
                        setPayDate(new Date().toISOString().split('T')[0]);
                        setPayNotes('');
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      دفع الشهر 💰
                    </button>
                  )}
                  {sub.status !== 'SUSPENDED' && (
                    <button
                      onClick={() => handleUpdateStatus(sub.id, 'SUSPENDED')}
                      className="px-2.5 py-1.5 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      إيقاف مؤقت
                    </button>
                  )}
                  {sub.status === 'SUSPENDED' && (
                    <button
                      onClick={() => handleUpdateStatus(sub.id, 'ACTIVE')}
                      className="px-2.5 py-1.5 bg-emerald-650/20 bg-emerald-600/25 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      تفعيل
                    </button>
                  )}
                  <button
                    onClick={() => handleExemptStudent(sub.id, sub.student?.name)}
                    className="px-2.5 py-1.5 bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer border border-purple-500/30"
                    title="تجديد الاشتراك كإعفاء بدون تسجيل مدفوعات"
                  >
                    🎁 إعفاء
                  </button>
                  <button
                    onClick={() => handleDeleteSub(sub.id, sub.student?.name)}
                    className="px-2.5 py-1.5 bg-rose-600/20 text-rose-450 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition mr-auto cursor-pointer"
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-semibold text-slate-300">
                {searchQuery.trim()
                  ? `لا توجد اشتراكات مطابقة لبحثك عن "${searchQuery}"`
                  : 'لا توجد اشتراكات مسجلة في هذا الشهر/القسم'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Subscription Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">💳 اشتراك شهري جديد</h3>
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
                    placeholder="ابحث باسم الطالب أو كوده للاختيار..."
                    value={searchStudentQuery}
                    onChange={(e) => {
                      setSearchStudentQuery(e.target.value);
                      setIsComboboxOpen(true);
                    }}
                    onFocus={() => setIsComboboxOpen(true)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                  {newSub.studentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchStudentQuery('');
                        setNewSub({ ...newSub, studentId: '' });
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
                          setNewSub({ ...newSub, studentId: s.id });
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

              {selectedStudent && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
                  المجموعة الحالية للطالب: <strong>{selectedStudent.group?.name || 'غير محدد'}</strong>
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">الشهر المستهدف</label>
                  <select
                    value={newSub.month}
                    onChange={(e) => setNewSub({ ...newSub, month: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm cursor-pointer"
                  >
                    {monthsList.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">السنة المستهدفة</label>
                  <select
                    value={newSub.year}
                    onChange={(e) => setNewSub({ ...newSub, year: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm cursor-pointer"
                  >
                    {yearsList.map((y) => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">رسوم الاشتراك (ج.م)</label>
                  <input
                    type="number"
                    min={1}
                    value={newSub.price}
                    onChange={(e) => setNewSub({ ...newSub, price: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">عدد الجلسات</label>
                  <input
                    type="number"
                    min={1}
                    value={newSub.totalSessions}
                    onChange={(e) => setNewSub({ ...newSub, totalSessions: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">تاريخ البداية</label>
                  <input
                    type="date"
                    value={newSub.startDate}
                    onChange={(e) => setNewSub({ ...newSub, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={newSub.endDate}
                    onChange={(e) => setNewSub({ ...newSub, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setIsAdding(false); setSearchStudentQuery(''); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm cursor-pointer">
                  إلغاء
                </button>
                <button type="submit" disabled={isSaving || !newSub.studentId} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg text-sm disabled:opacity-50 cursor-pointer">
                  {isSaving ? 'جاري الحفظ...' : 'إنشاء الاشتراك ➕'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Subscription Modal (Pop-up for Full/Partial Payment) */}
      {payingSub && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">💰 تسجيل سداد الاشتراك الشهري</h3>
              <button onClick={() => setPayingSub(null)} className="text-slate-400 hover:text-white text-xl cursor-pointer">✕</button>
            </div>
            <div className="text-xs bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-slate-300">
              <p><strong>الطالب:</strong> {payingSub.student?.name}</p>
              <p><strong>كود الطالب:</strong> {payingSub.student?.code}</p>
              <p><strong>اشتراك شهر:</strong> {payingSub.month}/{payingSub.year}</p>
              <div className="h-px bg-slate-800 my-1" />
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <p>قيمة الاشتراك الكاملة: <span className="text-white font-bold">{payingSub.price} ج.م</span></p>
                <p>المدفوع سابقاً: <span className="text-emerald-400 font-bold">{totalPaid(payingSub)} ج.م</span></p>
              </div>
              <p className="text-sm font-bold text-white">المتبقي للسداد: <span className="text-rose-450 text-rose-450 text-rose-400 font-black">{payingSub.price - totalPaid(payingSub)} ج.م</span></p>
            </div>
            <form onSubmit={handlePaySubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-300 mb-1 text-xs">المبلغ المدفوع الآن (ج.م) *</label>
                <input
                  type="number"
                  min={1}
                  max={payingSub.price - totalPaid(payingSub)}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  placeholder="أدخل المبلغ المستلم..."
                />
                {payAmount < (payingSub.price - totalPaid(payingSub)) && (
                  <p className="text-xs text-amber-400 mt-1">⚠️ المبلغ أقل من المتبقي، سيتم تسجيل الاشتراك كـ **مدفوع جزئياً**.</p>
                )}
                {payAmount === (payingSub.price - totalPaid(payingSub)) && (
                  <p className="text-xs text-emerald-400 mt-1">✓ سيتم تسجيل الاشتراك كـ **مدفوع بالكامل**.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">طريقة الدفع *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
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
                  placeholder="ملاحظات اختيارية (مثال: دفع قسط أول...)"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPayingSub(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm cursor-pointer">
                  إلغاء
                </button>
                <button type="submit" disabled={isSubmittingPay || payAmount <= 0} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg text-sm disabled:opacity-50 cursor-pointer">
                  {isSubmittingPay ? 'جاري الحفظ والرسالة...' : 'تسجيل السداد 💵'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
