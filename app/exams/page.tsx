'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Plus,
  BookOpen,
  Calendar,
  Award,
  Trash2,
  Search,
  GraduationCap,
  Users,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  CheckCircle2,
  Sparkles,
  Layers,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  code: string;
}

interface ExamResult {
  score: number;
  percentage: number;
  student: Student;
}

interface AcademicStage {
  id: string;
  name: string;
  level?: string;
  grade?: string;
}

interface Group {
  id: string;
  name: string;
  academicStageId?: string | null;
  academicStage?: AcademicStage | null;
  scheduleDays?: string[];
  startTime?: string;
  endTime?: string;
  _count?: { students?: number; lessonSessions?: number };
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  groupId?: string;
  group: {
    id: string;
    name: string;
    academicStageId?: string | null;
    academicStage?: AcademicStage | null;
    _count?: { students?: number };
  };
  examDate: string;
  type: string;
  maxScore: number;
  results: ExamResult[];
}

interface Stage {
  id: string;
  name: string;
  level: string;
  grade: string;
}

const typeLabels: Record<string, string> = {
  QUIZ: 'اختبار قصير',
  WEEKLY: 'أسبوعي',
  MONTHLY: 'شهري',
  MIDTERM: 'نصف الفصل',
  FINAL: 'نهائي',
  PLACEMENT: 'تحديد مستوى',
};

