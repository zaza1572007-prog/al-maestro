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
  Zap,
  HelpCircle,
  FolderPlus,
  Check,
  X,
  Lock,
  Unlock,
  Eye,
  Edit,
  Save,
  Loader2,
  Timer,
  Shuffle,
  AlertCircle
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  code: string;
  phone?: string;
}

interface ExamResult {
  id?: string;
  score: number;
  percentage: number;
  student: Student;
  answers?: any;
  startedAt?: string;
  timeSpentSeconds?: number;
  isAutoGraded?: boolean;
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

interface QuizQuestion {
  id: string;
  questionText: string;
  image?: string | null;
  type: 'MCQ' | 'TRUE_FALSE';
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  points: number;
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
  duration?: number | null;
  isOnline?: boolean;
  questions?: QuizQuestion[] | null;
  shuffleQuestions?: boolean;
  showAnswersAfterSubmit?: boolean;
  isOpen?: boolean;
  closesAt?: string | null;
  results: ExamResult[];
}

interface Stage {
  id: string;
  name: string;
  level: string;
  grade: string;
}

interface BankQuestion {
  id: string;
  academicStageId?: string | null;
  academicStage?: { id: string; name: string };
  title: string;
  questionText: string;
  image?: string | null;
  type: string;
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  points: number;
  tags: string[];
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

  // Question Bank Modal State
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankStageFilter, setBankStageFilter] = useState('ALL');
  const [bankSearch, setBankSearch] = useState('');
  const [isAddingBankQuestion, setIsAddingBankQuestion] = useState(false);

  // New Bank Question form
  const [newBankQ, setNewBankQ] = useState<{
    title: string;
    questionText: string;
    academicStageId: string;
    type: 'MCQ' | 'TRUE_FALSE';
    options: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
  }>({
    title: '',
    questionText: '',
    academicStageId: '',
    type: 'MCQ',
    options: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
    correctAnswer: '0',
    explanation: '',
    points: 1,
  });

  // Grades entry panel (Manual)
  const [gradingExam, setGradingExam] = useState<Exam | null>(null);
  const [groupStudents, setGroupStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [gradingSearchQuery, setGradingSearchQuery] = useState('');

  // Live Online Results Monitor Modal
  const [monitorExam, setMonitorExam] = useState<Exam | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<ExamResult | null>(null);

  // Exam Builder State
  const [isOnlineQuiz, setIsOnlineQuiz] = useState(false);
  const [quizDuration, setQuizDuration] = useState<number>(15);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [showAnswersAfterSubmit, setShowAnswersAfterSubmit] = useState(true);
  const [isOpenNow, setIsOpenNow] = useState(true);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [previewQuestionId, setPreviewQuestionId] = useState<string | 'DRAFT'>('DRAFT');

  // Current Question being added in builder
  const [currentQText, setCurrentQText] = useState('');
  const [currentQType, setCurrentQType] = useState<'MCQ' | 'TRUE_FALSE'>('MCQ');
  const [currentQOptions, setCurrentQOptions] = useState<string[]>([
    'الخيار الأول',
    'الخيار الثاني',
    'الخيار الثالث',
    'الخيار الرابع',
  ]);
  const [currentQCorrect, setCurrentQCorrect] = useState('0');
  const [currentQExplanation, setCurrentQExplanation] = useState('');
  const [currentQPoints, setCurrentQPoints] = useState(1);
  const [saveToBankOnAdd, setSaveToBankOnAdd] = useState(false);

  const [newExam, setNewExam] = useState({
    title: '',
    description: '',
    groupId: '',
    examDate: new Date().toISOString().split('T')[0],
    type: 'QUIZ',
    maxScore: 10,
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

  const fetchBankQuestions = async () => {
    setBankLoading(true);
    try {
      const res = await fetch('/api/question-bank');
      const data = await res.json();
      if (data.success) {
        setBankQuestions(data.questions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBankLoading(false);
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

    if (isOnlineQuiz && quizQuestions.length === 0) {
      alert('الرجاء إضافة سؤال واحد على الأقل للاختبار الإلكتروني');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        ...newExam,
        isOnline: isOnlineQuiz,
        duration: isOnlineQuiz ? quizDuration : null,
        questions: isOnlineQuiz ? quizQuestions : null,
        shuffleQuestions,
        showAnswersAfterSubmit,
        isOpen: isOpenNow,
      };

      if (isOnlineQuiz) {
        const calculatedTotal = quizQuestions.reduce((acc, q) => acc + (q.points || 1), 0);
        payload.maxScore = calculatedTotal || newExam.maxScore;
      }

      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setIsAddingExam(false);
        resetExamForm();
      } else {
        alert(data.error || 'حدث خطأ أثناء إضافة الامتحان');
      }
    } catch {
      alert('تعذّر الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  const resetExamForm = () => {
    setNewExam({
      title: '',
      description: '',
      groupId: '',
      examDate: new Date().toISOString().split('T')[0],
      type: 'QUIZ',
      maxScore: 10,
    });
    setIsOnlineQuiz(false);
    setQuizQuestions([]);
    setPreviewQuestionId('DRAFT');
    setCurrentQText('');
    setCurrentQExplanation('');
    setCurrentQOptions(['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع']);
    setCurrentQCorrect('0');
    setCurrentQPoints(1);
  };

  const addQuestionToQuiz = () => {
    if (!currentQText.trim()) {
      alert('يرجى كتابة نص السؤال أولاً');
      return;
    }

    const newQ: QuizQuestion = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      questionText: currentQText.trim(),
      type: currentQType,
      options: currentQType === 'TRUE_FALSE' ? ['صح', 'خطأ'] : currentQOptions,
      correctAnswer: currentQType === 'TRUE_FALSE' ? currentQCorrect : currentQCorrect,
      explanation: currentQExplanation.trim() || null,
      points: Number(currentQPoints) || 1,
    };

    setQuizQuestions((prev) => [...prev, newQ]);
    setPreviewQuestionId('DRAFT');

    // Save to bank if checkbox enabled
    if (saveToBankOnAdd) {
      fetch('/api/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newExam.title || 'سؤال كويز',
          academicStageId: preselectedStageId || null,
          questionText: newQ.questionText,
          type: newQ.type,
          options: newQ.options,
          correctAnswer: newQ.correctAnswer,
          explanation: newQ.explanation,
          points: newQ.points,
        }),
      }).catch(console.error);
    }

    // Reset current question input
    setCurrentQText('');
    setCurrentQExplanation('');
    setCurrentQPoints(1);
    setCurrentQCorrect('0');
  };

  const removeQuestionFromQuiz = (id: string) => {
    setQuizQuestions((prev) => prev.filter((q) => q.id !== id));
    if (previewQuestionId === id) {
      setPreviewQuestionId('DRAFT');
    }
  };

  const importFromBankToQuiz = (bankQ: BankQuestion) => {
    const newQ: QuizQuestion = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      questionText: bankQ.questionText,
      type: (bankQ.type as any) || 'MCQ',
      options: bankQ.options || [],
      correctAnswer: bankQ.correctAnswer,
      explanation: bankQ.explanation,
      points: bankQ.points || 1,
    };
    setQuizQuestions((prev) => [...prev, newQ]);
    alert('تم إضافة السؤال للكويز بنجاح ✅');
  };

  const handleSaveBankQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankQ.questionText.trim()) return;

