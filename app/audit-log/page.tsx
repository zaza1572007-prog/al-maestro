'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Shield } from 'lucide-react';

interface Log {
  id: string;
  text: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            سجل العمليات والأنشطة
          </h1>
          <p className="text-slate-400 text-sm mt-1">تتبع وتوثيق كافة إجراءات النظام من قاعدة البيانات</p>
        </div>
        <button onClick={fetchLogs} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            جارٍ تحميل السجلات...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">الحدث</th>
                  <th className="p-3.5">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 text-slate-200">{log.text}</td>
                    <td className="p-3.5 text-xs text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center py-10 text-slate-500">لا توجد سجلات نشاط بعد</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
