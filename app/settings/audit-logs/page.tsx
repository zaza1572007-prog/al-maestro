'use client';

import { useState, useEffect } from 'react';
import { Shield, Search, RefreshCw, Clock, User, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    name: string;
    role: string;
    phone: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (currentPage = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const url = `/api/admin/audit-logs?page=${currentPage}&limit=25&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page, search);
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1, search);
  };

  const getActionBadge = (action: string) => {
    if (action.includes('RECORDED') || action.includes('SUCCESS')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (action.includes('UPDATED') || action.includes('MUTATED')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (action.includes('DELETED') || action.includes('REMOVED')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition mb-2">
            <ArrowRight className="w-3.5 h-3.5" /> العودة للإعدادات
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-blue-400" />
            سجل تدقيق العمليات والحركات (Audit Logs)
          </h1>
          <p className="text-slate-400 text-sm mt-1">تتبع كافة أفعال التعديل والحضور والعمليات الحساسة الصادرة من المساعدين والآدمن</p>
        </div>
        <button
          onClick={() => fetchLogs(page, search)}
          className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-2xl transition flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> تحديث السجل
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المساعد، نوع العملية، أو الكيان..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pr-10 pl-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl transition shadow"
        >
          بحث
        </button>
      </form>

      {/* Logs Table / Cards */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">جارٍ تحميل سجلات التدقيق... 🔄</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">لا توجد حركات مسجلة تطابق البحث حالياً</div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {logs.map((log) => {
              let parsedChanges: any = null;
              try {
                if (log.changes) parsedChanges = JSON.parse(log.changes);
              } catch {}

              return (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-800/40 transition space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-xs text-slate-400 font-mono bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-700/50">
                        {log.entity} #{log.entityId.slice(0, 8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(log.createdAt).toLocaleString('ar-EG')}
                      </span>
                      {log.ipAddress && (
                        <span className="font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded text-slate-500">
                          {log.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-white">{log.user?.name || 'النظام التلقائي'}</span>
                      {log.user?.role && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {log.user.role}
                        </span>
                      )}
                    </div>

                    {parsedChanges && (
                      <details className="text-xs text-slate-400 cursor-pointer">
                        <summary className="hover:text-blue-400 transition flex items-center gap-1 font-mono">
                          <FileText className="w-3.5 h-3.5" /> تفاصيل التغييرات
                        </summary>
                        <pre className="mt-2 p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-slate-300 max-w-full overflow-x-auto border border-slate-800">
                          {JSON.stringify(parsedChanges, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span>الصفحة {page} من {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 disabled:opacity-40 transition"
            >
              السابقة
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 disabled:opacity-40 transition"
            >
              التالية
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
