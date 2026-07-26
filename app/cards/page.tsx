'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Printer, Users } from 'lucide-react';

interface Student {
  id: string;
  code: string;
  name: string;
  qrCode: string;
  academicStage?: { name: string };
  group?: { name: string; startTime?: string };
}

export default function CardsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stuRes, grpRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/groups'),
      ]);
      const stuData = await stuRes.json();
      const grpData = await grpRes.json();
      setStudents(stuData.students || []);
      setGroups(grpData.groups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = selectedGroupId === 'ALL'
    ? students
    : students.filter((s) => s.group?.name === selectedGroupId || (s as any).groupId === selectedGroupId);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🎴 طباعة بطاقات الطلاب</h1>
          <p className="text-slate-400 text-sm mt-1">توليد بطاقات تعريف QR Code للطلاب الحقيقيين من قاعدة البيانات</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-4 h-4" /> طباعة البطاقات
          </button>
        </div>
      </div>

      {/* Group Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400">تصفية بالمجموعة:</span>
        <button
          onClick={() => setSelectedGroupId('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedGroupId === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          الكل ({students.length})
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGroupId(g.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedGroupId === g.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل بيانات الطلاب...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
          {filtered.map((stu) => (
            <div
              key={stu.id}
              className="w-full bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border-2 border-blue-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between print:break-inside-avoid print:border print:rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-white">منصة المايسترو</h3>
                  <p className="text-[10px] text-amber-400 font-bold">أ. أحمد راضي كحلة</p>
                </div>
                <span className="text-[10px] bg-blue-600 text-white font-mono px-2 py-0.5 rounded">{stu.code}</span>
              </div>

              <div className="flex items-center gap-4 my-3">
                <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center font-mono text-[8px] text-black font-bold text-center leading-tight">
                  {stu.qrCode || stu.code}
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">{stu.name}</h4>
                  <p className="text-[11px] text-slate-400">{stu.academicStage?.name || '—'}</p>
                  <p className="text-[10px] text-slate-400">{stu.group?.name || '—'}</p>
                </div>
              </div>

              <p className="text-[9px] text-slate-600 text-center border-t border-slate-800 pt-1">
                كود التعريف: {stu.qrCode || stu.code} — منصة المايسترو التعليمية
              </p>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              لا يوجد طلاب في هذه المجموعة
            </div>
          )}
        </div>
      )}
    </div>
  );
}
