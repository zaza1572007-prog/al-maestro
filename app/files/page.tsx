'use client';

import { useState, useEffect } from 'react';

interface FileItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', fileList[0]);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        fetchFiles();
      } else {
        alert(data.error || 'فشل رفع الملف');
      }
    } catch (err) {
      alert('خطأ أثناء عملية الرفع');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📁 إدارة الملفات والمكتبة (File Management)</h1>
          <p className="text-slate-400 text-sm mt-1">رفع المذكرات، الملخصات والملفات المرفقة وتحديد صلاحيات الوصول</p>
        </div>
        <div>
          <label className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20">
            <span>📤</span> {uploading ? 'جاري الرفع...' : 'رفع ملف جديد'}
            <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">اسم الملف</th>
                <th className="p-3.5">النوع والحجم</th>
                <th className="p-3.5">تاريخ الرفع</th>
                <th className="p-3.5 text-center">التحميل والمعاينة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {files.map((f) => (
                <tr key={f.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-bold text-white flex items-center gap-2">
                    <span>📄</span> {f.name}
                  </td>
                  <td className="p-3.5 text-xs text-blue-400 font-mono">
                    {f.type} ({formatSize(f.size)})
                  </td>
                  <td className="p-3.5 text-xs text-slate-400 font-mono">
                    {new Date(f.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="p-3.5 text-center">
                    <a
                      href={f.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-semibold"
                    >
                      تحميل / معاينة ⬇️
                    </a>
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500 bg-slate-900/40 border border-slate-800">
                    لا توجد ملفات مرفوعة حالياً في المكتبة الدراسية
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

