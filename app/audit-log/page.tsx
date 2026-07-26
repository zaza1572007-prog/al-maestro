'use client';

export default function AuditLogPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🛡️ سجل العمليات والأنشطة الأمني (System Audit Log)</h1>
          <p className="text-slate-400 text-sm mt-1">تتبع وتوثيق كافة إجراءات الإضافة والتعديل والحذف وتحديد هوية المستخدم</p>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">اسم المستخدم / المساعد</th>
                <th className="p-3.5">نوع الإجراء</th>
                <th className="p-3.5">الكيان / الطالب</th>
                <th className="p-3.5">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-800/40 transition">
                <td className="p-3.5 font-bold text-white">أحمد المساعد</td>
                <td className="p-3.5 text-emerald-400 font-semibold text-xs">تسجيل حضور QR Code</td>
                <td className="p-3.5 text-slate-200">الطالب أحمد محمد علي</td>
                <td className="p-3.5 text-xs text-slate-400 font-mono">2026-07-24 04:15 PM</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
