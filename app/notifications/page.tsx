'use client';

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🔔 مركز التنبيهات الموحد (Notifications)</h1>
          <p className="text-slate-400 text-sm mt-1">عرض الإشعارات والتحذيرات الهامة للنظام</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 bg-slate-900/80 border-r-4 border-amber-500 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-bold text-white text-sm">تنبيه اشتراكات تنتهي قريباً</h4>
              <p className="text-xs text-slate-400">12 طالب تنتهي اشتراكاتهم الشهرية بنهاية هذا الأسبوع</p>
            </div>
          </div>
          <span className="text-xs text-slate-500">اليوم 10:00 ص</span>
        </div>
      </div>
    </div>
  );
}
