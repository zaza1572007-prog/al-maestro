'use client';

import { useState, useEffect } from 'react';
import { Archive, Users, CalendarDays, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ArchivePage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Assuming current active year is "2025/2026"
  const activeYear = "2025/2026";
  const archivedGroups = groups.filter(g => g.year && g.year !== activeYear);

  // Group by year
  const archivedByYear = archivedGroups.reduce((acc: any, group: any) => {
    if (!acc[group.year]) acc[group.year] = [];
    acc[group.year].push(group);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Archive className="w-6 h-6 text-slate-400" /> الأرشيف الدراسي والسنوات المنتهية
          </h1>
          <p className="text-slate-400 text-sm mt-1">التبديل بين السنوات الدراسية المنتهية للرجوع لكافة بيانات الطلاب القديمة</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 animate-pulse">جاري تحميل الأرشيف...</div>
      ) : Object.keys(archivedByYear).length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 text-slate-400">
          <Archive className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          لا توجد سنوات دراسية مؤرشفة حالياً. (العام الحالي فقط: {activeYear})
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(archivedByYear).sort().reverse().map(year => {
            const yearGroups = archivedByYear[year];
            const totalStudents = yearGroups.reduce((sum: number, g: any) => sum + (g._count?.students || 0), 0);
            const totalSessions = yearGroups.reduce((sum: number, g: any) => sum + (g._count?.lessonSessions || 0), 0);

            return (
              <div key={year} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-xl text-white">العام الدراسي {year} (مؤرشف)</h3>
                  <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full border border-slate-700">مغلق</span>
                </div>
                
                <div className="flex gap-6 text-sm">
                  <p className="flex items-center gap-2 text-slate-400"><Users className="w-4 h-4 text-blue-400"/> إجمالي الطلاب: <strong className="text-white">{totalStudents}</strong></p>
                  <p className="flex items-center gap-2 text-slate-400"><CalendarDays className="w-4 h-4 text-emerald-400"/> إجمالي الجلسات: <strong className="text-white">{totalSessions}</strong></p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  {yearGroups.map((g: any) => (
                    <div key={g.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-600 transition group cursor-not-allowed">
                      <h4 className="font-bold text-slate-300">{g.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{g.academicStage?.name}</p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800/50">
                        <span className="text-xs text-slate-400">{g._count?.students || 0} طالب</span>
                        <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
