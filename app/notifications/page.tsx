'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, RefreshCw, AlertTriangle, Info, AlertOctagon,
  X, Send, Users, GraduationCap, Globe, User, Trash2, Loader2,
  CheckCircle2, ChevronDown
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface Notif {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  recipient?: { id: string; name: string; code: string } | null;
}

interface Stage { id: string; name: string; }
interface Group { id: string; name: string; academicStageId: string; academicStage?: { name: string }; }
interface Student { id: string; name: string; code: string; }

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  INFO:     { icon: Info,         color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-r-blue-500',   label: 'معلومة' },
  WARNING:  { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10',  border: 'border-r-amber-500',  label: 'تحذير' },
  ALERT:    { icon: AlertOctagon,  color: 'text-rose-400',  bg: 'bg-rose-500/10',   border: 'border-r-rose-500',   label: 'تنبيه' },
  CRITICAL: { icon: AlertOctagon,  color: 'text-red-400',   bg: 'bg-red-600/10',    border: 'border-r-red-500',    label: 'عاجل' },
};

const TARGET_OPTIONS = [
  { value: 'ALL',     icon: Globe,          label: 'كل الطلاب',        desc: 'إرسال لجميع الطلاب المسجلين', color: 'text-emerald-400' },
  { value: 'STAGE',   icon: GraduationCap,  label: 'مرحلة دراسية',    desc: 'إرسال لطلاب مرحلة بعينها',   color: 'text-blue-400' },
  { value: 'GROUP',   icon: Users,          label: 'مجموعة',           desc: 'إرسال لطلاب مجموعة محددة',   color: 'text-purple-400' },
  { value: 'STUDENT', icon: User,           label: 'طالب محدد',        desc: 'إرسال لطالب واحد فقط',       color: 'text-cyan-400' },
];

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  if (h < 24) return `منذ ${h} ساعة`;
  if (d === 1) return 'أمس';
  return `منذ ${d} أيام`;
}

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Compose form state
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'INFO',
    target: 'ALL',
    academicStageId: '',
    groupId: '',
    recipientId: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = filterType ? `?type=${filterType}` : '';
      const [nRes, sRes, gRes, stRes] = await Promise.all([
        fetch(`/api/notifications${params}`),
        fetch('/api/stages'),
        fetch('/api/groups'),
        fetch('/api/students'),
      ]);
      const [nd, sd, gd, std] = await Promise.all([nRes.json(), sRes.json(), gRes.json(), stRes.json()]);
      if (nd.success) { setNotifications(nd.notifications); setUnreadCount(nd.unreadCount || 0); }
      if (sd.success) setStages(sd.stages);
      if (gd.success) setGroups(gd.groups);
      if (std.success) setStudents(std.students);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterType]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) { toast.error('العنوان والرسالة مطلوبان'); return; }
    if (form.target === 'STAGE' && !form.academicStageId) { toast.error('اختر المرحلة الدراسية'); return; }
    if (form.target === 'GROUP' && !form.groupId) { toast.error('اختر المجموعة'); return; }
    if (form.target === 'STUDENT' && !form.recipientId) { toast.error('اختر الطالب'); return; }

    setSending(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          message: form.message,
          type: form.type,
          target: form.target,
          academicStageId: form.academicStageId || undefined,
          groupId: form.groupId || undefined,
          recipientId: form.recipientId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || '✅ تم الإرسال بنجاح!');
        setShowCompose(false);
        setForm({ title: '', message: '', type: 'INFO', target: 'ALL', academicStageId: '', groupId: '', recipientId: '' });
        fetchData();
      } else {
        toast.error(data.error || 'فشل الإرسال');
      }
    } catch { toast.error('خطأ في الاتصال'); }
    finally { setSending(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الإشعار؟')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('تم الحذف');
      } else {
        toast.error(data.error || 'فشل الحذف');
      }
    } catch { toast.error('خطأ'); }
    finally { setDeletingId(null); }
  };

  const filteredGroups = groups.filter(g => !form.academicStageId || g.academicStageId === form.academicStageId);
  const currentTarget = TARGET_OPTIONS.find(t => t.value === form.target)!;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-400" />
            مركز الإشعارات والبث الجماعي
          </h1>
          <p className="text-slate-400 text-sm mt-1">إرسال إشعارات فردية أو جماعية للطلاب</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="تحديث">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-blue-500/20"
          >
            <Send className="w-4 h-4" />
            إرسال إشعار جديد
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الإشعارات', value: notifications.length, color: 'text-blue-400' },
          { label: 'غير مقروءة', value: unreadCount, color: 'text-purple-400' },
          { label: 'للجميع', value: notifications.filter(n => !n.recipient).length, color: 'text-emerald-400' },
          { label: 'فردية', value: notifications.filter(n => n.recipient).length, color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <span className="text-xs text-slate-400 font-semibold">تصفية:</span>
        {['', 'INFO', 'WARNING', 'ALERT', 'CRITICAL'].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition border ${
              filterType === t
                ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}>
            {t === '' ? 'الكل' : TYPE_CONFIG[t]?.label || t}
          </button>
        ))}
        <span className="mr-auto text-xs text-slate-500">{notifications.length} إشعار</span>
      </div>

      {/* ── Notifications List ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">جاري تحميل الإشعارات...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">لا توجد إشعارات</p>
            <p className="text-xs mt-1">اضغط على "إرسال إشعار جديد" للبدء</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.INFO;
              const Icon = cfg.icon;
              return (
                <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`bg-slate-900/80 border border-slate-800 border-r-4 ${cfg.border} rounded-2xl p-4 flex items-start gap-4 group`}>
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white text-sm">{n.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${cfg.bg} ${cfg.color} border-current/30`}>
                          {cfg.label}
                        </span>
                        {n.recipient ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
                            👤 {n.recipient.name}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                            🌐 عام
                          </span>
                        )}
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" title="غير مقروء" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                        <button onClick={() => handleDelete(n.id)} disabled={deletingId === n.id}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition opacity-0 group-hover:opacity-100 disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{n.message}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── Compose Modal ── */}
      <AnimatePresence>
        {showCompose && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCompose(false)}>
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl"
              onClick={e => e.stopPropagation()}>

              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-400" />
                    إرسال إشعار جديد
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">حدد المستهدفين والرسالة</p>
                </div>
                <button onClick={() => setShowCompose(false)}
                  className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSend} className="space-y-4">
                {/* Target selector */}
                <div>
                  <label className="block text-xs text-slate-300 mb-2 font-semibold">المستهدفون</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TARGET_OPTIONS.map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => { setForm(f => ({ ...f, target: opt.value, academicStageId: '', groupId: '', recipientId: '' })); }}
                        className={`p-3 rounded-xl border text-right transition flex items-center gap-2 ${
                          form.target === opt.value
                            ? 'bg-blue-600/25 border-blue-500/50 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}>
                        <opt.icon className={`w-4 h-4 flex-shrink-0 ${form.target === opt.value ? opt.color : ''}`} />
                        <div>
                          <p className="text-xs font-bold">{opt.label}</p>
                          <p className="text-[10px] opacity-60">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional sub-selects */}
                {form.target === 'STAGE' && (
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-semibold">المرحلة الدراسية *</label>
                    <select value={form.academicStageId} onChange={e => setForm(f => ({ ...f, academicStageId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm">
                      <option value="">-- اختر المرحلة --</option>
                      {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {form.target === 'GROUP' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1.5 font-semibold">المرحلة (اختياري للتصفية)</label>
                      <select value={form.academicStageId} onChange={e => setForm(f => ({ ...f, academicStageId: e.target.value, groupId: '' }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm">
                        <option value="">-- كل المراحل --</option>
                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1.5 font-semibold">المجموعة *</label>
                      <select value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm">
                        <option value="">-- اختر المجموعة --</option>
                        {filteredGroups.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.name}{g.academicStage ? ` (${g.academicStage.name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {form.target === 'STUDENT' && (
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-semibold">الطالب *</label>
                    <select value={form.recipientId} onChange={e => setForm(f => ({ ...f, recipientId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm">
                      <option value="">-- اختر الطالب --</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                  </div>
                )}

                {/* Notification type */}
                <div>
                  <label className="block text-xs text-slate-300 mb-2 font-semibold">نوع الإشعار</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <button key={k} type="button" onClick={() => setForm(f => ({ ...f, type: k }))}
                        className={`p-2.5 rounded-xl border text-center transition text-xs font-bold ${
                          form.type === k
                            ? `${v.bg} border-current/40 ${v.color}`
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5 font-semibold">عنوان الإشعار *</label>
                  <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="مثال: تذكير بموعد الامتحان"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm placeholder-slate-600" />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5 font-semibold">نص الرسالة *</label>
                  <textarea required rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="اكتب تفاصيل الإشعار هنا..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm placeholder-slate-600 resize-none" />
                </div>

                {/* Summary preview */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                  <p className="font-bold mb-0.5">ملخص الإرسال:</p>
                  <p>
                    سيتم إرسال هذا الإشعار إلى{' '}
                    {form.target === 'ALL' ? '🌐 جميع الطلاب' :
                     form.target === 'STAGE' ? `🎓 طلاب ${stages.find(s => s.id === form.academicStageId)?.name || 'المرحلة المختارة'}` :
                     form.target === 'GROUP' ? `👥 طلاب ${groups.find(g => g.id === form.groupId)?.name || 'المجموعة المختارة'}` :
                     `👤 ${students.find(s => s.id === form.recipientId)?.name || 'الطالب المختار'}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setShowCompose(false)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition">
                    إلغاء
                  </button>
                  <button type="submit" disabled={sending}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition">
                    <Send className="w-4 h-4" />
                    {sending ? 'جاري الإرسال...' : 'إرسال الإشعار ↑'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
