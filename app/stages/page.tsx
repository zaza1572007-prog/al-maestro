'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function StagesPage() {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const stages = [
    {
      id: '1',
      name: 'المرحلة الابتدائية',
      level: 'Primary',
      grades: ['الصف الرابع', 'الصف الخامس', 'الصف السادس'],
      studentsCount: 35,
      groupsCount: 2,
      attendanceRate: '96%',
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    },
    {
      id: '2',
      name: 'المرحلة الإعدادية',
      level: 'Middle',
      grades: ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'],
      studentsCount: 60,
      groupsCount: 3,
      attendanceRate: '92%',
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
    },
    {
      id: '3',
      name: 'المرحلة الثانوية',
      level: 'High',
      grades: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
      studentsCount: 50,
      groupsCount: 3,
      attendanceRate: '94%',
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🎓 المراحل الدراسية (Academic Stages)</h1>
          <p className="text-slate-400 text-sm mt-1">تصفح وإدارة المراحل الابتدائية، الإعدادية، والثانوية وإحصائيات كل مرحلة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stages.map((stage) => (
          <div
            key={stage.id}
            onClick={() => setSelectedStageId(selectedStageId === stage.id ? null : stage.id)}
            className={`bg-gradient-to-b ${stage.color} border rounded-3xl p-6 shadow-xl space-y-4 cursor-pointer hover:scale-[1.02] transition-transform duration-200 ${
              selectedStageId === stage.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <h2 className="text-xl font-extrabold text-white">{stage.name}</h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700">
                {stage.level}
              </span>
            </div>

            {selectedStageId === stage.id ? (
              <div className="space-y-3 py-2 animate-fadeIn">
                <p className="text-xs text-slate-300 font-bold">اختر الصف الدراسي للتوجيه للمجموعات:</p>
                <div className="flex flex-col gap-2">
                  {stage.grades.map((g, i) => (
                    <Link
                      key={i}
                      href={`/groups?grade=${encodeURIComponent(g)}`}
                      className="text-xs bg-slate-950/80 hover:bg-blue-600 hover:text-white px-3 py-2.5 rounded-xl border border-slate-800 transition font-medium text-slate-200 block text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {g} ←
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">الصفوف التعليمية المدعومة:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stage.grades.map((g, i) => (
                      <span key={i} className="text-xs bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-center">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400">إجمالي الطلاب</p>
                    <p className="text-lg font-bold text-white mt-0.5">{stage.studentsCount}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400">عدد المجموعات</p>
                    <p className="text-lg font-bold text-white mt-0.5">{stage.groupsCount}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <span>نسبة الحضور العامة:</span>
                  <span className="font-bold text-emerald-400">{stage.attendanceRate}</span>
                </div>
                <p className="text-[10px] text-blue-400 text-center animate-pulse">اضغط لعرض الصفوف والتوجيه ↵</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

