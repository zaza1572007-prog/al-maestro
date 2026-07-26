'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CalendarDays } from 'lucide-react';

interface CalEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'SESSION' | 'EXAM';
  group: string;
  location?: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [sesRes, examRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/exams'),
      ]);
      const sesData = await sesRes.json();
      const examData = await examRes.json();

      const sessionEvents: CalEvent[] = (sesData.sessions || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        date: s.date,
        time: `${s.startTime} - ${s.endTime}`,
        type: 'SESSION' as const,
        group: s.group?.name || '',
        location: s.location,
      }));

      const examEvents: CalEvent[] = (examData.exams || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.examDate,
        time: '—',
        type: 'EXAM' as const,
        group: e.group?.name || '',
      }));

      const all = [...sessionEvents, ...examEvents].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setEvents(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🗓️ التقويم الدراسي</h1>
          <p className="text-slate-400 text-sm mt-1">الجلسات والامتحانات القادمة من قاعدة البيانات</p>
        </div>
        <button onClick={fetchEvents} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل الأحداث...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upcoming */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-400" /> الأحداث القادمة ({upcoming.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {upcoming.map((ev) => (
                <div key={ev.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{ev.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(ev.date).toLocaleDateString('ar-EG')} • {ev.time}
                    </p>
                    <p className="text-xs text-blue-400 mt-0.5">{ev.group} {ev.location ? `• 📍 ${ev.location}` : ''}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${ev.type === 'EXAM' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                    {ev.type === 'EXAM' ? '📝 اختبار' : '📅 جلسة'}
                  </span>
                </div>
              ))}
              {upcoming.length === 0 && (
                <p className="text-center py-8 text-slate-500">لا توجد أحداث قادمة</p>
              )}
            </div>
          </div>

          {/* Past */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-400" /> الأحداث السابقة ({past.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {past.slice(0, 20).map((ev) => (
                <div key={ev.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between opacity-70">
                  <div>
                    <h4 className="font-semibold text-slate-300 text-sm">{ev.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(ev.date).toLocaleDateString('ar-EG')} • {ev.group}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ev.type === 'EXAM' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-500/10 text-slate-400'}`}>
                    {ev.type === 'EXAM' ? 'اختبار' : 'جلسة'}
                  </span>
                </div>
              ))}
              {past.length === 0 && (
                <p className="text-center py-8 text-slate-500">لا توجد أحداث سابقة</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-500">جلسات قادمة</p>
          <p className="text-2xl font-black text-emerald-400">{upcoming.filter(e => e.type === 'SESSION').length}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-500">اختبارات قادمة</p>
          <p className="text-2xl font-black text-purple-400">{upcoming.filter(e => e.type === 'EXAM').length}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-500">إجمالي الأحداث</p>
          <p className="text-2xl font-black text-white">{events.length}</p>
        </div>
      </div>
    </div>
  );
}
