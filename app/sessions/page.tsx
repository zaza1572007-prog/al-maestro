'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, BookOpen, Clock, Users } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  groupId: string;
  group: { id: string; name: string; academicStage?: { name: string } };
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  location?: string;
  _count: { attendances: number };
}

interface Group {
  id: string;
  name: string;
  academicStage?: { name: string };
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  OPEN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  IN_PROGRESS: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  COMPLETED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  CANCELLED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  POSTPONED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: 'مجدولة',
  OPEN: 'مفتوحة',
  IN_PROGRESS: 'جارية الآن',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
  POSTPONED: 'مؤجلة',
};

const typeLabels: Record<string, string> = {
  LECTURE: 'محاضرة',
  REVIEW: 'مراجعة',
  EXAM: 'امتحان',
  HOMEWORK: 'واجب',
  MAKEUP: 'تعويض',
};

function to12h(time24: string): string {
  if (!time24) return time24;
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const period = h >= 12 ? 'م' : 'ص';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    groupId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '16:00',
    endTime: '18:00',
    type: 'LECTURE',
    location: '',
  });

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const [sessRes, grpRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/groups'),
      ]);
      const sessData = await sessRes.json();
      const grpData = await grpRes.json();
      if (sessData.success) setSessions(sessData.sessions || []);
      if (grpData.success || grpData.groups) setGroups(grpData.groups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSessions();
        setIsAddingSession(false);
        setNewSession({ title: '', groupId: '', date: new Date().toISOString().split('T')[0], startTime: '16:00', endTime: '18:00', type: 'LECTURE', location: '' });
      } else {
        alert(data.error || 'حدث خطأ أثناء إنشاء الجلسة');
      }
    } catch (err) {
      alert('تعذّر الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (session: Session) => {
    const nextStatus = session.status === 'SCHEDULED' ? 'IN_PROGRESS' : session.status === 'IN_PROGRESS' ? 'COMPLETED' : 'SCHEDULED';
    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchSessions();
    } catch (err) {}
  };

  const handleDeleteSession = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف جلسة "${title}"؟`)) return;
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchSessions();
      else alert(data.error || 'تعذّر حذف الجلسة');
    } catch { alert('خطأ في الاتصال'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📅 الجلسات والدروس</h1>
          <p className="text-slate-400 text-sm mt-1">إدارة جلسات التدريس وتتبع حضور الطلاب لكل جلسة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSessions} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAddingSession(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            جلسة جديدة
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل الجلسات...
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((ses) => (
            <div key={ses.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${statusColors[ses.status] || ''}`}>
                    {statusLabels[ses.status] || ses.status}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {typeLabels[ses.type] || ses.type}
                  </span>
                </div>
                <h3 className="font-bold text-white">{ses.title}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {ses.group?.name}
                    {ses.group?.academicStage?.name ? ` · ${ses.group.academicStage.name}` : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(ses.date).toLocaleDateString('ar-EG')} | {to12h(ses.startTime)} - {to12h(ses.endTime)}
                  </span>
                  {ses.location && <span>📍 {ses.location}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <p className="text-xs text-slate-500">الحضور</p>
                  <p className="text-lg font-black text-white flex items-center gap-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    {ses._count?.attendances ?? 0}
                  </p>
                </div>
                {ses.status !== 'COMPLETED' && ses.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleToggleStatus(ses)}
                    className="px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white rounded-lg text-xs font-bold transition border border-amber-500/30"
                  >
                    {ses.status === 'SCHEDULED' ? 'ابدأ الجلسة' : 'أكمل الجلسة'}
                  </button>
                )}
                <button
                  onClick={() => handleDeleteSession(ses.id, ses.title)}
                  className="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-xs transition"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              لا توجد جلسات مسجلة. اضغط "جلسة جديدة" لإنشاء جلسة
            </div>
          )}
        </div>
      )}

      {/* Add Session Modal */}
      {isAddingSession && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">📅 إضافة جلسة جديدة</h3>
              <button onClick={() => setIsAddingSession(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateSession} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-300 mb-1 text-xs">عنوان الجلسة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شرح الهندسة التحليلية - الدرس الأول"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-xs">المجموعة *</label>
                <select
                  required
                  value={newSession.groupId}
                  onChange={(e) => setNewSession({ ...newSession, groupId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                >
                  <option value="">اختر المجموعة...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">تاريخ الجلسة</label>
                  <input
                    type="date"
                    value={newSession.date}
                    onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">نوع الجلسة</label>
                  <select
                    value={newSession.type}
                    onChange={(e) => setNewSession({ ...newSession, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  >
                    <option value="LECTURE">محاضرة</option>
                    <option value="REVIEW">مراجعة</option>
                    <option value="EXAM">امتحان</option>
                    <option value="MAKEUP">تعويض</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">وقت البداية</label>
                  <input
                    type="time"
                    value={newSession.startTime}
                    onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">وقت الانتهاء</label>
                  <input
                    type="time"
                    value={newSession.endTime}
                    onChange={(e) => setNewSession({ ...newSession, endTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-xs">المكان (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: القاعة الكبرى"
                  value={newSession.location}
                  onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddingSession(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg text-sm">
                  {isSaving ? 'جاري الحفظ...' : 'إنشاء الجلسة ➕'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
