'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Printer, Users, CheckSquare, Square } from 'lucide-react';
import Barcode from '@/components/Barcode';

interface Student {
  id: string;
  code: string;
  name: string;
  qrCode: string;
  academicStage?: { name: string };
  group?: { id?: string; name: string; startTime?: string };
}

export default function CardsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = students.filter((s) => {
    const matchesGroup = selectedGroupId === 'ALL'
      ? true
      : (s.group?.id === selectedGroupId || s.group?.name === selectedGroupId || (s as any).groupId === selectedGroupId);
    
    const matchesSearch = searchQuery.trim() === ''
      ? true
      : s.name.includes(searchQuery) || s.code.includes(searchQuery);
    
    return matchesGroup && matchesSearch;
  });

  const toggleStudentSelection = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filtered.length) {
      setSelectedStudentIds(new Set());
    } else {
      const allIds = filtered.map((s) => s.id);
      setSelectedStudentIds(new Set(allIds));
    }
  };

  const printSingleCard = (id: string) => {
    const prev = new Set(selectedStudentIds);
    setSelectedStudentIds(new Set([id]));
    setTimeout(() => {
      window.print();
      setSelectedStudentIds(prev);
    }, 50);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide non-printable elements */
          .no-print, header, aside, .no-print *, button, .flex-wrap, .absolute-print-hide {
            display: none !important;
          }
          
          /* Hide cards that are not selected when a selection exists */
          .not-selected-print {
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
          <p className="text-slate-400 text-sm mt-1">توليد بطاقات تعريف QR Code للطلاب وتحديد طلاب معينين للطباعة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> طباعة الكل ({filtered.length})
          </button>
        </div>
      </div>

      {/* Premium Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 no-print">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
            <input
              type="text"
              placeholder="🔍 ابحث باسم الطالب أو الكود..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedStudentIds(new Set()); // clear selection when searching to avoid hidden selected cards
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 flex-1 min-w-[240px]"
            />
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSelectedStudentIds(new Set()); // clear selection when changing group
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="ALL">كل المجموعات ({students.length})</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selection Actions */}
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button
              onClick={toggleSelectAll}
              disabled={filtered.length === 0}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {selectedStudentIds.size === filtered.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
            <button
              disabled={selectedStudentIds.size === 0}
              onClick={handlePrint}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> طباعة المحددة ({selectedStudentIds.size})
            </button>
          </div>
        </div>

        {/* Selection Summary Alert */}
        {selectedStudentIds.size > 0 && (
          <div className="flex justify-between items-center bg-purple-950/20 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs text-purple-300">
            <span>💡 تم تحديد {selectedStudentIds.size} طالب للطباعة. سيتم طباعة بطاقاتهم المحددة فقط عند الضغط على زر "طباعة المحددة".</span>
            <button onClick={() => setSelectedStudentIds(new Set())} className="underline font-bold hover:text-purple-100 cursor-pointer">إلغاء التحديد ❌</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل بيانات الطلاب...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:block print:w-full print:p-0">
          {filtered.map((stu) => {
            const isSelected = selectedStudentIds.has(stu.id);
            const isAnySelected = selectedStudentIds.size > 0;
            // Hide card in printing if a selection is active and this card is not selected
            const shouldHidePrint = isAnySelected && !isSelected;

            return (
              <div
                key={stu.id}
                onClick={() => toggleStudentSelection(stu.id)}
                className={`sticker-card relative w-full bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border-2 rounded-2xl p-4 shadow-xl flex flex-col justify-between transition-all duration-200 cursor-pointer group select-none
                  ${isSelected ? 'border-purple-500 shadow-purple-950/20 scale-[1.01]' : 'border-blue-500/20 hover:border-blue-500/40'}
                  ${isAnySelected && !isSelected ? 'opacity-40 hover:opacity-75' : ''}
                  ${shouldHidePrint ? 'not-selected-print' : ''}
                  print:border print:border-black/10 print:bg-white print:text-black print:shadow-none print:opacity-100 print:scale-100 print:w-[50mm] print:h-[25mm]
                `}
              >
                {/* On-screen Checkbox indicator */}
                <div className="absolute top-4 left-4 no-print z-20">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition" />
                  )}
                </div>

                {/* Card Header */}
                <div className="flex items-center justify-between print:mb-0.5 pl-6">
                  <div>
                    <h3 className="font-extrabold text-sm text-white print:text-black print:text-[8px] print:leading-tight">منصة المايسترو</h3>
                    <p className="text-[10px] text-amber-400 print:text-amber-600 font-bold print:text-[7px] print:leading-tight">أ. أحمد راضي كحلة</p>
                  </div>
                  <span className="text-[10px] bg-blue-600/20 text-blue-300 font-mono px-2 py-0.5 rounded print:text-[7px] print:px-1 print:py-0 print:border print:border-blue-600/20 print:text-blue-700 print:bg-blue-50 print:leading-tight">{stu.code}</span>
                </div>

                {/* Card Body */}
                <div className="flex items-center gap-3 my-3 print:my-0.5 print:gap-1.5">
                  <div className="w-28 h-12 bg-white p-1 rounded-lg flex items-center justify-center overflow-hidden print:border print:border-slate-200 print:w-[100px] print:h-[30px] print:p-0.5 flex-shrink-0">
                    <Barcode value={stu.qrCode || stu.code} width={0.8} height={18} />
                  </div>
                  <div className="flex-1 min-w-0 print:text-right">
                    <h4 className="font-bold text-slate-100 print:text-black print:text-[8px] print:leading-tight truncate">{stu.name}</h4>
                    <p className="text-[10px] text-slate-400 print:text-slate-600 print:text-[6.5px] print:leading-tight truncate">{stu.academicStage?.name || '—'}</p>
                  </div>
                </div>

                {/* Card Footer with Quick Print Button */}
                <div className="flex items-center justify-between border-t border-slate-800/80 print:border-slate-200 pt-1.5 print:pt-0.5">
                  <p className="text-[9px] text-slate-600 print:text-slate-400 text-center print:text-[6px] print:leading-none">
                    كود التعريف: {stu.qrCode || stu.code}
                  </p>
                  
                  {/* Quick Print single card button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      printSingleCard(stu.id);
                    }}
                    className="no-print bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-all duration-150 flex items-center gap-1 shadow-md shadow-blue-900/40 cursor-pointer"
                    title="طباعة بطاقة هذا الطالب فقط"
                  >
                    🖨️ طباعة مفردة
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              لا يوجد طلاب يطابقون خيارات البحث والتصفية
            </div>
          )}
        </div>
      )}
    </div>
  );
}
