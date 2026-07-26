'use client';

export default function ArchivePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📦 الأرشيف الدراسي والسنوات المنتهية (Academic Archive)</h1>
          <p className="text-slate-400 text-sm mt-1">التبديل بين السنوات الدراسية المنتهية للرجوع لكافة بيانات الطلاب القديمة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <h3 className="font-bold text-lg text-white">العام الدراسي 2024 / 2025 (مؤرشف)</h3>
          <p className="text-xs text-slate-400">إجمالي الطلاب: 110 طالب • إجمالي الجلسات: 320 حصة</p>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold rounded-xl transition">
            استعراض سجلات هذا العام ←
          </button>
        </div>
      </div>
    </div>
  );
}
