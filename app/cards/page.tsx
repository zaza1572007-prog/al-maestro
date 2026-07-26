'use client';

import { useState } from 'react';

export default function CardsPage() {
  const [selectedFormat, setSelectedFormat] = useState('A4');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🎴 نظام طباعة بطاقات الطلاب (Student QR Cards)</h1>
          <p className="text-slate-400 text-sm mt-1">توليد ملفات PDF جاهزة لطباعة بطاقات التعريف والـ QR Code فردياً أو للمجموعات</p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <span>🖨️</span> بدء تصدير وطباعة البطاقات
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Printable Card Mockup */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="font-bold text-white border-b border-slate-800 pb-3">معاينة بطاقة الطالب المطبوعة</h2>
          <div className="w-80 h-48 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border-2 border-blue-500/40 rounded-2xl p-4 shadow-2xl relative flex flex-col justify-between mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-white">منصة المايسترو</h3>
                <p className="text-[10px] text-amber-400 font-bold">أ. أحمد راضي كحلة</p>
              </div>
              <span className="text-[10px] bg-blue-600 text-white font-mono px-2 py-0.5 rounded">STU-1001</span>
            </div>

            <div className="flex items-center gap-4 my-auto">
              <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center font-mono text-[10px] text-black font-bold text-center">
                QR CODE DEMO
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">أحمد محمد علي</h4>
                <p className="text-[11px] text-slate-400">الثالث الإعدادي</p>
                <p className="text-[10px] text-slate-400">مجموعة السبت 4:00</p>
              </div>
            </div>

            <div className="text-[9px] text-slate-500 border-t border-slate-800 pt-1 flex justify-between">
              <span>كود الطالب المعتمد للحضور</span>
              <span>رقم ولي الأمر: 01198765432</span>
            </div>
          </div>
        </div>

        {/* Print Settings */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="font-bold text-white border-b border-slate-800 pb-3">خيارات القياس والطباعة</h2>
          <div className="space-y-3 text-xs">
            <label className="block text-slate-300 font-semibold">نوع المقاس الورقي:</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="fmt"
                  checked={selectedFormat === 'A4'}
                  onChange={() => setSelectedFormat('A4')}
                />
                <span className="text-slate-200">ورق A4 متعدد البطاقات (8 بطاقات في الصفحة)</span>
              </label>
              <label className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="fmt"
                  checked={selectedFormat === 'PVC'}
                  onChange={() => setSelectedFormat('PVC')}
                />
                <span className="text-slate-200">بطاقة بلاستيكية PVC مقاس كارت فردي</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

