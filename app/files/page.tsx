'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Trash2, Download, Eye, FileText, FileArchive,
  Film, Image, FileSpreadsheet, FileType2, Filter, X, RefreshCw,
  Globe, GraduationCap, Users
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface FileItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
  accessLevel?: string;
  academicStage?: { id: string; name: string } | null;
  group?: { id: string; name: string } | null;
}
interface Stage { id: string; name: string; }
interface Group { id: string; name: string; academicStageId: string; academicStage?: { name: string }; }

const TYPE_ICONS: Record<string, any> = {
  PDF: FileText, WORD: FileType2, EXCEL: FileSpreadsheet,
  POWERPOINT: FileType2, IMAGE: Image, VIDEO: Film, ZIP: FileArchive, OTHER: FileText,
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

export default function FilesPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload form
  const [showPanel, setShowPanel] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState('');
  const [accessLevel, setAccessLevel] = useState<'ALL' | 'STAGE' | 'GROUP'>('ALL');
  const [uploadStageId, setUploadStageId] = useState('');
  const [uploadGroupId, setUploadGroupId] = useState('');

  // Filters
  const [filterStage, setFilterStage] = useState('');
  const [filterType, setFilterType] = useState('');

  // Preview
  const [preview, setPreview] = useState<FileItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStage) params.set('academicStageId', filterStage);
      if (filterType) params.set('type', filterType);

      const [fRes, sRes, gRes] = await Promise.all([
        fetch(`/api/files?${params}`),
        fetch('/api/stages'),
        fetch('/api/groups'),
      ]);
      const [fd, sd, gd] = await Promise.all([fRes.json(), sRes.json(), gRes.json()]);
      if (fd.success) setFiles(fd.files);
      if (sd.success) setStages(sd.stages);
      if (gd.success) setGroups(gd.groups);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterStage, filterType]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    setCustomName(f.name.replace(/\.[^.]+$/, ''));
    setAccessLevel('ALL');
    setUploadStageId('');
    setUploadGroupId('');
    setShowPanel(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (accessLevel === 'STAGE' && !uploadStageId) { toast.error('اختر المرحلة الدراسية'); return; }
    if (accessLevel === 'GROUP' && !uploadGroupId) { toast.error('اختر المجموعة'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('customName', customName || selectedFile.name);
      fd.append('accessLevel', accessLevel);
      if (accessLevel === 'STAGE') fd.append('academicStageId', uploadStageId);
      if (accessLevel === 'GROUP') fd.append('groupId', uploadGroupId);

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.success) {
        toast.success('✅ تم رفع الملف بنجاح!');
        setShowPanel(false);
        setSelectedFile(null);
        setCustomName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchData();
      } else {
        toast.error(data.error || 'فشل رفع الملف');
      }
    } catch { toast.error('خطأ في الاتصال أثناء الرفع'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم الحذف');
        setFiles(prev => prev.filter(f => f.id !== id));
      } else {
        toast.error(data.error || 'فشل الحذف');
      }
    } catch { toast.error('خطأ في الاتصال'); }
    finally { setDeletingId(null); }
  };

  const filteredGroups = groups.filter(g => !uploadStageId || g.academicStageId === uploadStageId);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">📁 إدارة الملفات والمكتبة</h1>
          <p className="text-slate-400 text-sm mt-1">رفع المذكرات والفيديوهات وتحديد المرحلة أو المجموعة المستهدفة</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="تحديث">
            <RefreshCw className="w-4 h-4" />
          </button>
          <label className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-sm transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'جاري الرفع...' : 'رفع ملف جديد'}</span>
            <input ref={fileInputRef} type="file" onChange={handleSelect} className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.avi,.mkv,.zip,.rar,.jpg,.jpeg,.png,.gif" />
          </label>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'إجمالي', value: files.length, color: 'text-blue-400' },
          { label: 'PDF', value: files.filter(f => f.type === 'PDF').length, color: 'text-rose-400' },
          { label: 'فيديو', value: files.filter(f => f.type === 'VIDEO').length, color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Upload Panel ── */}
      <AnimatePresence>
        {showPanel && selectedFile && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="bg-slate-900 border border-blue-500/30 rounded-3xl p-6 shadow-xl shadow-blue-500/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" /> تفاصيل الملف والصلاحية
              </h3>
              <button onClick={() => { setShowPanel(false); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                <X className="w-5 h-5 text-slate-400 hover:text-white transition" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                  <div className={`p-3 rounded-xl border flex-shrink-0 ${TYPE_COLORS[selectedFile.type?.includes('pdf') ? 'PDF' : selectedFile.type?.includes('video') ? 'VIDEO' : selectedFile.type?.includes('image') ? 'IMAGE' : 'OTHER']}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtSize(selectedFile.size)}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5 font-semibold">اسم مخصص للملف</label>
                  <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                    placeholder="مثال: مذكرة الجبر - الباب الأول"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm placeholder-slate-600" />
                </div>
              </div>

              {/* Right */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-2 font-semibold">صلاحية الوصول</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: 'ALL', icon: Globe, label: 'للجميع', sub: 'كل الطلاب' },
                      { v: 'STAGE', icon: GraduationCap, label: 'مرحلة', sub: 'مرحلة بعينها' },
                      { v: 'GROUP', icon: Users, label: 'مجموعة', sub: 'مجموعة محددة' },
                    ] as any[]).map(opt => (
                      <button key={opt.v} type="button"
                        onClick={() => { setAccessLevel(opt.v); setUploadStageId(''); setUploadGroupId(''); }}
                        className={`p-3 rounded-xl border text-center transition text-xs font-bold flex flex-col items-center gap-1.5 ${accessLevel === opt.v ? 'bg-blue-600/30 border-blue-500/60 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                        <opt.icon className="w-4 h-4" />
                        <span>{opt.label}</span>
                        <span className="font-normal text-[10px] opacity-60">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {accessLevel === 'STAGE' && (
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-semibold">المرحلة الدراسية *</label>
                    <select value={uploadStageId} onChange={e => setUploadStageId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm">
                      <option value="">-- اختر المرحلة --</option>
                      {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {accessLevel === 'GROUP' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1.5 font-semibold">المرحلة</label>
                      <select value={uploadStageId} onChange={e => { setUploadStageId(e.target.value); setUploadGroupId(''); }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm">
                        <option value="">-- اختر المرحلة (اختياري) --</option>
                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1.5 font-semibold">المجموعة *</label>
                      <select value={uploadGroupId} onChange={e => setUploadGroupId(e.target.value)}
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
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/10">
              <button onClick={() => { setShowPanel(false); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition">
                إلغاء
              </button>
              <button onClick={handleUpload} disabled={uploading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition">
                <Upload className="w-4 h-4" />
                {uploading ? 'جاري الرفع...' : 'رفع الملف الآن ↑'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span className="text-xs text-slate-400 font-semibold">تصفية:</span>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs">
          <option value="">كل المراحل</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs">
          <option value="">كل الأنواع</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(filterStage || filterType) && (
          <button onClick={() => { setFilterStage(''); setFilterType(''); }}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition">
            <X className="w-3 h-3" /> مسح الفلتر
          </button>
        )}
        <span className="mr-auto text-xs text-slate-500">{files.length} ملف</span>
      </div>

      {/* ── Files Table ── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="text-center py-16 text-slate-400 animate-pulse text-sm">جاري تحميل الملفات...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-sm">لا توجد ملفات حالياً</p>
            <p className="text-xs mt-1 opacity-60">اضغط على "رفع ملف جديد" للبدء</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">الملف</th>
                  <th className="p-3.5">النوع</th>
                  <th className="p-3.5">الحجم</th>
                  <th className="p-3.5">صلاحية الوصول</th>
                  <th className="p-3.5">تاريخ الرفع</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {files.map((f) => {
                  const Icon = TYPE_ICONS[f.type] || TYPE_ICONS.OTHER;
                  return (
                    <tr key={f.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border flex-shrink-0 ${TYPE_COLORS[f.type] || TYPE_COLORS.OTHER}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate max-w-56">{f.name}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 font-mono truncate max-w-56">{f.url}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${TYPE_COLORS[f.type] || TYPE_COLORS.OTHER}`}>
                          {TYPE_LABELS[f.type] || f.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-slate-400 font-mono">{fmtSize(f.size)}</td>
                      <td className="p-3.5">
                        {f.group ? (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
                            👥 {f.group.name}
                          </span>
                        ) : f.academicStage ? (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold">
                            🎓 {f.academicStage.name}
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                            🌐 للجميع
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-slate-400">
                        {new Date(f.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-2">
                          {['VIDEO', 'PDF', 'IMAGE'].includes(f.type) && (
                            <button onClick={() => setPreview(f)}
                              className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition" title="معاينة">
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <a href={f.url} download target="_blank" rel="noreferrer"
                            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition" title="تحميل">
                            <Download className="w-4 h-4" />
                          </a>
                          <button onClick={() => handleDelete(f.id, f.name)} disabled={deletingId === f.id}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition disabled:opacity-40" title="حذف">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Preview Modal ── */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-5 max-w-4xl w-full shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-sm truncate max-w-md">{preview.name}</h3>
                <button onClick={() => setPreview(null)} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden bg-black/40 min-h-64 flex items-center justify-center">
                {preview.type === 'VIDEO' ? (
                  <video controls autoPlay className="w-full max-h-[65vh] rounded-xl" src={preview.url}>
                    المتصفح لا يدعم تشغيل الفيديو
                  </video>
                ) : preview.type === 'PDF' ? (
                  <iframe src={preview.url} className="w-full h-[65vh] border-0" title={preview.name} />
                ) : preview.type === 'IMAGE' ? (
                  <img src={preview.url} alt={preview.name} className="max-h-[65vh] mx-auto object-contain rounded-xl" />
                ) : null}
              </div>
              <div className="flex justify-end mt-4 pt-4 border-t border-white/10">
                <a href={preview.url} download className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition">
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
