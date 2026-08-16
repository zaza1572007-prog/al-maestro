'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params?.id as string;

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!studentId) return;
    async function fetchStudent() {
      setLoading(true);
      try {
        const res = await fetch(`/api/students/${studentId}`);
        const data = await res.json();
        if (data.student) setStudent(data.student);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [studentId]);

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        جارٍ تحميل ملف الطالب...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-xl mb-2">🚫 لم يتم العثور على الطالب</p>
        <Link href="/students" className="text-blue-400 hover:text-blue-300">← العودة لقائمة الطلاب</Link>
      </div>
    );
  }

  const sub = student.subscriptions?.[0];
  const sessionsLeft = sub ? sub.totalSessions - (sub.usedSessions || 0) : 0;
  const parentWaLink = student.parent?.phone
    ? `https://wa.me/20${student.parent.phone.replace(/^0/, '')}?text=${encodeURIComponent(`مرحباً أستاذ ${student.parent?.name}، إفادة بحالة الطالب ${student.name} في منصة المايسترو.`)}`
    : '#';

  const attendanceStats = {
    present: student.attendances?.filter((a: any) => a.status === 'PRESENT').length || 0,
    absent: student.attendances?.filter((a: any) => a.status === 'ABSENT').length || 0,
    late: student.attendances?.filter((a: any) => a.status === 'LATE').length || 0,
    vacation: student.attendances?.filter((a: any) => a.status === 'VACATION').length || 0,
    total: student.attendances?.filter((a: any) => a.status !== 'VACATION').length || 0,
  };
  const attendanceRate = attendanceStats.total > 0 ? Math.round(((attendanceStats.present + attendanceStats.late) / attendanceStats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Profile Info */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg">
            {student.name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-white">{student.name}</h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {student.code}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${sub?.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                {sub?.status === 'ACTIVE' ? 'اشتراك نشط ✓' : sub?.status || 'بدون اشتراك'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {student.academicStage?.name || '—'} • <strong className="text-slate-300">{student.group?.name || '—'}</strong>
            </p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              📞 {student.phone || '—'} • ولي الأمر: {student.parent?.name || '—'} ({student.parent?.phone || '—'})
              {student.parent?.phone && (
                <a
                  href={parentWaLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-md text-[11px] font-bold transition inline-flex items-center gap-1"
                >
                  💬 واتساب
                </a>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">الحصص المتبقية</span>
            <span className="text-xl font-bold text-emerald-400">{sessionsLeft} حصص</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">نسبة الحضور</span>
            <span className={`text-xl font-bold ${attendanceRate >= 75 ? 'text-emerald-400' : attendanceRate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{attendanceRate}%</span>
          </div>
          <Link href="/students" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
            ← العودة
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'نظرة عامة' },
          { id: 'attendance', label: `الحضور (${attendanceStats.total})` },
          { id: 'exams', label: `الامتحانات (${student.examResults?.length || 0})` },
          { id: 'payments', label: `المدفوعات (${student.payments?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500">إجمالي الحضور</p>
            <p className="text-2xl font-black text-emerald-400">{attendanceStats.present}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500">الغياب</p>
            <p className="text-2xl font-black text-rose-400">{attendanceStats.absent}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500">التأخيرات</p>
            <p className="text-2xl font-black text-amber-400">{attendanceStats.late}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500">الإجازات</p>
            <p className="text-2xl font-black text-indigo-400">{attendanceStats.vacation}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500">نسبة الحضور</p>
            <p className={`text-2xl font-black ${attendanceRate >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>{attendanceRate}%</p>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-400">
                <th className="p-3 text-right">الجلسة</th>
                <th className="p-3 text-center">الحالة</th>
                <th className="p-3 text-center">وقت الدخول</th>
                <th className="p-3 text-center">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {(student.attendances || []).map((att: any) => (
                <tr key={att.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                  <td className="p-3 text-right font-semibold text-white">{att.session?.title || '—'}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      att.status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400' :
                      att.status === 'LATE' ? 'bg-amber-500/20 text-amber-400' :
                      att.status === 'VACATION' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                      'bg-rose-500/20 text-rose-400'
                    }`}>
                      {att.status === 'PRESENT' ? 'حاضر' : att.status === 'LATE' ? 'متأخر' : att.status === 'VACATION' ? 'إجازة' : 'غائب'}
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-400">
                    {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="p-3 text-center text-slate-400">
                    {new Date(att.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              ))}
              {(!student.attendances || student.attendances.length === 0) && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">لا توجد سجلات حضور</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'exams' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-400">
                <th className="p-3 text-right">الامتحان</th>
                <th className="p-3 text-center">الدرجة</th>
                <th className="p-3 text-center">من</th>
                <th className="p-3 text-center">النسبة</th>
                <th className="p-3 text-center">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {(student.examResults || []).map((er: any) => {
                const pct = er.exam?.maxScore ? Math.round((er.score / er.exam.maxScore) * 100) : 0;
                return (
                  <tr key={er.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                    <td className="p-3 text-right font-semibold text-white">{er.exam?.title || '—'}</td>
                    <td className="p-3 text-center font-bold text-white">{er.score}</td>
                    <td className="p-3 text-center text-slate-400">{er.exam?.maxScore || '—'}</td>
                    <td className="p-3 text-center">
                      <span className={`font-bold ${pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{pct}%</span>
                    </td>
                    <td className="p-3 text-center text-slate-400">
                      {er.gradedAt ? new Date(er.gradedAt).toLocaleDateString('ar-EG') : '—'}
                    </td>
                  </tr>
                );
              })}
              {(!student.examResults || student.examResults.length === 0) && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">لا توجد نتائج امتحانات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-400">
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-center">المدفوع</th>
                <th className="p-3 text-center">المتبقي</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(student.payments || []).map((p: any) => (
                <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                  <td className="p-3 text-right text-white">{new Date(p.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td className="p-3 text-center font-bold text-emerald-400">{p.paidAmount} ج.م</td>
                  <td className="p-3 text-center font-bold text-rose-400">{p.remainingAmount} ج.م</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.remainingAmount === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {p.remainingAmount === 0 ? 'مسدّد ✓' : 'مستحق'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!student.payments || student.payments.length === 0) && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">لا توجد مدفوعات مسجلة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
