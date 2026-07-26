'use client';

import { useState } from 'react';

export default function ReportsPage() {
  const [selectedGroup, setSelectedGroup] = useState('جميع المجموعات');

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportExcel = (reportName: string) => {
    const csvContent = `data:text/csv;charset=utf-8,كود الطالب,اسم الطالب,المرحلة,المجموعة,نسبة الحضور / الحالة\n1001,أحمد محمد علي,الثالث الإعدادي,${selectedGroup},96%\n1002,سارة إبراهيم محمود,الثالث الثانوي,${selectedGroup},88%\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportName}_${selectedGroup}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 مركز التقارير والإحصائيات (Reports & Analytics)</h1>
          <p className="text-slate-400 text-sm mt-1">تصدير تقارير الحضور والماليات ودرجات امتحانات الطلاب المروّسة باسم الأستاذ</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">تحديد المجموعة:</label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white rounded-xl text-xs px-3 py-2"
          >
            <option value="جميع المجموعات">جميع المجموعات</option>
            <option value="مجموعة السبت 4:00">مجموعة السبت 4:00</option>
            <option value="مجموعة الأحد 6:00">مجموعة الأحد 6:00</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📑</span>
            <div>
              <h3 className="font-bold text-white">تقرير كشوف الحضور والغياب للمجموعة</h3>
              <p className="text-xs text-slate-400">تصدير كشوف حضور وطباعة كروت مجموعة: <strong className="text-blue-400">{selectedGroup}</strong></p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleExportPDF}
              className="flex-1 py-2.5 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-xl text-xs font-bold hover:bg-rose-600 hover:text-white transition"
            >
              طباعة كشف الحضور / PDF 📄
            </button>
            <button
              onClick={() => handleExportExcel('كشف_حضور')}
              className="flex-1 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition"
            >
              تصدير Excel 📊
            </button>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div>
              <h3 className="font-bold text-white">التقرير المالي والمبالغ المتبقية</h3>
              <p className="text-xs text-slate-400">كشف شامل بالمدفوعات والمبالغ المتبقية للمجموعة المختارة</p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleExportPDF}
              className="flex-1 py-2.5 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-xl text-xs font-bold hover:bg-rose-600 hover:text-white transition"
            >
              طباعة التقرير المالي 📄
            </button>
            <button
              onClick={() => handleExportExcel('التقرير_المالي')}
              className="flex-1 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition"
            >
              تصدير Excel 📊
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


