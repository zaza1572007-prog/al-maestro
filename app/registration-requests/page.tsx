'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import {
  Users,
  CheckCircle2,
  XCircle,
  Phone,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  Search,
  Filter,
  UserCheck,
  GraduationCap
} from 'lucide-react';

export default function RegistrationRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/registration');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/registration/${requestId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'حدث خطأ أثناء تنفيذ الإجراء');
      }
      fetchRequests();
    } catch (err) {
      console.error(err);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : r));
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.studentName?.includes(searchQuery) ||
      r.studentPhone?.includes(searchQuery) ||
      r.parentPhone?.includes(searchQuery);
    const matchesFilter = filterStatus === 'ALL' || r.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      <HeroHeader
        title="إدارة طلبات التسجيل والحجز"
        badge="لوحة التحكم والإدارة - المايسترو Premium"
        subtitle="مراجعة الطلبات المقدمة من الطلاب الجدد، فحص ربط أرقام أولياء الأمور والقبول التلقائي."
        stats={[
          { label: "طلبات قيد الانتظار", value: requests.filter(r => r.status === 'PENDING').length, color: "text-amber-400" },
          { label: "إجمالي الطلبات", value: requests.length, color: "text-purple-300" },
        ]}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-white/10">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الطالب/ولي الأمر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input py-2.5 px-4 pr-10 text-xs text-white"
          />
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => {
            const labels: any = { ALL: 'الكل', PENDING: 'قيد الانتظار ⏳', APPROVED: 'تم القبول ✅', REJECTED: 'مرفوض ❌' };
            const isSel = filterStatus === st;
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isSel
                    ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {labels[st]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Requests List Cards */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-white/10">
            <GraduationCap className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm">لا توجد طلبات تسجيل مطابقة في الوقت الحالي.</p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-3xl border border-white/10 space-y-4 relative overflow-hidden text-right"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-black text-white">{req.studentName}</h3>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold border ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {req.status === 'APPROVED' ? 'تم القبول' : req.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <span>📱 هاتف الطالب: <strong>{req.studentPhone}</strong></span>
                    <span>•</span>
                    <span>🎓 المرحلة: {req.academicStage?.name}</span>
                    <span>•</span>
                    <span>👥 المجموعة: {req.group?.name}</span>
                  </p>
                </div>

                {/* WhatsApp & Call Action Buttons */}
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/2${req.parentWhatsapp || req.parentPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="واتساب ولي الأمر"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>واتساب</span>
                  </a>
                  <a
                    href={`tel:${req.parentPhone}`}
                    className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="اتصال تلفوني"
                  >
                    <Phone className="w-4 h-4" />
                    <span>اتصال</span>
                  </a>
                </div>
              </div>

              {/* Parent Info & Existing Warning Badge */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="text-slate-300">
                    👨‍👩‍👦 <strong>ولي الأمر:</strong> {req.parentName} ({req.parentRelation || 'والد'}) | 📞 <strong>{req.parentPhone}</strong>
                  </p>
                </div>

                {req.isParentExisting && (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    ⚠️ رقم ولي الأمر مسجل مسبقاً (سيتم ربطه بالحساب الحقيقي)
                  </span>
                )}
              </div>

              {/* Action Buttons for Pending Requests */}
              {req.status === 'PENDING' && (
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                  <button
                    disabled={actionLoadingId === req.id}
                    onClick={() => handleAction(req.id, 'REJECT')}
                    className="px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold text-xs hover:bg-rose-500/20 transition-colors cursor-pointer"
                  >
                    ❌ رفض الطلب
                  </button>
                  <button
                    disabled={actionLoadingId === req.id}
                    onClick={() => handleAction(req.id, 'APPROVE')}
                    className="glass-button-primary px-7 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    {actionLoadingId === req.id ? 'جارٍ القبول التلقائي...' : '✅ قبول الطلب وإنشاء الحساب تلقائياً'}
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
