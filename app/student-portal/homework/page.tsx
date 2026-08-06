'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { BookOpenCheck, Clock, Upload, Eye, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function StudentHomeworkPage() {
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const toast = useToast();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchData = async () => {
    try {
      const res = await fetch('/api/student-portal/homework');
      const data = await res.json();
      if (data.success) {
        setHomeworks(data.homeworks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadClick = (hwId: string) => {
    fileInputRefs.current[hwId]?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, hwId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(hwId);
    toast.info('جاري رفع حل الواجب...');

    try {
      const formData = new FormData();
      formData.append('homeworkId', hwId);
      formData.append('file', file);

      const res = await fetch('/api/student-portal/homework', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success('تم تسليم حل الواجب بنجاح! 🎉');
        await fetchData();
      } else {
        toast.error(data.error || 'فشل رفع حل الواجب. حاول مرة أخرى.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setUploadingId(null);
      // Reset input value so same file can be uploaded again
      e.target.value = '';
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-white animate-pulse">جارٍ تحميل الواجبات...</div>;
  }

  const completedCount = homeworks.filter(hw => hw.status.includes('مكتمل')).length;

  const getStatusBadgeStyle = (status: string) => {
    if (status.includes('تم التقييم')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
    if (status === 'مكتمل') {
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
    if (status.includes('متأخر')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
    return 'bg-slate-700/30 text-slate-400 border-white/10';
  };

  return (
    <div className="space-y-8">
      <HeroHeader
        title="واجباتي والتقييمات 📚"
        badge="بوابة الطالب"
        subtitle="الاطلاع على المهام الدراسية وتسليم الواجبات"
        stats={[
          { label: "واجبات مكتملة", value: completedCount.toString(), color: "text-blue-400" },
        ]}
      />

      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <BookOpenCheck className="w-5 h-5 text-purple-400" />
          <span>سجل الواجبات</span>
        </h2>

        <div className="space-y-4">
          {homeworks.map((hw) => (
            <motion.div
              key={hw.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h4 className="font-bold text-white text-sm">{hw.title}</h4>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> تاريخ التسليم: {hw.dueDate}
                </p>
                {hw.feedback && (
                  <p className="text-xs text-amber-400 mt-2 bg-amber-500/10 border border-amber-500/25 p-2 rounded-xl">
                    ملاحظة المعلم: {hw.feedback}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Hidden input file for upload */}
                <input
                  type="file"
                  ref={(el) => {
                    fileInputRefs.current[hw.id] = el;
                  }}
                  className="hidden"
                  onChange={(e) => handleFileChange(e, hw.id)}
                />

                {hw.attachments && hw.attachments.length > 0 && (
                  <a
                    href={hw.attachments[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-300 hover:text-white bg-purple-500/10 border border-purple-500/20 px-3 py-2 rounded-xl flex items-center gap-1 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" /> عرض الحل المرفوع
                  </a>
                )}

                {hw.status === 'قيد الانتظار' || hw.status === 'مكتمل' || hw.status.includes('متأخر') ? (
                  <button
                    disabled={uploadingId === hw.id}
                    onClick={() => handleUploadClick(hw.id)}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    {uploadingId === hw.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الرفع...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" /> {hw.attachments && hw.attachments.length > 0 ? 'تعديل الحل' : 'رفع الحل'}
                      </>
                    )}
                  </button>
                ) : null}

                <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${getStatusBadgeStyle(hw.status)}`}>
                  {hw.status}
                </span>

                {hw.score && (
                  <span className="text-lg font-black text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-2xl">
                    {hw.score}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
