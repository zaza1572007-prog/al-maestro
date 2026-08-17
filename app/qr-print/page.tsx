'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Printer, Users, CheckSquare, Square, QrCode, GraduationCap } from 'lucide-react';

interface Student {
  id: string;
  code: string;
  name: string;
  qrCode: string;
  academicStage?: { name: string };
  group?: { name: string };
}

interface Parent {
  id: string;
  name: string;
  phone: string;
  qrCode: string | null;
  relation: string;
  students?: { name: string }[];
}

type Tab = 'students' | 'parents';

export default function QrPrintPage() {
  const [tab, setTab] = useState<Tab>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const [stuRes, parRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/parents'),
      ]);
      const stuData = await stuRes.json();
      const parData = await parRes.json();
      setStudents(stuData.students || []);
      setParents(parData.parents || parData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredStudents = students.filter((s) =>
    searchQuery.trim() === '' ? true : s.name.includes(searchQuery) || s.code.includes(searchQuery)
  );

  const filteredParents = parents.filter((p) =>
    searchQuery.trim() === '' ? true : p.name.includes(searchQuery) || p.phone.includes(searchQuery)
  );

  const currentList = tab === 'students' ? filteredStudents : filteredParents;

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map((item) => item.id)));
    }
  };

  const handlePrint = () => window.print();

  const printSingle = (id: string) => {
    const prev = new Set(selectedIds);
    setSelectedIds(new Set([id]));
    setTimeout(() => {
      window.print();
      setSelectedIds(prev);
    }, 150);
  };

  const getQrValue = (qrCode: string) =>
    `${baseUrl}/qr-login?token=${encodeURIComponent(qrCode)}`;

  return (
    <div className="space-y-6">
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, header, aside, button, .flex-wrap, .absolute-print-hide {
            display: none !important;
          }
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
            size: 38mm 25mm;
            margin: 0;
          }
          .qr-card {
            width: 38mm !important;
            height: 25mm !important;
            max-width: 38mm !important;
            max-height: 25mm !important;
            min-width: 38mm !important;
            min-height: 25mm !important;
            padding: 0.8mm 1mm !important;
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
            flex-direction: row !important;
            align-items: center !important;
            gap: 1.5mm !important;
            overflow: hidden !important;
          }
          .qr-card-not-selected {
            display: none !important;
          }
          .qr-card-info {
            flex: 1 !important;
            min-width: 0 !important;
          }
          .qr-card-info h4 {
            font-size: 7px !important;
            line-height: 1.2 !important;
            font-weight: 800 !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          .qr-card-info p {
            font-size: 6px !important;
            line-height: 1.2 !important;
          }
          .qr-svg-wrap svg {
            width: 19mm !important;
            height: 19mm !important;
          }
        }
      `}} />

      {/* Page Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-white">📲 طباعة QR</h1>
          <p className="text-slate-400 text-sm mt-1">
            رموز QR للطلاب وأولياء الأمور — مسح الرمز يُسجّل الدخول تلقائياً
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> طباعة الكل ({currentList.length})
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print flex gap-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-1.5 w-fit">
        <button
          onClick={() => { setTab('students'); setSelectedIds(new Set()); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
            tab === 'students'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          الطلاب
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'students' ? 'bg-blue-500/40' : 'bg-slate-700'}`}>
            {students.length}
          </span>
        </button>
        <button
          onClick={() => { setTab('parents'); setSelectedIds(new Set()); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
            tab === 'parents'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          أولياء الأمور
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'parents' ? 'bg-purple-500/40' : 'bg-slate-700'}`}>
            {parents.length}
          </span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="no-print bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <input
            type="text"
            placeholder={tab === 'students' ? '🔍 ابحث باسم الطالب أو الكود...' : '🔍 ابحث باسم ولي الأمر أو رقم الهاتف...'}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedIds(new Set()); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 flex-1 min-w-[240px]"
          />
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button
              onClick={toggleSelectAll}
              disabled={currentList.length === 0}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {selectedIds.size === currentList.length && currentList.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
            <button
              disabled={selectedIds.size === 0}
              onClick={handlePrint}
              className={`px-5 py-2.5 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg cursor-pointer ${
                tab === 'students'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                  : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
              }`}
            >
              <Printer className="w-4 h-4" /> طباعة المحددة ({selectedIds.size})
            </button>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex justify-between items-center bg-blue-950/20 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-blue-300">
            <span>💡 تم تحديد {selectedIds.size} عنصر للطباعة.</span>
            <button onClick={() => setSelectedIds(new Set())} className="underline font-bold hover:text-blue-100 cursor-pointer">إلغاء التحديد ❌</button>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل البيانات...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 print:block print:w-full print:p-0">
          {/* STUDENT CARDS */}
          {tab === 'students' && filteredStudents.map((stu) => {
            const isSelected = selectedIds.has(stu.id);
            const isAnySelected = selectedIds.size > 0;
            const shouldHidePrint = isAnySelected && !isSelected;
            const qrVal = baseUrl ? getQrValue(stu.qrCode) : stu.qrCode;

            return (
              <div
                key={stu.id}
                onClick={() => toggleSelection(stu.id)}
                className={`qr-card relative w-full bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border-2 rounded-2xl p-4 shadow-xl flex flex-row items-center gap-4 transition-all duration-200 cursor-pointer group select-none
                  ${isSelected ? 'border-blue-500 shadow-blue-950/30 scale-[1.01]' : 'border-blue-500/20 hover:border-blue-500/40'}
                  ${isAnySelected && !isSelected ? 'opacity-40 hover:opacity-75' : ''}
                  ${shouldHidePrint ? 'qr-card-not-selected' : ''}
                  print:border print:border-black/10 print:bg-white print:text-black print:shadow-none print:opacity-100 print:scale-100
                `}
              >
                {/* Checkbox */}
                <div className="absolute top-3 left-3 no-print z-20">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition" />
                  )}
                </div>

                {/* QR Code */}
                <div className="qr-svg-wrap bg-white rounded-xl p-1.5 flex-shrink-0 shadow-sm print:p-0.5 print:rounded-sm">
                  <QRCodeSVG
                    value={qrVal}
                    size={90}
                    level="M"
                    includeMargin={false}
                    className="block"
                  />
                </div>

                {/* Info */}
                <div className="qr-card-info flex-1 min-w-0 pl-2 print:pl-0">
                  <div className="mb-1">
                    <p className="text-[9px] text-blue-400 print:text-blue-600 font-bold print:text-[6px] uppercase tracking-wide">طالب</p>
                    <h4 className="font-extrabold text-sm text-white print:text-black print:text-[7px] leading-tight truncate">{stu.name}</h4>
                    <p className="text-[10px] text-slate-400 print:text-slate-600 print:text-[6px] truncate">{stu.academicStage?.name || '—'}</p>
                    <p className="text-[10px] text-slate-500 print:text-slate-500 print:text-[6px] truncate">{stu.group?.name || '—'}</p>
                  </div>
                  <div className="mt-1">
                    <span className="text-[9px] bg-blue-600/20 text-blue-300 font-mono px-1.5 py-0.5 rounded print:text-[5.5px] print:px-1 print:py-0 print:border print:border-blue-600/20 print:text-blue-700 print:bg-blue-50">
                      {stu.code}
                    </span>
                  </div>
                  <p className="text-[8px] text-slate-600 print:text-slate-400 mt-1 print:text-[5px]">منصة المايسترو</p>
                </div>

                {/* Quick Print */}
                <button
                  onClick={(e) => { e.stopPropagation(); printSingle(stu.id); }}
                  className="no-print absolute bottom-3 left-3 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1 shadow cursor-pointer"
                >
                  🖨️
                </button>
              </div>
            );
          })}

          {/* PARENT CARDS */}
          {tab === 'parents' && filteredParents.map((par) => {
            const isSelected = selectedIds.has(par.id);
            const isAnySelected = selectedIds.size > 0;
            const shouldHidePrint = isAnySelected && !isSelected;
            const qrVal = par.qrCode
              ? (baseUrl ? getQrValue(par.qrCode) : par.qrCode)
              : '';

            return (
              <div
                key={par.id}
                onClick={() => { if (par.qrCode) toggleSelection(par.id); }}
                className={`qr-card relative w-full bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950 border-2 rounded-2xl p-4 shadow-xl flex flex-row items-center gap-4 transition-all duration-200 select-none
                  ${par.qrCode ? 'cursor-pointer group' : 'cursor-not-allowed opacity-60'}
                  ${isSelected ? 'border-purple-500 shadow-purple-950/30 scale-[1.01]' : 'border-purple-500/20 hover:border-purple-500/40'}
                  ${isAnySelected && !isSelected ? 'opacity-40 hover:opacity-75' : ''}
                  ${shouldHidePrint ? 'qr-card-not-selected' : ''}
                  print:border print:border-black/10 print:bg-white print:text-black print:shadow-none print:opacity-100 print:scale-100
                `}
              >
                {/* Checkbox */}
                <div className="absolute top-3 left-3 no-print z-20">
                  {par.qrCode ? (
                    isSelected ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition" />
                    )
                  ) : (
                    <span className="text-[9px] text-red-400 font-bold">بدون QR</span>
                  )}
                </div>

                {/* QR Code */}
                <div className="qr-svg-wrap bg-white rounded-xl p-1.5 flex-shrink-0 shadow-sm print:p-0.5 print:rounded-sm">
                  {par.qrCode ? (
                    <QRCodeSVG
                      value={qrVal}
                      size={90}
                      level="M"
                      includeMargin={false}
                      className="block"
                    />
                  ) : (
                    <div className="w-[90px] h-[90px] flex items-center justify-center bg-slate-100 rounded-lg">
                      <QrCode className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="qr-card-info flex-1 min-w-0 pl-2 print:pl-0">
                  <div className="mb-1">
                    <p className="text-[9px] text-purple-400 print:text-purple-600 font-bold print:text-[6px] uppercase tracking-wide">ولي أمر</p>
                    <h4 className="font-extrabold text-sm text-white print:text-black print:text-[7px] leading-tight truncate">{par.name}</h4>
                    <p className="text-[10px] text-slate-400 print:text-slate-600 print:text-[6px] truncate">{par.phone}</p>
                    {par.students && par.students.length > 0 && (
                      <p className="text-[9px] text-slate-500 print:text-slate-500 print:text-[5.5px] truncate">
                        👧 {par.students.map(s => s.name).join(' — ')}
                      </p>
                    )}
                  </div>
                  <p className="text-[8px] text-slate-600 print:text-slate-400 mt-1 print:text-[5px]">منصة المايسترو</p>
                </div>

                {/* Quick Print */}
                {par.qrCode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); printSingle(par.id); }}
                    className="no-print absolute bottom-3 left-3 bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1 shadow cursor-pointer"
                  >
                    🖨️
                  </button>
                )}
              </div>
            );
          })}

          {/* Empty State */}
          {currentList.length === 0 && (
            <div className="col-span-4 text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
              لا توجد نتائج تطابق البحث
            </div>
          )}
        </div>
      )}
    </div>
  );
}
