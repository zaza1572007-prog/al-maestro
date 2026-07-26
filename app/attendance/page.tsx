'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, QrCode, UserCheck, UserX, Clock } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  student: { name: string; code: string };
  session: { title: string; group: { name: string } };
  status: string;
  checkInTime?: string;
  createdAt: string;
}

interface Session {
  id: string;
  title: string;
  group: { name: string };
  date: string;
  status: string;
}

const statusColors: Record<string, string> = {
  PRESENT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ABSENT: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  LATE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  LEFT_EARLY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  EXCUSED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusLabels: Record<string, string> = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  LEFT_EARLY: 'انصرف مبكراً',
  EXCUSED: 'غياب بعذر',
};

export default function AttendancePage() {
  const [code, setCode] = useState('');
  const [lastScan, setLastScan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [manualStatus, setManualStatus] = useState('PRESENT');

  const [recentAttendances, setRecentAttendances] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const [attRes, sesRes] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/sessions'),
      ]);
      const attData = await attRes.json();
      const sesData = await sesRes.json();
      if (attData.success) setRecentAttendances(attData.attendances || []);
      if (sesData.success) {
        const active = (sesData.sessions || []).filter((s: Session) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED');
        setSessions(active);
        if (active.length > 0 && !selectedSessionId) setSelectedSessionId(active[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentCode: code, sessionId: selectedSessionId || undefined, status: manualStatus }),
      });
      const data = await res.json();
      setLastScan(data);
      if (data.success) {
        await fetchHistory();
      }
    } catch (err: any) {
      setLastScan({ success: false, error: err.message });
    } finally {
      setLoading(false);
      setCode('');
    }
  };

  const todayStr = new Date().toLocaleDateString('ar-EG');
  const todayAttendances = recentAttendances.filter((a) => {
    const d = new Date(a.createdAt).toLocaleDateString('ar-EG');
    return d === todayStr;
  });
  const presentCount = todayAttendances.filter((a) => a.status === 'PRESENT').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📱 ماسح QR Code وتسجيل الحضور</h1>
          <p className="text-slate-400 text-sm mt-1">تسجيل حضور الطلاب عبر الكود أو مسح QR Code</p>
        </div>
        <button onClick={fetchHistory} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-400" />
              الماسح الضوئي
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              نشط 🟢
            </span>
          </div>

          {/* Select Session */}
          {sessions.length > 0 && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">الجلسة الحالية</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title} - {s.group?.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">حالة الحضور</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setManualStatus(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${manualStatus === key ? statusColors[key] : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Scanner Input */}
          <form onSubmit={handleScan} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">كود الطالب أو رمز QR</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="أدخل كود الطالب أو امسح QR Code..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20"
            >
              {loading ? 'جارٍ التسجيل...' : 'تسجيل الحضور 📲'}
            </button>
          </form>

          {/* Result */}
          {lastScan && (
            <div className={`p-4 rounded-2xl border text-sm ${lastScan.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
              {lastScan.success ? (
                <div className="space-y-1">
                  <p className="font-bold flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    {lastScan.message}
                  </p>
                  <p className="text-xs opacity-80">المجموعة: {lastScan.student?.groupName}</p>
                  <p className="text-xs opacity-80">
                    {lastScan.student?.hasActiveSub ? '✅ اشتراك نشط' : '⚠️ لا يوجد اشتراك نشط'}
                  </p>
                </div>
              ) : (
                <p className="flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  {lastScan.error || 'لم يتم التعرف على الكود'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Today Stats & History */}
        <div className="space-y-4">
          {/* Today Summary */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              إحصائيات اليوم
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                <p className="text-2xl font-black text-emerald-400">{presentCount}</p>
                <p className="text-xs text-slate-400 mt-1">حاضر</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
                <p className="text-2xl font-black text-rose-400">
                  {todayAttendances.filter((a) => a.status === 'ABSENT').length}
                </p>
                <p className="text-xs text-slate-400 mt-1">غائب</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
                <p className="text-2xl font-black text-amber-400">
                  {todayAttendances.filter((a) => a.status === 'LATE').length}
                </p>
                <p className="text-xs text-slate-400 mt-1">متأخر</p>
              </div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h2 className="font-bold text-white text-sm">آخر سجلات الحضور</h2>
            {loadingHistory ? (
              <p className="text-slate-400 text-sm text-center py-4">جارٍ التحميل...</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {recentAttendances.slice(0, 20).map((att) => (
                  <div key={att.id} className="flex items-center justify-between text-xs p-2.5 bg-slate-950/60 rounded-xl">
                    <div>
                      <p className="font-semibold text-white">{att.student?.name}</p>
                      <p className="text-slate-500">{att.session?.group?.name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full border text-xs ${statusColors[att.status] || ''}`}>
                        {statusLabels[att.status] || att.status}
                      </span>
                      {att.checkInTime && (
                        <p className="text-slate-500 mt-0.5">
                          {new Date(att.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {recentAttendances.length === 0 && (
                  <p className="text-slate-500 text-center py-4">لا توجد سجلات حضور</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