const typeColors: Record<string, string> = {
  QUIZ: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  WEEKLY: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  MONTHLY: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  MIDTERM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  FINAL: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  PLACEMENT: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const levelBadgeColors: Record<string, string> = {
  Primary: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
  Middle: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
  High: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
};

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [activeStageId, setActiveStageId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Modals
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preselectedStageId, setPreselectedStageId] = useState<string>('');

  // Grades entry panel
  const [gradingExam, setGradingExam] = useState<Exam | null>(null);
  const [groupStudents, setGroupStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [gradingSearchQuery, setGradingSearchQuery] = useState('');

  const [newExam, setNewExam] = useState({
    title: '',
    description: '',
    groupId: '',
    examDate: new Date().toISOString().split('T')[0],
    type: 'MONTHLY',
    maxScore: 100,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examRes, grpRes, stageRes] = await Promise.all([
        fetch('/api/exams'),
        fetch('/api/groups'),
        fetch('/api/stages'),
      ]);
      const examData = await examRes.json();
      const grpData = await grpRes.json();
      const stageData = await stageRes.json();

      if (examData.success) setExams(examData.exams || []);
      if (grpData.success || grpData.groups) setGroups(grpData.groups || []);
      if (stageData.success || stageData.stages) setStages(stageData.stages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.groupId) {
      alert('الرجاء اختيار المجموعة التعليمية');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExam),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setIsAddingExam(false);
        setNewExam({
          title: '',
          description: '',
          groupId: '',
          examDate: new Date().toISOString().split('T')[0],
          type: 'MONTHLY',
          maxScore: 100,
        });
      } else {
        alert(data.error || 'حدث خطأ أثناء إضافة الامتحان');
      }
    } catch {
      alert('تعذّر الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  const openAddExamForGroup = (groupId: string, stageId?: string) => {
    setNewExam({
      title: '',
      description: '',
      groupId,
      examDate: new Date().toISOString().split('T')[0],
      type: 'MONTHLY',
      maxScore: 100,
    });
    if (stageId) setPreselectedStageId(stageId);
    setIsAddingExam(true);
  };

  const handleDeleteExam = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف امتحان "${title}"؟`)) return;
    try {
      const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.error || 'خطأ في حذف الامتحان');
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const openGrading = async (exam: Exam) => {
    setGradingExam(exam);
    setGradingSearchQuery('');
    const existing: Record<string, string> = {};
    exam.results?.forEach((r) => {
      if (r?.student?.id) existing[r.student.id] = String(r.score);
    });

    const targetGroupId = exam.group?.id || exam.groupId;
    try {
      const res = await fetch(`/api/students?groupId=${targetGroupId}`);
      const data = await res.json();
      const studs: Student[] = data.students || [];
      setGroupStudents(studs);
      studs.forEach((s) => {
        if (existing[s.id] === undefined) existing[s.id] = '';
      });
      setGrades(existing);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGrades = async () => {
    if (!gradingExam) return;
    setIsSavingGrades(true);
    const entries = Object.entries(grades).filter(
      ([, v]) => v !== '' && !isNaN(Number(v)) && Number(v) >= 0
    );
    try {
      await Promise.all(
        entries.map(([studentId, score]) =>
          fetch('/api/exam-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              examId: gradingExam.id,
              studentId,
              score: parseFloat(score),
            }),
          })
        )
      );
      await fetchData();
      setGradingExam(null);
    } catch {
      alert('حدث خطأ أثناء حفظ الدرجات');
    } finally {
      setIsSavingGrades(false);
    }
  };

  const getStats = (exam: Exam) => {
    if (!exam.results || exam.results.length === 0) return null;
    const scores = exam.results.map((r) => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      avg: avg.toFixed(1),
      high: Math.max(...scores),
      low: Math.min(...scores),
      count: scores.length,
    };
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Structured Hierarchy: Stages -> Groups -> Exams
  const hierarchyData = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();

    // Map all exams by groupId
    const examsByGroupId = new Map<string, Exam[]>();
    exams.forEach((exam) => {
      const gId = exam.group?.id || exam.groupId || 'unknown';
      if (!examsByGroupId.has(gId)) examsByGroupId.set(gId, []);
      examsByGroupId.get(gId)!.push(exam);
    });

    // Known stages from stages API & from groups
    const stageMap = new Map<string, { stage: Stage; groups: Array<{ group: Group; exams: Exam[] }> }>();

    stages.forEach((st) => {
      stageMap.set(st.id, { stage: st, groups: [] });
    });

    // Populate groups into stages
    const unassignedGroups: Array<{ group: Group; exams: Exam[] }> = [];

    groups.forEach((grp) => {
      let grpExams = examsByGroupId.get(grp.id) || [];

      // Filter by type & search query
      if (selectedType !== 'ALL') {
        grpExams = grpExams.filter((e) => e.type === selectedType);
      }
      if (q) {
        grpExams = grpExams.filter(
          (e) =>
            (e.title || '').toLowerCase().includes(q) ||
            (grp.name || '').toLowerCase().includes(q) ||
            (grp.academicStage?.name || '').toLowerCase().includes(q) ||
            (e.description || '').toLowerCase().includes(q) ||
            e.results?.some((r) => (r.student?.name || '').toLowerCase().includes(q))
        );
      }

      const stageId = grp.academicStageId || grp.academicStage?.id;
      if (stageId && stageMap.has(stageId)) {
        stageMap.get(stageId)!.groups.push({ group: grp, exams: grpExams });
      } else {
        unassignedGroups.push({ group: grp, exams: grpExams });
      }
    });

    // Check for any orphaned exams whose group was deleted or not in groups list
    const knownGroupIds = new Set(groups.map((g) => g.id));
    const orphanedExams = exams.filter((e) => {
      const gId = e.group?.id || e.groupId || '';
      return !knownGroupIds.has(gId);
    });

    if (orphanedExams.length > 0) {
      let filteredOrphans = orphanedExams;
      if (selectedType !== 'ALL') filteredOrphans = filteredOrphans.filter((e) => e.type === selectedType);
      if (q) {
        filteredOrphans = filteredOrphans.filter(
          (e) =>
            (e.title || '').toLowerCase().includes(q) ||
            (e.group?.name || '').toLowerCase().includes(q)
        );
      }
      if (filteredOrphans.length > 0) {
        unassignedGroups.push({
          group: {
            id: 'orphaned',
            name: 'امتحانات سابقة / مجموعات أخرى',
            academicStage: { id: 'other', name: 'أخرى' },
          },
          exams: filteredOrphans,
        });
      }
    }

    const structuredStages = Array.from(stageMap.values()).filter((item) => {
      // If filtering by stageId
      if (activeStageId !== 'ALL' && item.stage.id !== activeStageId) return false;
      // If search query is active, only show stage if it matches or has matching groups/exams
      if (q) {
        const stageMatches = (item.stage.name || '').toLowerCase().includes(q);
        const hasMatchingExams = item.groups.some((g) => g.exams.length > 0);
        return stageMatches || hasMatchingExams;
      }
      return true;
    });

    return {
      stages: structuredStages,
      unassigned: activeStageId === 'ALL' || activeStageId === 'UNASSIGNED' ? unassignedGroups : [],
    };
  }, [exams, groups, stages, activeStageId, searchQuery, selectedType]);

  const totalExamsCount = exams.length;
  const totalGradedCount = exams.reduce((acc, e) => acc + (e.results?.length || 0), 0);

  // Group selection list for Add Modal filtered by preselected stage
  const availableGroupsForModal = useMemo(() => {
    if (!preselectedStageId) return groups;
    return groups.filter(
      (g) => g.academicStageId === preselectedStageId || g.academicStage?.id === preselectedStageId
    );
  }, [groups, preselectedStageId]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
              📝
            </span>
            الامتحانات والاختبارات
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            إدارة الامتحانات ورصد درجات الطلاب مقسمة ومنظمة حسب المراحل والمجموعات التعليمية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="تحديث البيانات"
            className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-2xl transition border border-slate-700/50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setPreselectedStageId('');
              setNewExam({
                title: '',
                description: '',
                groupId: groups[0]?.id || '',
                examDate: new Date().toISOString().split('T')[0],
                type: 'MONTHLY',
                maxScore: 100,
              });
              setIsAddingExam(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-purple-600/25"
          >
            <Plus className="w-4 h-4" /> إضافة امتحان جديد
          </button>
        </div>
      </div>

      {/* Top Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">إجمالي الامتحانات</span>
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{totalExamsCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">امتحان مسجل بالنظام</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">المراحل الدراسية</span>
            <GraduationCap className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{stages.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">مرحلة تعليمية</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">المجموعات</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{groups.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">مجموعة نشطة</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">الدرجات المرصودة</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{totalGradedCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">نتيجة مسجلة للطلاب</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="البحث باسم الامتحان، المجموعة، المرحلة، أو الطالب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/70 rounded-2xl pr-10 pl-9 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          {/* Exam Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-400 ml-1 flex-shrink-0 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> النوع:
            </span>
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                selectedType === 'ALL'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50'
              }`}
            >
              الكل
            </button>
            {Object.entries(typeLabels).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSelectedType(selectedType === k ? 'ALL' : k)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                  selectedType === k
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Academic Stage Tabs */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 ml-1 flex-shrink-0 flex items-center gap-1">
            <GraduationCap className="w-4 h-4 text-purple-400" /> تصفية بالمرحلة:
          </span>
          <button
            onClick={() => setActiveStageId('ALL')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0 ${
              activeStageId === 'ALL'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🌟 جميع المراحل</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[10px] text-purple-300 font-mono">
              {totalExamsCount}
            </span>
          </button>
          {stages.map((st) => {
            const stageExamsCount = exams.filter(
              (e) => e.group?.academicStageId === st.id || e.group?.academicStage?.id === st.id
            ).length;
            return (
              <button
                key={st.id}
                onClick={() => setActiveStageId(st.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0 ${
                  activeStageId === st.id
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>🎓 {st.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[10px] text-slate-300 font-mono">
                  {stageExamsCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Hierarchical Content */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 space-y-3">
          <div className="animate-spin w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold">جارٍ تنظيم الامتحانات والمجموعات الدراسية...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Loop Stages */}
          {hierarchyData.stages.map(({ stage, groups: stageGroups }) => {
            const totalStageExams = stageGroups.reduce((acc, g) => acc + g.exams.length, 0);

            return (
              <div
                key={stage.id}
                className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-2xl space-y-5"
              >
                {/* Stage Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center border border-purple-500/30 text-purple-400">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white">{stage.name}</h2>
                        {stage.level && (
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${
                              levelBadgeColors[stage.level] || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {stage.level === 'Primary'
                              ? 'ابتدائي'
                              : stage.level === 'Middle'
                              ? 'إعدادي'
                              : 'ثانوي'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {stageGroups.length} مجموعات تعليمية · {totalStageExams} امتحانات مسجلة
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPreselectedStageId(stage.id);
                      const firstGrp = stageGroups[0]?.group;
                      setNewExam({
                        title: '',
                        description: '',
                        groupId: firstGrp ? firstGrp.id : '',
                        examDate: new Date().toISOString().split('T')[0],
                        type: 'MONTHLY',
                        maxScore: 100,
                      });
                      setIsAddingExam(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl text-xs font-bold transition border border-purple-500/30 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة امتحان لهذه المرحلة
                  </button>
                </div>

                {/* Groups List in this Stage */}
                {stageGroups.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-800/60 text-slate-500">
                    <p className="text-sm">لا توجد مجموعات مسجلة في هذه المرحلة بعد.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {stageGroups.map(({ group, exams: groupExams }) => {
                      const isCollapsed = !!collapsedGroups[group.id];

                      return (
                        <div
                          key={group.id}
                          className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4 md:p-5 shadow-lg space-y-4"
                        >
                          {/* Group Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div
                              onClick={() => toggleGroupCollapse(group.id)}
                              className="flex items-center gap-3 cursor-pointer select-none flex-1"
                            >
                              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 flex-shrink-0">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-white text-base hover:text-purple-300 transition">
                                    {group.name}
                                  </h3>
                                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full text-[10px] font-bold">
                                    {groupExams.length} امتحانات
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                                  {group.scheduleDays && group.scheduleDays.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                                      {group.scheduleDays.join(' - ')} {group.startTime ? `(${group.startTime})` : ''}
                                    </span>
                                  )}
                                  {group._count?.students !== undefined && (
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5 text-slate-500" />
                                      {group._count.students} طالب
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => openAddExamForGroup(group.id, stage.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl text-xs font-bold transition border border-emerald-500/30"
                              >
                                <Plus className="w-3.5 h-3.5" /> امتحان جديد
                              </button>
                              <button
                                onClick={() => toggleGroupCollapse(group.id)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition border border-slate-800"
                                title={isCollapsed ? 'توسيع' : 'طي'}
                              >
                                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Group Exams Grid (Collapsible) */}
                          {!isCollapsed && (
                            <div className="pt-2">
                              {groupExams.length === 0 ? (
                                <div className="text-center py-8 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-500 space-y-2">
                                  <p className="text-xs">لا توجد امتحانات مسجلة لهذه المجموعة حتى الآن</p>
                                  <button
                                    onClick={() => openAddExamForGroup(group.id, stage.id)}
                                    className="text-xs text-purple-400 hover:text-purple-300 font-bold underline"
                                  >
                                    + إنشاء أول امتحان الآن
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                  {groupExams.map((exam) => {
                                    const stats = getStats(exam);
                                    return (
                                      <div
                                        key={exam.id}
                                        className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5 hover:border-purple-500/40 transition-all flex flex-col justify-between"
                                      >
                                        <div className="space-y-2.5">
                                          {/* Exam Card Top */}
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                                                  typeColors[exam.type] || 'bg-slate-800 text-slate-300'
                                                }`}
                                              >
                                                {typeLabels[exam.type] || exam.type}
                                              </span>
                                              <h4 className="font-bold text-white text-sm mt-1.5 leading-snug">
                                                {exam.title}
                                              </h4>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <button
                                                onClick={() => openGrading(exam)}
                                                className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg text-xs transition"
                                                title="رصد الدرجات"
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

                                          {/* Exam Info */}
                                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                                            <span className="flex items-center gap-1">
                                              <Calendar className="w-3 h-3 text-slate-500" />
                                              {new Date(exam.examDate).toLocaleDateString('ar-EG')}
                                            </span>
                                            <span className="font-mono text-purple-300 font-semibold">
                                              الدرجة من: {exam.maxScore}
                                            </span>
                                          </div>

                                          {/* Stats Summary */}
                                          {stats ? (
                                            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                                              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                                                <p className="text-slate-500 text-[10px]">المتوسط</p>
                                                <p className="font-black text-white mt-0.5">{stats.avg}</p>
                                              </div>
                                              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                                                <p className="text-slate-500 text-[10px]">الأعلى</p>
                                                <p className="font-black text-emerald-400 mt-0.5">{stats.high}</p>
                                              </div>
                                              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                                                <p className="text-slate-500 text-[10px]">الأدنى</p>
                                                <p className="font-black text-rose-400 mt-0.5">{stats.low}</p>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="p-2.5 rounded-xl bg-slate-950/50 text-center text-xs text-slate-500">
                                              لم يتم رصد درجات بعد
                                            </div>
                                          )}

                                          {/* Results Mini List */}
                                          {exam.results && exam.results.length > 0 && (
                                            <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                                              {exam.results.slice(0, 4).map((r, i) => (
                                                <div
                                                  key={i}
                                                  className="flex items-center justify-between text-[11px] bg-slate-950/60 rounded-lg px-2.5 py-1"
                                                >
                                                  <span className="text-slate-300 truncate max-w-[120px]">
                                                    {r.student?.name}
                                                  </span>
                                                  <span
                                                    className={`font-black font-mono ${
                                                      r.percentage >= 60 ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}
                                                  >
                                                    {r.score}/{exam.maxScore}{' '}
                                                    <span className="text-[10px] text-slate-500 font-normal">
                                                      ({r.percentage.toFixed(0)}%)
                                                    </span>
                                                  </span>
                                                </div>
                                              ))}
                                              {exam.results.length > 4 && (
                                                <p className="text-[10px] text-center text-purple-400 pt-0.5">
                                                  + {exam.results.length - 4} طلاب آخرين
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* Action Button */}
                                        <button
                                          onClick={() => openGrading(exam)}
                                          className="w-full mt-2 py-2 bg-purple-600/15 hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl text-xs font-bold transition border border-purple-500/25 flex items-center justify-center gap-1.5"
                                        >
                                          <Award className="w-3.5 h-3.5" />
                                          {exam.results.length > 0
                                            ? `تعديل الدرجات (${exam.results.length} مسجل)`
                                            : 'رصد الدرجات الآن'}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned / Other Groups Section if any */}
          {hierarchyData.unassigned.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-2xl space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800/80">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">مجموعات عامة / أخرى</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    امتحانات مسجلة بمجموعات عامة أو غير مرتبطة بمرحلة محددة
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {hierarchyData.unassigned.map(({ group, exams: groupExams }) => (
                  <div
                    key={group.id}
                    className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">{group.name}</h3>
                      <span className="text-xs px-2.5 py-0.5 bg-slate-900 text-slate-300 rounded-lg">
                        {groupExams.length} امتحانات
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                      {groupExams.map((exam) => (
                        <div
                          key={exam.id}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-white text-xs">{exam.title}</h4>
                            <button
                              onClick={() => openGrading(exam)}
                              className="p-1 bg-emerald-600/20 text-emerald-400 rounded"
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400">الدرجة من: {exam.maxScore}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {hierarchyData.stages.length === 0 && hierarchyData.unassigned.length === 0 && (
            <div className="text-center py-20 text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800/80 space-y-3">
              <BookOpen className="w-12 h-12 mx-auto opacity-30 text-purple-400" />
              <p className="text-base font-semibold text-slate-300">
                {searchQuery ? `لا توجد امتحانات مطابقة لبحثك عن "${searchQuery}"` : 'لا توجد امتحانات مسجلة'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveStageId('ALL');
                    setSelectedType('ALL');
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-bold underline"
                >
                  إعادة تعيين جميع الفلاتر
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Exam Modal */}
      {isAddingExam && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">📝</span>
                إضافة امتحان جديد
              </h3>
              <button
                onClick={() => setIsAddingExam(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-300 mb-1 text-xs font-semibold">عنوان الامتحان *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شيت على الاشتقاق الضمني والبارامترى"
                  value={newExam.title}
                  onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Stage Selector helper */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs font-semibold">المرحلة الدراسية</label>
                  <select
                    value={preselectedStageId}
                    onChange={(e) => {
                      const stId = e.target.value;
                      setPreselectedStageId(stId);
                      const matching = groups.filter(
                        (g) => !stId || g.academicStageId === stId || g.academicStage?.id === stId
                      );
                      if (matching.length > 0) {
                        setNewExam({ ...newExam, groupId: matching[0].id });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  >
                    <option value="">جميع المراحل</option>
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-xs font-semibold">المجموعة التعليمية *</label>
                  <select
                    required
                    value={newExam.groupId}
                    onChange={(e) => setNewExam({ ...newExam, groupId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">اختر المجموعة...</option>
                    {availableGroupsForModal.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} {g.academicStage?.name ? `(${g.academicStage.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs font-semibold">تاريخ الامتحان</label>
                  <input
                    type="date"
                    value={newExam.examDate}
                    onChange={(e) => setNewExam({ ...newExam, examDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-xs font-semibold">نوع الامتحان</label>
                  <select
                    value={newExam.type}
                    onChange={(e) => setNewExam({ ...newExam, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                  >
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 text-xs font-semibold">الدرجة القصوى</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={newExam.maxScore}
                  onChange={(e) => setNewExam({ ...newExam, maxScore: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingExam(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg text-sm"
                >
                  {isSaving ? 'جاري الحفظ...' : 'إضافة الامتحان ➕'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingExam && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" />
                  رصد الدرجات: {gradingExam.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  الدرجة القصوى: <span className="font-bold text-purple-300">{gradingExam.maxScore}</span> | المجموعة:{' '}
                  <span className="font-bold text-white">{gradingExam.group?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setGradingExam(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Search bar inside grading modal */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو كود الطالب..."
                  value={gradingSearchQuery}
                  onChange={(e) => setGradingSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
                {gradingSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setGradingSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {groupStudents.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">لا يوجد طلاب في هذه المجموعة</p>
                ) : (
                  (() => {
                    const q = (gradingSearchQuery || '').trim().toLowerCase();
                    const filtered = groupStudents.filter(
                      (stu) =>
                        !q ||
                        (stu.name || '').toLowerCase().includes(q) ||
                        (stu.code || '').toLowerCase().includes(q)
                    );

                    if (filtered.length === 0) {
                      return (
                        <p className="text-center text-slate-500 py-8">
                          لا توجد نتائج مطابقة لبحثك عن "{gradingSearchQuery}"
                        </p>
                      );
                    }

                    return filtered.map((stu) => (
                      <div
                        key={stu.id}
                        className="flex items-center gap-3 bg-slate-950 rounded-xl px-4 py-2.5 border border-slate-800 hover:border-slate-700 transition"
                      >
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
                          value={grades[stu.id] ?? ''}
                          onChange={(e) => setGrades({ ...grades, [stu.id]: e.target.value })}
                          className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm text-center font-mono focus:border-purple-500 focus:outline-none"
                        />
                        {grades[stu.id] !== undefined &&
                          grades[stu.id] !== '' &&
                          !isNaN(Number(grades[stu.id])) && (
                            <span
                              className={`text-xs font-bold w-12 text-center font-mono ${
                                (parseFloat(grades[stu.id]) / gradingExam.maxScore) * 100 >= 60
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {((parseFloat(grades[stu.id]) / gradingExam.maxScore) * 100).toFixed(0)}%
                            </span>
                          )}
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setGradingExam(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm"
              >
                إلغاء
              </button>
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
