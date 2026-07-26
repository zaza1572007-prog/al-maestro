'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, BookOpen, Calendar, Award, Pencil, Trash2 } from 'lucide-react';

interface Student { id: string; name: string; code: string; }
interface ExamResult { score: number; percentage: number; student: Student; }
interface Exam {
  id: string;
  title: string;
  description?: string;
  group: { id: string; name: string };
  examDate: string;
  type: string;
  maxScore: number;
  results: ExamResult[];
}
interface Group { id: string; name: string; }

const typeLabels: Record<string, string> = {
  QUIZ: 'اختبار قصير', WEEKLY: 'أسبوعي', MONTHLY: 'شهري',
  MIDTERM: 'نصف الفصل', FINAL: 'نهائي', PLACEMENT: 'تحديد مستوى',
};
const typeColors: Record<string, string> = {
  QUIZ: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  WEEKLY: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  MONTHLY: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  MIDTERM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  FINAL: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  PLACEMENT: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Grades entry panel
  const [gradingExam, setGradingExam] = useState<Exam | null>(null);
  const [groupStudents, setGroupStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [isSavingGrades, setIsSavingGrades] = useState(false);

  const [newExam, setNewExam] = useState({
    title: '', description: '', groupId: '',
    examDate: new Date().toISOString().split('T')[0], type: 'MONTHLY', maxScore: 100,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examRes, grpRes] = await Promise.all([fetch('/api/exams'), fetch('/api/groups')]);
      const examData = await examRes.json();
      const grpData = await grpRes.json();
      if (examData.success) setExams(examData.exams || []);
      if (grpData.success || grpData.groups) setGroups(grpData.groups || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExam),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setIsAddingExam(false);
        setNewExam({ title: '', description: '', groupId: '', examDate: new Date().toISOString().split('T')[0], type: 'MONTHLY', maxScore: 100 });
      } else { alert(data.error || 'حدث خطأ'); }
    } catch { alert('تعذّر الاتصال بالخادم'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteExam = async (id: string, title: string) => {
    if (!confirm(`حذف امتحان "${title}"؟`)) return;
    const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchData();
    else alert(data.error || 'خطأ في الحذف');
  };

  const openGrading = async (exam: Exam) => {
    setGradingExam(exam);
    // Pre-fill existing scores
    const existing: Record<string, string> = {};
    exam.results.forEach((r) => { existing[r.student.id] = String(r.score); });
    // Fetch group students
    const res = await fetch(`/api/students?groupId=${exam.group.id}`);
    const data = await res.json();
    const studs: Student[] = data.students || [];
    setGroupStudents(studs);
    // Merge existing grades with empty entries
    studs.forEach((s) => { if (!existing[s.id]) existing[s.id] = ''; });
    setGrades(existing);
  };

  const handleSaveGrades = async () => {
    if (!gradingExam) return;
    setIsSavingGrades(true);
    const entries = Object.entries(grades).filter(([, v]) => v !== '' && !isNaN(Number(v)));
    try {
      await Promise.all(entries.map(([studentId, score]) =>
        fetch('/api/exam-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId: gradingExam.id, studentId, score: parseFloat(score) }),
        })
      ));
      await fetchData();
      setGradingExam(null);
    } catch { alert('حدث خطأ أثناء حفظ الدرجات'); }
    finally { setIsSavingGrades(false); }
  };

  const getStats = (exam: Exam) => {
    if (!exam.results || exam.results.length === 0) return null;
    const scores = exam.results.map((r) => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { avg: avg.toFixed(1), high: Math.max(...scores), low: Math.min(...scores), count: scores.length };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📝 الامتحانات والاختبارات</h1>
          <p className="text-slate-400 text-sm mt-1">إنشاء وإدارة الامتحانات ورصد درجات الطلاب من قاعدة البيانات</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAddingExam(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-purple-600/20"
          >
            <Plus className="w-4 h-4" /> إضافة امتحان
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
          جارٍ تحميل الامتحانات...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => {
            const stats = getStats(exam);
            return (
              <div key={exam.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${typeColors[exam.type] || ''}`}>
                      {typeLabels[exam.type] || exam.type}
                    </span>
                    <h3 className="font-bold text-white text-base mt-1">{exam.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openGrading(exam)}
                      className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg text-xs transition"
                      title="إدخال الدرجات"
                    >
                      <Award className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      className="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-xs transition"
                      title="حذف الامتحان"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{exam.group?.name}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(exam.examDate).toLocaleDateString('ar-EG')}</span>
                  <span>الدرجة من: {exam.maxScore}</span>
                </div>

                {stats ? (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <p className="text-slate-400">المتوسط</p>
                      <p className="font-black text-white mt-1">{stats.avg}</p>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <p className="text-slate-400">الأعلى</p>
                      <p className="font-black text-emerald-400 mt-1">{stats.high}</p>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <p className="text-slate-400">الأدنى</p>
                      <p className="font-black text-rose-400 mt-1">{stats.low}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 italic">لا توجد درجات مسجلة بعد</p>
                    <button
                      onClick={() => openGrading(exam)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                    >
                      ابدأ رصد الدرجات ←
                    </button>
                  </div>
                )}

                {/* Results mini list */}
                {exam.results.length > 0 && (
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {exam.results.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-950/60 rounded-lg px-3 py-1.5">
                        <span className="text-slate-300">{r.student.name}</span>
                        <span className={`font-black ${r.percentage >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {r.score} / {exam.maxScore}
                          <span className="text-slate-500 font-normal mr-1">({r.percentage.toFixed(0)}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {exams.length === 0 && (
            <div className="col-span-2 text-center py-16 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              لا توجد امتحانات مسجلة. اضغط "إضافة امتحان" للبدء
            </div>
          )}
        </div>
      )}

      {/* Add Exam Modal */}
      {isAddingExam && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">📝 إضافة امتحان جديد</h3>
              <button onClick={() => setIsAddingExam(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateExam} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-300 mb-1 text-xs">عنوان الامتحان *</label>
                <input type="text" required placeholder="مثال: اختبار شهر يوليو في الجبر"
                  value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-xs">المجموعة *</label>
                <select required value={newExam.groupId}
                  onChange={(e) => setNewExam({ ...newExam, groupId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm">
                  <option value="">اختر المجموعة...</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">تاريخ الامتحان</label>
                  <input type="date" value={newExam.examDate}
                    onChange={(e) => setNewExam({ ...newExam, examDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">نوع الامتحان</label>
                  <select value={newExam.type} onChange={(e) => setNewExam({ ...newExam, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm">
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1 text-xs">الدرجة القصوى</label>
                <input type="number" min={1} max={1000} value={newExam.maxScore}
                  onChange={(e) => setNewExam({ ...newExam, maxScore: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddingExam(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm">إلغاء</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg text-sm">
                  {isSaving ? 'جاري الحفظ...' : 'إضافة الامتحان ➕'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingExam && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">🏅 رصد الدرجات: {gradingExam.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">الدرجة من {gradingExam.maxScore} | المجموعة: {gradingExam.group.name}</p>
              </div>
              <button onClick={() => setGradingExam(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {groupStudents.length === 0 && (
                <p className="text-center text-slate-500 py-8">لا يوجد طلاب في هذه المجموعة</p>
              )}
              {groupStudents.map((stu) => (
                <div key={stu.id} className="flex items-center gap-3 bg-slate-950 rounded-xl px-4 py-2.5 border border-slate-800">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{stu.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{stu.code}</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={gradingExam.maxScore}
                    step="0.5"
                    placeholder={`/ ${gradingExam.maxScore}`}
                    value={grades[stu.id] || ''}
                    onChange={(e) => setGrades({ ...grades, [stu.id]: e.target.value })}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm text-center focus:border-purple-500 focus:outline-none"
                  />
                  {grades[stu.id] && (
                    <span className={`text-xs font-bold w-10 text-center ${
                      (parseFloat(grades[stu.id]) / gradingExam.maxScore) * 100 >= 60
                        ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {((parseFloat(grades[stu.id]) / gradingExam.maxScore) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setGradingExam(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm">إلغاء</button>
              <button
                onClick={handleSaveGrades}
                disabled={isSavingGrades}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg text-sm"
              >
                {isSavingGrades ? 'جاري الحفظ...' : 'حفظ الدرجات ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