    try {
      const res = await fetch('/api/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBankQ),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddingBankQuestion(false);
        setNewBankQ({
          title: '',
          questionText: '',
          academicStageId: '',
          type: 'MCQ',
          options: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
          correctAnswer: '0',
          explanation: '',
          points: 1,
        });
        fetchBankQuestions();
      } else {
        alert(data.error || 'تعذر الحفظ');
      }
    } catch {
      alert('حدث خطأ');
    }
  };

  const handleDeleteBankQuestion = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال من بنك الأسئلة؟')) return;
    try {
      const res = await fetch(`/api/question-bank/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setBankQuestions((prev) => prev.filter((q) => q.id !== id));
      }
    } catch {
      alert('تعذر الحذف');
    }
  };

  const toggleExamStatus = async (exam: Exam) => {
    try {
      const newStatus = !exam.isOpen;
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setExams((prev) =>
          prev.map((e) => (e.id === exam.id ? { ...e, isOpen: newStatus } : e))
        );
      }
    } catch {
      alert('تعذر تغيير حالة الاختبار');
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الامتحان وكافة نتائجه؟')) return;
    try {
      const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setExams((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      alert('تعذر الحذف');
    }
  };

  const openGradingModal = async (exam: Exam) => {
    setGradingExam(exam);
    setGradingSearchQuery('');
    try {
      const res = await fetch(`/api/groups/${exam.groupId}`);
      const data = await res.json();
      const studentsList = data.group?.students || data.students || [];
      setGroupStudents(studentsList);
      
      const existingGrades: Record<string, string> = {};
      if (exam.results) {
        exam.results.forEach((r) => {
          if (r.student?.id) {
            existingGrades[r.student.id] = String(r.score);
          }
        });
      }
      setGrades(existingGrades);
    } catch (err) {
      console.error('Failed to load group students for grading:', err);
    }
  };

  const handleSaveGrades = async () => {
    if (!gradingExam) return;
    setIsSavingGrades(true);
    try {
      const resultsArray = Object.entries(grades)
        .filter(([_, score]) => score !== '' && !isNaN(parseFloat(score)))
        .map(([studentId, score]) => ({
          studentId,
          score: parseFloat(score),
          percentage: (parseFloat(score) / gradingExam.maxScore) * 100,
        }));

      const res = await fetch(`/api/exams/${gradingExam.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: resultsArray }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setGradingExam(null);
      } else {
        alert(data.error || 'تعذر حفظ الدرجات');
      }
    } catch {
      alert('حدث خطأ أثناء حفظ الدرجات');
    } finally {
      setIsSavingGrades(false);
    }
  };

  // Filtered Hierarchy Data
  const hierarchyData = useMemo(() => {
    const filteredExams = exams.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.group?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'ALL' || e.type === selectedType;
      return matchesSearch && matchesType;
    });

    const structuredStages = stages
      .filter((st) => activeStageId === 'ALL' || st.id === activeStageId)
      .map((st) => {
        const stageGroups = groups
          .filter(
            (g) => g.academicStageId === st.id || (g.academicStage && g.academicStage.id === st.id)
          )
          .map((g) => ({
            ...g,
            exams: filteredExams.filter((e) => e.groupId === g.id),
          }));
        return {
          stage: st,
          groups: stageGroups,
        };
      });

    return {
      stages: structuredStages,
    };
  }, [exams, groups, stages, activeStageId, searchQuery, selectedType]);

  const totalExamsCount = exams.length;
  const onlineExamsCount = exams.filter((e) => e.isOnline).length;
  const totalGradedCount = exams.reduce((acc, e) => acc + (e.results?.length || 0), 0);

  const availableGroupsForModal = useMemo(() => {
    if (!preselectedStageId) return groups;
    return groups.filter(
      (g) => g.academicStageId === preselectedStageId || g.academicStage?.id === preselectedStageId
    );
  }, [groups, preselectedStageId]);

  const currentPreviewData = useMemo(() => {
    const isDraft = previewQuestionId === 'DRAFT' || !quizQuestions.some((q) => q.id === previewQuestionId);
    if (isDraft) {
      const options = currentQType === 'TRUE_FALSE' 
        ? ['صح', 'خطأ'] 
        : currentQOptions.map((opt, i) => opt.trim() || `الخيار ${i + 1}`);
      return {
        id: 'DRAFT',
        isDraft: true,
        index: quizQuestions.length + 1,
        total: Math.max(quizQuestions.length + 1, 1),
        type: currentQType,
        questionText: currentQText.trim() || 'اكتب نص السؤال في المحرر وسيظهر هنا فوراً كما يراه الطالب...',
        options,
        correctAnswer: currentQCorrect,
        explanation: currentQExplanation.trim(),
        points: currentQPoints || 1,
      };
    }
    const foundIdx = quizQuestions.findIndex((q) => q.id === previewQuestionId);
    const foundQ = quizQuestions[foundIdx];
    return {
      id: foundQ.id,
      isDraft: false,
      index: foundIdx + 1,
      total: quizQuestions.length,
      type: foundQ.type || 'MCQ',
      questionText: foundQ.questionText,
      options: foundQ.options,
      correctAnswer: foundQ.correctAnswer,
      explanation: foundQ.explanation || '',
      points: foundQ.points,
    };
  }, [previewQuestionId, quizQuestions, currentQText, currentQOptions, currentQCorrect, currentQExplanation, currentQPoints, currentQType]);

  return (
    <div className="space-y-6 pb-12 text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
              📝
            </span>
            الامتحانات والكويزات الإلكترونية
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            إدارة الاختبارات الورقية والكويزات التفاعلية المصححة ذاتياً وبنك الأسئلة المركزي
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              fetchBankQuestions();
              setIsBankOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 font-bold rounded-2xl text-sm transition border border-amber-500/30 shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>بنك الأسئلة المركزي 📚</span>
          </button>

          <button
            onClick={fetchData}
            title="تحديث البيانات"
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-2xl transition border border-slate-700/50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setPreselectedStageId('');
              resetExamForm();
              setIsAddingExam(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-purple-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء امتحان / كويز ⚡</span>
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
          <p className="text-[11px] text-slate-500 mt-0.5">امتحان وكويز مسجل</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">كويزات أونلاين ⚡</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{onlineExamsCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">مصححة ذاتياً بنسبة 100%</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">الدرجات المرصودة</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{totalGradedCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">طالب تم تقييمهم</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">المجموعات الدراسية</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-2">{groups.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">مجموعة تعليمية</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-6">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث باسم الامتحان، الكويز، أو المجموعة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/70 rounded-2xl pr-10 pl-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="relative md:col-span-3">
            <select
              value={activeStageId}
              onChange={(e) => setActiveStageId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/70 rounded-2xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition cursor-pointer"
            >
              <option value="ALL">🌟 جميع المراحل الدراسية</option>
              {stages.map((st) => (
                <option key={st.id} value={st.id}>
                  🎓 {st.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative md:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/70 rounded-2xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition cursor-pointer"
            >
              <option value="ALL">📋 جميع أنواع الامتحانات</option>
              {Object.entries(typeLabels).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Hierarchical Content */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 space-y-3">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold">جارٍ تحميل الامتحانات والكويزات...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {hierarchyData.stages.map(({ stage, groups: stageGroups }) => {
            const totalStageExams = stageGroups.reduce((acc, g) => acc + g.exams.length, 0);

            return (
              <div
                key={stage.id}
                className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                      🎓
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{stage.name}</h2>
                      <p className="text-xs text-slate-400">
                        {stageGroups.length} مجموعات • {totalStageExams} امتحانات
                      </p>
                    </div>
                  </div>
                </div>

                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stageGroups.map((grp) => (
                    <div
                      key={grp.id}
                      className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-400" />
                          <h3 className="font-bold text-sm text-white">{grp.name}</h3>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                          {grp.exams.length} اختبارات
                        </span>
                      </div>

                      {/* Exams list in group */}
                      {grp.exams.length === 0 ? (
                        <p className="text-xs text-slate-500 py-3 text-center">لا توجد امتحانات مسجلة لهذه المجموعة</p>
                      ) : (
                        <div className="space-y-2">
                          {grp.exams.map((ex) => (
                            <div
                              key={ex.id}
                              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-200">{ex.title}</span>
                                  {ex.isOnline && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                      <Zap className="w-2.5 h-2.5" /> أونلاين
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeColors[ex.type] || ''}`}>
                                    {typeLabels[ex.type] || ex.type}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  الدرجة: {ex.maxScore} | تم رصد: {ex.results?.length || 0} طالب | التاريخ:{' '}
                                  {new Date(ex.examDate).toLocaleDateString('ar-EG')}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {ex.isOnline && (
                                  <button
                                    onClick={() => toggleExamStatus(ex)}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition ${
                                      ex.isOpen
                                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                    }`}
                                    title={ex.isOpen ? 'الاختبار متاح (اضغط للإغلاق)' : 'الاختبار مغلق (اضغط للفتح)'}
                                  >
                                    {ex.isOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                  </button>
                                )}

                                {ex.isOnline ? (
                                  <button
                                    onClick={() => setMonitorExam(ex)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>النتائج ({ex.results?.length || 0})</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openGradingModal(ex)}
                                    className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 text-xs font-bold transition"
                                  >
                                    رصد يدوي
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteExam(ex.id)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition"
                                  title="حذف الامتحان"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Exam / Quiz Modal */}
      {isAddingExam && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div
            className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar transition-all duration-300 ${
              isOnlineQuiz ? 'max-w-6xl 2xl:max-w-7xl' : 'max-w-3xl'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  إنشاء امتحان جديد / كويز إلكتروني تفاعلي
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  اختر نوع الامتحان ثم أضف الأسئلة مع شاشة المعاينة الحية الفورية المباشرة
                </p>
              </div>
              <button
                onClick={() => setIsAddingExam(false)}
                className="text-slate-400 hover:text-white text-xl p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Type Selector: Traditional vs Online Quiz */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsOnlineQuiz(false)}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                  !isOnlineQuiz
                    ? 'bg-purple-600/20 border-purple-500 text-purple-200 font-bold shadow-lg shadow-purple-600/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="text-xs font-bold">📝 امتحان ورقي تقليدي</span>
                <span className="text-[10px] text-slate-400">رصد الدرجات يدوياً بواسطة المساعدين</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOnlineQuiz(true)}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                  isOnlineQuiz
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">⚡ كويز إلكتروني تفاعلي + معاينة حية</span>
                <span className="text-[10px] text-slate-400">مؤقت زمني وتصحيح ذاتي فوري 100% مع محاكي الطالب</span>
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4 text-sm">
              {/* Main Content Grid: 2 Columns if Online Quiz */}
              <div className={`grid grid-cols-1 ${isOnlineQuiz ? 'lg:grid-cols-12 gap-6' : 'gap-4'} items-start`}>
                {/* Right Column: Editor & Inputs */}
                <div className={`${isOnlineQuiz ? 'lg:col-span-7 space-y-4' : 'space-y-4'}`}>
                  {/* Basic Fields Card */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-purple-400" />
                      البيانات الأساسية للاختبار
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-300 mb-1 text-xs font-semibold">عنوان الامتحان / الكويز *</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: كويز قوانين الحركة والقوة والسرعة"
                          value={newExam.title}
                          onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:border-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 text-xs font-semibold">المجموعة التعليمية *</label>
                        <select
                          required
                          value={newExam.groupId}
                          onChange={(e) => setNewExam({ ...newExam, groupId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:border-purple-500 focus:outline-none"
                        >
                          <option value="">اختر المجموعة...</option>
                          {availableGroupsForModal.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} {g.academicStage?.name ? `(${g.academicStage.name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 text-xs font-semibold">تاريخ الامتحان</label>
                        <input
                          type="date"
                          value={newExam.examDate}
                          onChange={(e) => setNewExam({ ...newExam, examDate: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Traditional Exam Score Field (if not online) */}
                  {!isOnlineQuiz && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <label className="block text-slate-300 mb-1 text-xs font-semibold">الدرجة العظمى (النهائية) *</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={newExam.maxScore}
                        onChange={(e) => setNewExam({ ...newExam, maxScore: parseFloat(e.target.value) || 10 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                      />
                    </div>
                  )}

                  {/* Online Quiz Settings & Builder */}
                  {isOnlineQuiz && (
                    <div className="space-y-4">
                      {/* Online Options Banner */}
                      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Timer className="w-4 h-4" />
                            إعدادات الكويز والمؤقت
                          </h4>
                          <span className="text-[10px] text-amber-300/80 font-mono bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            {quizQuestions.length} أسئلة مضافة (إجمالي الدرجات:{' '}
                            {quizQuestions.reduce((acc, q) => acc + (q.points || 1), 0)})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-slate-300 mb-1 text-[11px] font-semibold">مدة الكويز (بالدقائق)</label>
                            <input
                              type="number"
                              min={1}
                              max={180}
                              value={quizDuration}
                              onChange={(e) => setQuizDuration(parseInt(e.target.value) || 15)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-sm font-mono text-center focus:border-amber-500 focus:outline-none"
                            />
                          </div>

                          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                            <span className="text-xs text-slate-300">خلط الأسئلة</span>
                            <input
                              type="checkbox"
                              checked={shuffleQuestions}
                              onChange={(e) => setShuffleQuestions(e.target.checked)}
                              className="rounded text-amber-500 focus:ring-amber-500"
                            />
                          </label>

                          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                            <span className="text-xs text-slate-300">إظهار الحل النموذجي</span>
                            <input
                              type="checkbox"
                              checked={showAnswersAfterSubmit}
                              onChange={(e) => setShowAnswersAfterSubmit(e.target.checked)}
                              className="rounded text-amber-500 focus:ring-amber-500"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Interactive Question Builder Card */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              محرر كتابة الأسئلة
                            </span>
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
                              مسوّدة السؤال #{quizQuestions.length + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              fetchBankQuestions();
                              setIsBankOpen(true);
                            }}
                            className="text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-bold transition"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            استيراد من بنك الأسئلة
                          </button>
                        </div>

                        {/* Question Type Switch */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentQType('MCQ');
                              setCurrentQCorrect('0');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              currentQType === 'MCQ'
                                ? 'bg-amber-500 text-slate-950 shadow'
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                            }`}
                          >
                            اختيار من متعدد (4 خيارات)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentQType('TRUE_FALSE');
                              setCurrentQCorrect('0');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              currentQType === 'TRUE_FALSE'
                                ? 'bg-amber-500 text-slate-950 shadow'
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                            }`}
                          >
                            صح / خطأ (خياران)
                          </button>
                        </div>

                        {/* Question Textarea */}
                        <div>
                          <label className="block text-slate-300 mb-1 text-xs font-semibold">
                            نص السؤال * (يظهر فوراً في شاشة المعاينة):
                          </label>
                          <textarea
                            rows={2}
                            placeholder="اكتب نص السؤال هنا بدقة..."
                            value={currentQText}
                            onChange={(e) => {
                              setCurrentQText(e.target.value);
                              if (previewQuestionId !== 'DRAFT') setPreviewQuestionId('DRAFT');
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 focus:outline-none leading-relaxed"
                          />
                        </div>

                        {/* Question Options with Radio for Correct Answer */}
                        <div className="space-y-2">
                          <label className="block text-slate-300 text-xs font-semibold">
                            خيارات الإجابة (حدد النقطة الخضراء بجانب الإجابة الصحيحة):
                          </label>

                          {currentQType === 'MCQ' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {currentQOptions.map((opt, idx) => {
                                const isSelected = currentQCorrect === String(idx);
                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-center gap-2 p-1.5 rounded-xl border transition ${
                                      isSelected
                                        ? 'bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500/30'
                                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="correctAnswer"
                                      checked={isSelected}
                                      onChange={() => {
                                        setCurrentQCorrect(String(idx));
                                        if (previewQuestionId !== 'DRAFT') setPreviewQuestionId('DRAFT');
                                      }}
                                      className="text-emerald-500 focus:ring-emerald-500 cursor-pointer ml-1"
                                      title="حدد هذا الخيار كإجابة صحيحة"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                                      {['أ', 'ب', 'ج', 'د'][idx] || idx + 1}:
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const updated = [...currentQOptions];
                                        updated[idx] = e.target.value;
                                        setCurrentQOptions(updated);
                                        if (previewQuestionId !== 'DRAFT') setPreviewQuestionId('DRAFT');
                                      }}
                                      placeholder={`الخيار ${idx + 1}`}
                                      className="w-full bg-transparent border-0 p-1 text-xs text-slate-200 focus:outline-none"
                                    />
                                    {isSelected && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mr-1" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {['صح', 'خطأ'].map((label, idx) => {
                                const isSelected = currentQCorrect === String(idx);
                                return (
                                  <label
                                    key={idx}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                                      isSelected
                                        ? 'bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500/30'
                                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name="tfCorrectAnswer"
                                        checked={isSelected}
                                        onChange={() => {
                                          setCurrentQCorrect(String(idx));
                                          if (previewQuestionId !== 'DRAFT') setPreviewQuestionId('DRAFT');
                                        }}
                                        className="text-emerald-500 focus:ring-emerald-500"
                                      />
                                      <span className="text-xs font-bold text-white">{label}</span>
                                    </div>
                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Explanation and Points */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                          <div className="sm:col-span-8">
                            <input
                              type="text"
                              placeholder="💡 شرح وتفسير الحل النموذجي (اختياري - يظهر للطالب بعد التسليم)..."
                              value={currentQExplanation}
                              onChange={(e) => {
                                setCurrentQExplanation(e.target.value);
                                if (previewQuestionId !== 'DRAFT') setPreviewQuestionId('DRAFT');
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                          <div className="sm:col-span-4 flex items-center gap-1.5">
                            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
                              <span className="text-[10px] text-slate-400 font-semibold">الدرجة:</span>
                              <input
                                type="number"
                                min={0.5}
                                step={0.5}
                                value={currentQPoints}
                                onChange={(e) => {
                                  setCurrentQPoints(parseFloat(e.target.value) || 1);
                                  if (previewQuestionId !== 'DRAFT') setPreviewQuestionId('DRAFT');
                                }}
                                className="w-12 bg-transparent text-xs text-white font-mono text-center focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={addQuestionToQuiz}
                              className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة السؤال</span>
                            </button>
                          </div>
                        </div>

                        {/* Save to Bank Option */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="saveToBankCheckbox"
                            checked={saveToBankOnAdd}
                            onChange={(e) => setSaveToBankOnAdd(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <label htmlFor="saveToBankCheckbox" className="text-[11px] text-slate-400 cursor-pointer">
                            حفظ نسخة تلقائياً في بنك الأسئلة المركزي للاستخدام المستقبلي
                          </label>
                        </div>
                      </div>

                      {/* Added Questions List */}
                      {quizQuestions.length > 0 && (
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200">
                              📋 الأسئلة المضافة للاختبار ({quizQuestions.length})
                            </span>
                            <span className="text-[10px] text-slate-400">
                              اضغط على أي سؤال لمعاينته في الشاشة المقابلة
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                            {quizQuestions.map((q, idx) => {
                              const isCurrentlyPreviewed = previewQuestionId === q.id;
                              return (
                                <div
                                  key={q.id}
                                  onClick={() => setPreviewQuestionId(q.id)}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                                    isCurrentlyPreviewed
                                      ? 'bg-purple-950/40 border-purple-500 text-white ring-1 ring-purple-500/40 shadow'
                                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                                  }`}
                                >
                                  <div className="truncate flex-1 flex items-center gap-2">
                                    <span className="font-bold text-amber-400 font-mono ml-1">س{idx + 1}:</span>
                                    <span className="truncate">{q.questionText}</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono shrink-0">
                                      {q.points} {q.points > 2 ? 'درجات' : 'درجة'}
                                    </span>
                                    {isCurrentlyPreviewed && (
                                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 shrink-0">
                                        👁️ معروض بالمعاينة
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 mr-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeQuestionFromQuiz(q.id);
                                      }}
                                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                                      title="حذف السؤال"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Left Column: Live Interactive Preview Panel (Student Card Simulator) */}
                {isOnlineQuiz && (
                  <div className="lg:col-span-5 sticky top-2 space-y-3">
                    <div className="bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-900/95 border border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 backdrop-blur-xl relative overflow-hidden">
                      {/* Top Bar: Live Indicator & Mock Timer */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                          </span>
                          <span className="text-xs font-black text-white flex items-center gap-1">
                            معاينة حية لشاشة الطالب
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>{quizDuration || 15}:00 دقيقة</span>
                        </div>
                      </div>

                      {/* Question Navigation Tabs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => setPreviewQuestionId('DRAFT')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                            previewQuestionId === 'DRAFT'
                              ? 'bg-amber-500 text-slate-950 shadow-md'
                              : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50'
                          }`}
                        >
                          <span>✏️ المسوّدة الحالية</span>
                        </button>

                        {quizQuestions.map((q, idx) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setPreviewQuestionId(q.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 font-mono ${
                              previewQuestionId === q.id
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50'
                            }`}
                          >
                            س{idx + 1}
                          </button>
                        ))}
                      </div>

                      {/* Mock Student Question Card */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-inner">
                        {/* Question Metadata Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-400">
                              السؤال {currentPreviewData.index} من {currentPreviewData.total}
                            </span>
                            {currentPreviewData.isDraft ? (
                              <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                                مسوّدة جارية
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                                سؤال معتمد
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-mono">
                            ⭐ {currentPreviewData.points} {currentPreviewData.points > 2 ? 'درجات' : 'درجة'}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-amber-500 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${(currentPreviewData.index / currentPreviewData.total) * 100}%`,
                            }}
                          />
                        </div>

                        {/* Question Body */}
                        <div className="py-1">
                          <h4 className="text-sm md:text-base font-bold text-white leading-relaxed whitespace-pre-wrap">
                            {currentPreviewData.questionText}
                          </h4>
                        </div>

                        {/* Options Simulation */}
                        <div className="space-y-2">
                          {currentPreviewData.options.map((opt, idx) => {
                            const isCorrect = String(idx) === String(currentPreviewData.correctAnswer);
                            const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                                  isCorrect
                                    ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-100 ring-1 ring-emerald-500/40 shadow-sm shadow-emerald-500/10'
                                    : 'bg-slate-900/80 border-slate-800/80 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 flex-1 truncate">
                                  <span
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                                      isCorrect
                                        ? 'bg-emerald-500 text-slate-950 font-black'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {letters[idx] || idx + 1}
                                  </span>
                                  <span className="text-xs font-semibold truncate">{opt}</span>
                                </div>

                                {isCorrect && (
                                  <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold shrink-0 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>الإجابة النموذجية</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Box Preview */}
                        {currentPreviewData.explanation && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>تفسير الحل النموذجي (يظهر للطالب بعد إنهاء الكويز):</span>
                            </div>
                            <p className="text-xs text-amber-200/90 leading-relaxed">
                              {currentPreviewData.explanation}
                            </p>
                          </div>
                        )}

                        {/* Mock Student Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-500">
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed text-[11px]"
                          >
                            ‹ السابق
                          </button>
                          <span className="text-[10px] text-slate-500 font-mono">محاكاة واجهة الطالب 📱</span>
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-lg bg-purple-600/30 border border-purple-500/30 text-purple-300 cursor-not-allowed text-[11px]"
                          >
                            التالي ›
                          </button>
                        </div>
                      </div>

                      {/* Footer Real-Time Notice */}
                      <p className="text-[10px] text-center text-slate-400">
                        ⚡ تنعكس كتابتك وتعديل الإجابات فوراً في هذه المعاينة بدقة 100%.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingExam(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg text-sm flex items-center gap-2 transition disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isOnlineQuiz ? 'نشر الكويز الإلكتروني 🚀' : 'إضافة الامتحان ➕'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Central Question Bank Modal */}
      {isBankOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-4xl shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  بنك الأسئلة المركزي 📚
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  تخزين الأسئلة حسب المراحل والدروس وإعادة استخدامها في الكويزات بنقرة واحدة
                </p>
              </div>
              <button onClick={() => setIsBankOpen(false)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            {/* Bank Actions & Search */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <input
                type="text"
                placeholder="ابحث في بنك الأسئلة..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />

              <select
                value={bankStageFilter}
                onChange={(e) => setBankStageFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="ALL">جميع المراحل</option>
                {stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsAddingBankQuestion(!isAddingBankQuestion)}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة سؤال للبنك</span>
              </button>
            </div>

            {/* Add Bank Question Form */}
            {isAddingBankQuestion && (
              <form onSubmit={handleSaveBankQuestion} className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                <h4 className="text-xs font-bold text-amber-400">إضافة سؤال جديد لبنك الأسئلة:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="عنوان السؤال أو الدرس (مثال: اشتقاق الدوال المثلثية)"
                    value={newBankQ.title}
                    onChange={(e) => setNewBankQ({ ...newBankQ, title: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white"
                  />
                  <select
                    value={newBankQ.academicStageId}
                    onChange={(e) => setNewBankQ({ ...newBankQ, academicStageId: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="">اختر المرحلة الدراسية</option>
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={2}
                  required
                  placeholder="نص السؤال..."
                  value={newBankQ.questionText}
                  onChange={(e) => setNewBankQ({ ...newBankQ, questionText: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white"
                />

                <div className="grid grid-cols-2 gap-2">
                  {newBankQ.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="bankCorrect"
                        checked={newBankQ.correctAnswer === String(idx)}
                        onChange={() => setNewBankQ({ ...newBankQ, correctAnswer: String(idx) })}
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...newBankQ.options];
                          updated[idx] = e.target.value;
                          setNewBankQ({ ...newBankQ, options: updated });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingBankQuestion(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    حفظ في البنك 💾
                  </button>
                </div>
              </form>
            )}

            {/* Questions List */}
            {bankLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              </div>
            ) : bankQuestions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">لا توجد أسئلة محفوظة في بنك الأسئلة حتى الآن</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {bankQuestions
                  .filter((q) => {
                    const matchStage = bankStageFilter === 'ALL' || q.academicStageId === bankStageFilter;
                    const matchSearch =
                      q.questionText.toLowerCase().includes(bankSearch.toLowerCase()) ||
                      q.title?.toLowerCase().includes(bankSearch.toLowerCase());
                    return matchStage && matchSearch;
                  })
                  .map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{q.title || 'سؤال'}</span>
                          {q.academicStage && (
                            <span className="text-[10px] bg-slate-800 text-purple-300 px-2 py-0.5 rounded">
                              {q.academicStage.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300">{q.questionText}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {q.options?.map((opt, i) => (
                            <span
                              key={i}
                              className={`text-[10px] px-2 py-0.5 rounded ${
                                String(i) === q.correctAnswer
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                                  : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              {opt} {String(i) === q.correctAnswer ? '✓' : ''}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isAddingExam && isOnlineQuiz && (
                          <button
                            type="button"
                            onClick={() => importFromBankToQuiz(q)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition"
                          >
                            + إضافة للكويز
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteBankQuestion(q.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Online Quiz Live Results Monitor Modal */}
      {monitorExam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-4xl shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  مراقبة نتائج الكويز التفاعلي: {monitorExam.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  المجموعة: <span className="text-white font-bold">{monitorExam.group?.name}</span> • إجمالي التسليمات:{' '}
                  <span className="text-amber-400 font-bold">{monitorExam.results?.length || 0} طالب</span>
                </p>
              </div>
              <button onClick={() => setMonitorExam(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            {/* Submissions Table */}
            {(!monitorExam.results || monitorExam.results.length === 0) ? (
              <div className="text-center py-12 bg-slate-950 rounded-2xl border border-slate-800">
                <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-bold">لم يقم أي طالب بتسليم الكويز حتى الآن</p>
                <p className="text-xs text-slate-500 mt-1">تظهر النتائج والدرجات هنا تلقائياً بمجرد تسليم الطلاب للكويز من بواباتهم.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold">
                        <th className="pb-2">اسم الطالب</th>
                        <th className="pb-2">الكود</th>
                        <th className="pb-2">الدرجة</th>
                        <th className="pb-2">النسبة</th>
                        <th className="pb-2">المدة</th>
                        <th className="pb-2">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {monitorExam.results.map((res) => (
                        <tr key={res.student.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 font-bold text-white">{res.student.name}</td>
                          <td className="py-2.5 font-mono text-slate-400">{res.student.code}</td>
                          <td className="py-2.5 font-mono font-bold text-purple-300">
                            {res.score} / {monitorExam.maxScore}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                res.percentage >= 85
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : res.percentage >= 50
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {Math.round(res.percentage)}%
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400">
                            {res.timeSpentSeconds ? `${Math.round(res.timeSpentSeconds / 60)} دقيقة` : '—'}
                          </td>
                          <td className="py-2.5">
                            <span className="text-[10px] text-emerald-400 font-bold">مصرح آلياً ✅</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Grading Modal */}
      {gradingExam && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" />
                  رصد الدرجات يدوياً: {gradingExam.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  الدرجة القصوى: <span className="font-bold text-purple-300">{gradingExam.maxScore}</span> | المجموعة:{' '}
                  <span className="font-bold text-white">{gradingExam.group?.name}</span>
                </p>
              </div>
              <button onClick={() => setGradingExam(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ابحث عن طالب في هذه المجموعة..."
                  value={gradingSearchQuery}
                  onChange={(e) => setGradingSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-white"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
                {groupStudents
                  .filter((stu) =>
                    stu.name.toLowerCase().includes(gradingSearchQuery.toLowerCase()) ||
                    stu.code.includes(gradingSearchQuery)
                  )
                  .map((stu) => (
                    <div
                      key={stu.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{stu.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">كود: {stu.code}</p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={gradingExam.maxScore}
                        value={grades[stu.id] || ''}
                        onChange={(e) => setGrades({ ...grades, [stu.id]: e.target.value })}
                        placeholder="الدرجة"
                        className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white text-center font-mono"
                      />
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setGradingExam(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSavingGrades}
                onClick={handleSaveGrades}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                {isSavingGrades ? 'جاري الحفظ...' : 'حفظ الدرجات 💾'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
