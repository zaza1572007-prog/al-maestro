'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import {
  FileText, FileArchive, Film, Image, FileSpreadsheet, FileType2,
  Download, Eye, Search, X, Loader2, Play
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
  stageName: string | null;
  groupName: string | null;
  accessLabel: string;
}

const TYPE_ICONS: Record<string, any> = {
  PDF: FileText, WORD: FileType2, EXCEL: FileSpreadsheet,
  POWERPOINT: FileType2, IMAGE: Image, VIDEO: Film,
  ZIP: FileArchive, OTHER: FileText,
};
const TYPE_COLORS: Record<string, string> = {
  PDF: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  WORD: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  EXCEL: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  POWERPOINT: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  IMAGE: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  VIDEO: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  ZIP: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  OTHER: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};
const TYPE_LABELS: Record<string, string> = {
  PDF: 'PDF', WORD: 'Word', EXCEL: 'Excel', POWERPOINT: 'PowerPoint',
  IMAGE: 'صورة', VIDEO: 'فيديو', ZIP: 'مضغوط', OTHER: 'أخرى',
};

function fmtSize(b: number) {
  if (!b) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return (b / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
}

export default function StudentFilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [preview, setPreview] = useState<FileItem | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/student-portal/files');
        const data = await res.json();
        if (data.success) setFiles(data.files);
        else setError(data.error || 'تعذر تحميل الملفات');
      } catch {
        setError('خطأ في الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const videos = files.filter(f => f.type === 'VIDEO');
  const docs = files.filter(f => f.type !== 'VIDEO');

  const filteredDocs = docs.filter(f => {
    const ms = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const mt = !filterType || f.type === filterType;
    return ms && mt;
  });
  const filteredVideos = videos.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8" dir="rtl">
      <HeroHeader
        title="المكتبة والملفات 📂"
        badge="بوابة الطالب"
        subtitle="تحميل ومشاهدة المذكرات والفيديوهات الدراسية المخصصة لمرحلتك"
        stats={[
          { label: 'إجمالي الملفات', value: String(files.length), color: 'text-blue-400' },
          { label: 'فيديوهات', value: String(videos.length), color: 'text-cyan-400' },
          { label: 'PDF ومذكرات', value: String(files.filter(f => f.type === 'PDF').length), color: 'text-rose-400' },
        ]}
      />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input type="text" placeholder="ابحث في الملفات..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-2.5 pr-10 text-white text-sm placeholder-slate-500" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-3 top-3 text-slate-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-slate-900/80 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm">
          <option value="">كل الأنواع</option>
          {Object.entries(TYPE_LABELS).filter(([k]) => k !== 'VIDEO').map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">جاري تحميل ملفاتك الدراسية...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-rose-400">
          <p className="font-semibold">{error}</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <FileText className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg text-slate-400">لا توجد ملفات متاحة حالياً</p>
          <p className="text-sm mt-1">سيتم إضافة المذكرات والفيديوهات بواسطة المعلم قريباً</p>
        </div>
      ) : (
        <>
          {/* Video Section */}
          {filteredVideos.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border border-cyan-500/20">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <Film className="w-5 h-5 text-cyan-400" />
                <span>الفيديوهات التعليمية 🎬</span>
                <span className="mr-auto text-xs text-slate-400 font-normal">{filteredVideos.length} فيديو</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((f, i) => (
                  <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="group relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 cursor-pointer hover:border-cyan-500/40 transition-all"
                    onClick={() => setPreview(f)}>
                    {/* Thumbnail placeholder */}
                    <div className="h-40 bg-gradient-to-br from-cyan-900/30 via-slate-900 to-indigo-900/30 flex items-center justify-center">
                      <div className="p-5 rounded-full bg-white/5 group-hover:bg-white/15 group-hover:scale-110 transition-all duration-300 border border-white/10">
                        <Play className="w-8 h-8 text-cyan-300 fill-cyan-300" />
                      </div>
                    </div>
                    <div className="p-3.5">
                      <p className="font-bold text-white text-sm truncate leading-snug">{f.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-500">{f.createdAt}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 font-semibold">
                          {f.accessLabel}
                        </span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-cyan-400/0 group-hover:bg-cyan-400/5 transition rounded-2xl pointer-events-none" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {filteredDocs.length > 0 && (
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span>المذكرات والملفات الدراسية</span>
                <span className="mr-auto text-xs text-slate-400 font-normal">{filteredDocs.length} ملف</span>
              </h2>
              <div className="space-y-3">
                {filteredDocs.map((f, i) => {
                  const Icon = TYPE_ICONS[f.type] || TYPE_ICONS.OTHER;
                  return (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/10 flex items-center justify-between gap-4 transition-colors">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-3 rounded-xl border flex-shrink-0 ${TYPE_COLORS[f.type] || TYPE_COLORS.OTHER}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{f.name}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${TYPE_COLORS[f.type] || TYPE_COLORS.OTHER}`}>
                              {TYPE_LABELS[f.type] || f.type}
                            </span>
                            <span className="text-[10px] text-slate-500">{fmtSize(f.size)}</span>
                            <span className="text-[10px] text-slate-500">• {f.createdAt}</span>
                            <span className="text-[10px] text-purple-400">• {f.accessLabel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {['PDF', 'IMAGE'].includes(f.type) && (
                          <button onClick={() => setPreview(f)}
                            className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition" title="معاينة">
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <a href={f.url} download target="_blank" rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 text-xs font-semibold">
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">تحميل</span>
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {(filteredDocs.length === 0 && filteredVideos.length === 0) && (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">لا توجد نتائج للبحث</p>
              <button onClick={() => { setSearch(''); setFilterType(''); }} className="text-xs text-purple-400 hover:underline mt-2">
                مسح البحث
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Preview Modal ── */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-5 max-w-4xl w-full shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl border flex-shrink-0 ${TYPE_COLORS[preview.type] || TYPE_COLORS.OTHER}`}>
                    {(() => { const I = TYPE_ICONS[preview.type] || TYPE_ICONS.OTHER; return <I className="w-5 h-5" />; })()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-bold text-sm truncate">{preview.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{preview.accessLabel} • {fmtSize(preview.size)}</p>
                  </div>
                </div>
                <button onClick={() => setPreview(null)}
                  className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden bg-black/50 min-h-64 flex items-center justify-center">
                {preview.type === 'VIDEO' ? (
                  <video controls autoPlay className="w-full max-h-[65vh] rounded-xl" src={preview.url}>
                    متصفحك لا يدعم تشغيل الفيديو. يرجى تحميله.
                  </video>
                ) : preview.type === 'PDF' ? (
                  <iframe src={preview.url} className="w-full h-[65vh] border-0" title={preview.name} />
                ) : preview.type === 'IMAGE' ? (
                  <img src={preview.url} alt={preview.name} className="max-h-[65vh] mx-auto object-contain rounded-xl" />
                ) : null}
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                <span className="text-xs text-slate-400">{preview.createdAt}</span>
                <a href={preview.url} download
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition">
                  <Download className="w-4 h-4" /> تحميل الملف
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
