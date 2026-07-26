'use client';

import { useState } from 'react';

export default function CalendarPage() {
  const [events] = useState([
    { id: '1', title: 'مجموعة السبت 4:00 مساءً', date: '2026-07-25', time: '04:00 م - 06:00 م', type: 'SESSION', room: 'القاعة (1)' },
    { id: '2', title: 'اختبار شهر يوليو - الجبر', date: '2026-07-26', time: '06:00 م - 08:00 م', type: 'EXAM', room: 'القاعة الرئيسية' },
    { id: '3', title: 'مجموعة الأحد والأربعاء', date: '2026-07-27', time: '06:00 م - 08:00 م', type: 'SESSION', room: 'القاعة الرئيسية' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🗓️ التقويم الدراسي للأستاذ (Academic Calendar)</h1>
          <p className="text-slate-400 text-sm mt-1">عرض الجلسات القادمة، مواعيد الامتحانات، وانتهاء الاشتراكات بشكل تفاعلي</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white border-b border-slate-800 pb-3">جدول الحصص والامتحانات القادمة</h3>
          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{ev.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{ev.time} • <strong className="text-blue-400">{ev.room}</strong></p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${ev.type === 'EXAM' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                  {ev.type === 'EXAM' ? 'اختبار 📝' : 'درس / حصة 📅'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-center">
          <div className="text-4xl">📆</div>
          <h3 className="font-bold text-white">ملخص أيام العمل الأسبوعية</h3>
          <div className="text-xs text-slate-400 space-y-2 pt-2 text-right">
            <p className="p-2 bg-slate-950 rounded-xl border border-slate-800">السبت والإثنين: مجموعة 4:00 مساءً</p>
            <p className="p-2 bg-slate-950 rounded-xl border border-slate-800">الأحد والأربعاء: مجموعة 6:00 مساءً</p>
          </div>
        </div>
      </div>
    </div>
  );
}

