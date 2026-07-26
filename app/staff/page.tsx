'use client';

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">⏰ حضور وتوقيت الموظفين والمساعدين (Staff Time Tracking)</h1>
          <p className="text-slate-400 text-sm mt-1">تسجيل وتتبع ساعات حضور وانصراف الأستاذ والمساعدين لضبط بيئة العمل</p>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">اسم المساعد / الموظف</th>
                <th className="p-3.5">توقيت الحضور</th>
                <th className="p-3.5">توقيت الانصراف</th>
                <th className="p-3.5">إجمالي ساعات اليوم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-800/40 transition">
                <td className="p-3.5 font-bold text-white">أحمد الإداري</td>
                <td className="p-3.5 text-xs text-emerald-400 font-mono">03:30 PM</td>
                <td className="p-3.5 text-xs text-slate-400 font-mono">08:30 PM</td>
                <td className="p-3.5 text-slate-200 font-bold">5 ساعات</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
