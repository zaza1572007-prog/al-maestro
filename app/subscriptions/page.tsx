'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, CreditCard, User, BookOpen, Gift } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface Subscription {
  id: string;
  student: { id: string; name: string; code: string };
  group: { id: string; name: string };
  startDate: string;
  endDate: string;
  totalSessions: number;
  usedSessions: number;
  price: number;
  status: string;
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
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'نشط',
  EXPIRING_SOON: 'ينتهي قريباً',
  EXPIRED: 'منتهي',
  SUSPENDED: 'موقوف',
  CANCELLED: 'ملغي',
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [newSub, setNewSub] = useState({
    studentId: '',
    groupId: '',
    price: 300,
    totalSessions: 8,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, studRes] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/students'),
      ]);
      const subData = await subRes.json();
      const studData = await studRes.json();
      if (subData.success) setSubs(subData.subscriptions || []);
      if (studData.students) setStudents(studData.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
        await fetchData();
        setIsAdding(false);
        setNewSub({ studentId: '', groupId: '', price: 300, totalSessions: 8, startDate: new Date().toISOString().split('T')[0], endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] });
      } else {
        alert(data.error || 'حدث خطأ');
      }
    } catch (err) {
      alert('تعذّر الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSub = async (id: string, studentName: string) => {
    if (!confirm(`هل أنت متأكد من حذف اشتراك "${studentName}"؟`)) return;
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.error || 'تعذّر حذف الاشتراك');
    } catch { alert('خطأ في الاتصال'); }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch {}
  };

  const toast = useToast();

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

  const filtered = filterStatus === 'ALL' ? subs : subs.filter((s) => s.status === filterStatus);

  const totalPaid = (sub: Subscription) => sub.payments?.reduce((acc, p) => acc + p.paidAmount, 0) || 0;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💳 الاشتراكات الشهرية</h1>
          <p className="text-slate-400 text-sm mt-1">متابعة اشتراكات الطلاب وتتبع الجلسات المستخدمة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            اشتراك جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && subs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED'] as const).map((st) => {
            const count = subs.filter((s) => s.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(filterStatus === st ? 'ALL' : st)}
                className={`p-4 rounded-2xl border text-center transition ${filterStatus === st ? statusColors[st] : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'}`}
              >
                <p className="text-2xl font-black">{count}</p>
                <p className="text-xs mt-1">{statusLabels[st]}</p>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل الاشتراكات...
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const pct = sub.totalSessions > 0 ? Math.round((sub.usedSessions / sub.totalSessions) * 100) : 0;
            const paid = totalPaid(sub);
            const remaining = sub.price - paid;
            return (
              <div key={sub.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{sub.student?.name}</h3>
                      <p className="text-xs text-slate-400">{sub.group?.name} · كود: {sub.student?.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {sub.price === 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/20 text-purple-300 font-bold">
                        معفي 🎁
                      </span>
                    )}
                    <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${statusColors[sub.status] || ''}`}>
                      {statusLabels[sub.status] || sub.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>الجلسات المستخدمة: {sub.usedSessions}/{sub.totalSessions}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="bg-slate-950/60 p-2 rounded-xl">
                    <p className="text-slate-500">الرسوم</p>
                    <p className="font-bold text-white">{sub.price} ج.م</p>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl">
                    <p className="text-slate-500">المدفوع</p>
                    <p className="font-bold text-emerald-400">{paid} ج.م</p>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl">
                    <p className="text-slate-500">المتبقي</p>
                    <p className={`font-bold ${remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{remaining} ج.م</p>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-slate-500">
                  <span>من: {new Date(sub.startDate).toLocaleDateString('ar-EG')}</span>
                  <span>إلى: {new Date(sub.endDate).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800 flex-wrap">
                  {sub.status !== 'SUSPENDED' && (
                    <button
                      onClick={() => handleUpdateStatus(sub.id, 'SUSPENDED')}
                      className="px-3 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      إيقاف مؤقت
                    </button>
                  )}
                  {sub.status === 'SUSPENDED' && (
                    <button
                      onClick={() => handleUpdateStatus(sub.id, 'ACTIVE')}
                      className="px-3 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      تفعيل
                    </button>
                  )}
                  <button
                    onClick={() => handleExemptStudent(sub.id, sub.student?.name)}
                    className="px-3 py-1 bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer border border-purple-500/30"
                    title="تجديد الاشتراك كإعفاء بدون تسجيل مدفوعات"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    إعفاء الطالب
                  </button>
                  <button
                    onClick={() => {/* TODO: Implement edit logic */}}
                    className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteSub(sub.id, sub.student?.name)}
                    className="px-3 py-1 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition mr-auto cursor-pointer"
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              لا توجد اشتراكات
            </div>
          )}
        </div>
      )}

      {/* Add Subscription Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">💳 اشتراك جديد</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-300 mb-1 text-xs">الطالب *</label>
                <select
                  required
                  value={newSub.studentId}
                  onChange={(e) => setNewSub({ ...newSub, studentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                >
                  <option value="">اختر الطالب...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
                {selectedStudent && (
                  <p className="text-xs text-slate-400 mt-1">المجموعة: {selectedStudent.group?.name}</p>
                )}
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
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg text-sm">
                  {isSaving ? 'جاري الحفظ...' : 'إنشاء الاشتراك ➕'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
