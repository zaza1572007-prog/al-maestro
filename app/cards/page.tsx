'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Printer, Users } from 'lucide-react';
import Barcode from '@/components/Barcode';

interface Student {
  id: string;
  code: string;
  name: string;
  qrCode: string;
  academicStage?: { name: string };
  group?: { name: string; startTime?: string };
}

export default function CardsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stuRes, grpRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/groups'),
      ]);
      const stuData = await stuRes.json();
      const grpData = await grpRes.json();
      setStudents(stuData.students || []);
      setGroups(grpData.groups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = selectedGroupId === 'ALL'
    ? students
    : students.filter((s) => s.group?.name === selectedGroupId || (s as any).groupId === selectedGroupId);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide non-printable elements */
          .no-print, header, aside, .no-print *, button, .flex-wrap {
            display: none !important;
          }
          
          /* Force page size and layout reset */
          body, html, main, #__next, div.flex-1, main.flex-1 {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
          }

          @page {
            size: 50mm 25mm;
            margin: 0;
          }

          .sticker-card {
            width: 50mm !important;
            height: 25mm !important;
            max-width: 50mm !important;
            max-height: 25mm !important;
            min-width: 50mm !important;
            min-height: 25mm !important;
            padding: 1.5mm 2mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .sticker-card h4 {
            white-space: normal !important;
            word-break: break-word !important;
            overflow: visible !important;
            text-overflow: unset !important;
          }
          .sticker-card p {
            white-space: normal !important;
            word-break: break-word !important;
            overflow: visible !important;
            text-overflow: unset !important;
          }
        }
      `}} />

      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-white">🎴 طباعة بطاقات الطلاب</h1>
          <p className="text-slate-400 text-sm mt-1">توليد بطاقات تعريف QR Code للطلاب الحقيقيين من قاعدة البيانات</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-4 h-4" /> طباعة البطاقات
          </button>
        </div>
      </div>

      {/* Group Filter */}
      <div className="flex items-center gap-2 flex-wrap no-print">
        <span className="text-xs text-slate-400">تصفية بالمجموعة:</span>
        <button
          onClick={() => setSelectedGroupId('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedGroupId === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          الكل ({students.length})
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGroupId(g.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedGroupId === g.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل بيانات الطلاب...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:block print:w-full print:p-0">
          {filtered.map((stu) => (
            <div
              key={stu.id}
              className="sticker-card w-full bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border-2 border-blue-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between print:border print:border-black/10 print:bg-white print:text-black print:shadow-none"
            >
              <div className="flex items-center justify-between print:mb-0.5">
                <div>
                  <h3 className="font-extrabold text-sm text-white print:text-black print:text-[8px] print:leading-tight">منصة المايسترو</h3>
                  <p className="text-[10px] text-amber-400 print:text-amber-600 font-bold print:text-[7px] print:leading-tight">أ. أحمد راضي كحلة</p>
                </div>
                <span className="text-[10px] bg-blue-600 text-white font-mono px-2 py-0.5 rounded print:text-[7px] print:px-1 print:py-0 print:border print:border-blue-600/20 print:text-blue-700 print:bg-blue-50 print:leading-tight">{stu.code}</span>
              </div>

              <div className="flex items-center gap-3 my-3 print:my-0.5 print:gap-1.5">
                <div className="w-28 h-12 bg-white p-1 rounded-lg flex items-center justify-center overflow-hidden print:border print:border-slate-200 print:w-[100px] print:h-[30px] print:p-0.5 flex-shrink-0">
                  <Barcode value={stu.qrCode || stu.code} width={0.8} height={18} />
                </div>
                <div className="flex-1 min-w-0 print:text-right">
                  <h4 className="font-bold text-slate-100 print:text-black print:text-[8px] print:leading-tight truncate">{stu.name}</h4>
                  <p className="text-[10px] text-slate-400 print:text-slate-600 print:text-[6.5px] print:leading-tight truncate">{stu.academicStage?.name || '—'}</p>
                </div>
              </div>

              <p className="text-[9px] text-slate-600 print:text-slate-400 text-center border-t border-slate-800 print:border-slate-200 pt-1 print:pt-0.5 print:text-[6px] print:leading-none">
                كود التعريف: {stu.qrCode || stu.code}
              </p>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              لا يوجد طلاب في هذه المجموعة
            </div>
          )}
        </div>
      )}
    </div>
  );
}
