'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  UserCheck,
  Send,
  Loader2,
  Award,
  BookOpen,
  HelpCircle,
  Search,
  ChevronRight,
  ChevronLeft,
  Lock,
  Zap,
  Info,
  Layers,
  GraduationCap
} from 'lucide-react';

interface StudentOption {
  id: string;
  name: string;
}

interface PublicExamData {
  id: string;
  title: string;
  description?: string;
  examDate: string;
  duration: number;
  maxScore: number;
  questionsCount: number;
  isOpen: boolean;
  group: {
    id: string;
    name: string;
    stageName?: string;
  };
  students: StudentOption[];
}

interface QuestionForPlayer {
  id: string;
  questionText: string;
  type: string;
  options: string[];
  points: number;
  image?: string | null;
}

interface BreakdownItem {
  id: string;
  questionText: string;
  type: string;
  options: string[];
  studentAnswer: string | null;
  correctAnswer?: string;
  isCorrect: boolean;
  points: number;
  earned: number;
  explanation?: string | null;
}

interface QuizResult {
  id?: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpentSeconds: number;
  breakdown?: BreakdownItem[];
  showAnswersAfterSubmit?: boolean;
}

export default function PublicQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<PublicExamData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Step 1: Verification Form States
  const [loginMode, setLoginMode] = useState<'ACTIVATION' | 'CREDENTIALS'>('ACTIVATION');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Active Session State
  const [currentStudent, setCurrentStudent] = useState<{ id: string; name: string; code: string } | null>(null);
  const [questions, setQuestions] = useState<QuestionForPlayer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  // Results State
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Fetch Public Exam Info
  useEffect(() => {
    async function loadExam() {
      try {
        setLoading(true);
        const res = await fetch(`/api/quiz/${examId}`);
        const data = await res.json();
        if (data.success && data.exam) {
          setExamData(data.exam);
          setSecondsRemaining((data.exam.duration || 15) * 60);
        } else {
          setFetchError(data.error || 'تعذر تحميل بيانات الكويز');
        }
      } catch {
        setFetchError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [examId]);

  // Countdown Timer
  useEffect(() => {
    if (!quizStarted || quizResult || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, quizResult, secondsRemaining]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    if (!examData?.students) return [];
    if (!studentSearch.trim()) return examData.students;
    return examData.students.filter((s) =>
      s.name.toLowerCase().includes(studentSearch.trim().toLowerCase())
    );
  }, [examData?.students, studentSearch]);

  // Handle Verification & Start
  const handleVerifyAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    if (loginMode === 'CREDENTIALS') {
      if (!studentCode.trim() || !studentPassword.trim()) {
        setVerifyError('يرجى إدخال كود الطالب وكلمة المرور');
        return;
      }
    } else {
      if (!selectedStudentId) {
        setVerifyError('يرجى اختيار اسمك من قائمة الطلاب');
        return;
      }
      if (!studentPhone.trim() || !parentPhone.trim()) {
        setVerifyError('يرجى إدخال رقم هاتف الطالب ورقم هاتف ولي الأمر بدقة');
        return;
      }
    }

    setIsVerifying(true);
    try {
      const payload = loginMode === 'CREDENTIALS'
        ? {
            mode: 'CREDENTIALS',
            studentCode: studentCode.trim(),
            password: studentPassword.trim(),
          }
        : {
            mode: 'ACTIVATION',
            studentId: selectedStudentId,
            studentPhone: studentPhone.trim(),
            parentPhone: parentPhone.trim(),
          };

      const res = await fetch(`/api/quiz/${examId}/activate-and-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentStudent(data.student);
        if (data.alreadySubmitted) {
          setAlreadySubmitted(true);
          setQuizResult({
            score: data.result.score,
            maxScore: data.result.maxScore || examData?.maxScore || 10,
            percentage: data.result.percentage,
            timeSpentSeconds: data.result.timeSpentSeconds || 0,
          });
        } else {
          setQuestions(data.exam.questions || []);
          setSecondsRemaining((data.exam.duration || 15) * 60);
          setQuizStarted(true);
        }
      } else {
        setVerifyError(data.error || 'بيانات التحقق غير صحيحة');
      }
    } catch {
      setVerifyError('حدث خطأ أثناء التحقق، يرجى التأكد من اتصال الإنترنت');
    } finally {
      setIsVerifying(false);
    }
  };

  // Select Option Answer
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: String(optionIndex),
    }));
  };

  // Submit Quiz
  const handleSubmitQuiz = async () => {
    if (isSubmitting || !currentStudent) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/quiz/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentStudent.id,
          answers,
          timeSpentSeconds: timeSpent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setQuizResult(data.result);
      } else {
        alert(data.error || 'تعذر إرسال الإجابات');
      }
    } catch {
      alert('حدث خطأ في الاتصال أثناء تسليم الاختبار');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format Time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // ===================== RENDER: LOADING OR ERROR =====================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-slate-200">جاري تحميل الكويز...</h2>
        <p className="text-xs text-slate-400 mt-1">يرجى الانتظار ثوانٍ معدودة</p>
      </div>
    );
  }

  if (fetchError || !examData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-black text-white">تعذر فتح الكويز</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md">{fetchError || 'الرابط غير صالح أو تم إغلاق الاختبار'}</p>
      </div>
    );
  }

  // ===================== RENDER: PHASE 3 - RESULTS & BREAKDOWN =====================
  if (quizResult) {
    const optionLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
    const isPassing = quizResult.percentage >= 50;

    return (
      <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6 flex flex-col items-center justify-center" dir="rtl">
        <div className="w-full max-w-3xl space-y-6">
          {/* Header Result Card */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="inline-flex p-3.5 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-1">
              <Award className="w-10 h-10" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white">
              {alreadySubmitted ? 'نتيجة الاختبار السابقة' : 'تم تسليم الاختبار بنجاح! 🎉'}
            </h1>
            <p className="text-xs text-slate-400 font-semibold">
              {examData.title} • {examData.group.name}
            </p>

            {currentStudent && (
              <div className="inline-block px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-200">
                👤 الطالب: <span className="font-bold text-amber-300">{currentStudent.name}</span>
              </div>
            )}

            {/* Score Pill */}
            <div className="py-4">
              <div className="inline-flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-950/80 border border-slate-800 shadow-inner">
                <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-purple-400 to-emerald-400 font-mono">
                  {quizResult.score} / {quizResult.maxScore}
                </span>
                <span className="text-xs font-bold text-slate-400 mt-2 font-mono">
                  النسبة المئوية: {quizResult.percentage}% ({isPassing ? 'ناجح ⭐' : 'يحتاج تحسين'})
                </span>
              </div>
            </div>

            {/* WhatsApp Confirmation Alert */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2 text-xs text-emerald-300">
              <Send className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>تم إرسال كود الطالب وبيانات حسابك والنتيجة إلى واتساب الطالب وولي الأمر تلقائياً 📲</span>
            </div>
          </div>

          {/* Model Answers Breakdown (if enabled) */}
          {quizResult.breakdown && quizResult.breakdown.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  مراجعة الإجابات والحل النموذجي
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {quizResult.breakdown.length} أسئلة
                </span>
              </div>

              <div className="space-y-4">
                {quizResult.breakdown.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`p-4 rounded-2xl border transition ${
                      item.isCorrect
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-rose-950/20 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-amber-400 font-mono">س{idx + 1}:</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.isCorrect
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {item.isCorrect ? `+${item.points} درجة` : '0 درجة'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-3 leading-relaxed">
                      {item.questionText}
                    </h4>

                    {/* Options list */}
                    <div className="space-y-1.5">
                      {item.options.map((opt, oIdx) => {
                        const isStudentChoice = String(oIdx) === String(item.studentAnswer);
                        const isCorrectAnswer = String(oIdx) === String(item.correctAnswer);

                        let optClass = 'bg-slate-950/70 border-slate-800 text-slate-400';
                        if (isCorrectAnswer) {
                          optClass = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold';
                        } else if (isStudentChoice && !item.isCorrect) {
                          optClass = 'bg-rose-950/60 border-rose-500 text-rose-200 line-through';
                        }

                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${optClass}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-mono">
                                {optionLetters[oIdx] || oIdx + 1}
                              </span>
                              <span>{opt}</span>
                            </div>

                            {isCorrectAnswer && (
                              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> الإجابة الصحيحة
                              </span>
                            )}
                            {isStudentChoice && !isCorrectAnswer && (
                              <span className="text-[10px] text-rose-400 font-bold">
                                إجابتك الخاطئة ✕
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {item.explanation && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                        <span className="font-bold block mb-1">💡 تفسير وشرح الحل:</span>
                        {item.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow"
            >
              <GraduationCap className="w-4 h-4 text-purple-400" />
              <span>الانتقال لتسجيل الدخول إلى البوابة التعليمية</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ===================== RENDER: PHASE 2 - LIVE QUIZ PLAYER =====================
  if (quizStarted && questions.length > 0) {
    const currentQ = questions[currentQuestionIndex];
    const optionLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).length;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
    const isUrgent = secondsRemaining < 120; // less than 2 minutes

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between" dir="rtl">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs md:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                {examData.title}
              </h2>
              <p className="text-[10px] text-slate-400">
                👤 {currentStudent?.name} ({answeredCount} من {totalQuestions} مُجاب)
              </p>
            </div>

            {/* Countdown Timer Pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border font-mono font-bold text-xs sm:text-sm transition ${
                isUrgent
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="max-w-4xl mx-auto mt-2">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-purple-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </header>

        {/* Main Question Area */}
        <main className="max-w-3xl w-full mx-auto p-4 sm:p-6 my-auto space-y-5">
          {/* Question Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = currentQuestionIndex === idx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold font-mono shrink-0 transition flex items-center justify-center ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50 shadow-lg'
                      : isAnswered
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Question Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-400">
                السؤال {currentQuestionIndex + 1} من {totalQuestions}
              </span>
              <span className="text-[10px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-mono">
                ⭐ {currentQ.points} {currentQ.points > 2 ? 'درجات' : 'درجة'}
              </span>
            </div>

            {/* Question Text */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed whitespace-pre-wrap">
                {currentQ.questionText}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((opt, idx) => {
                const isSelected = answers[currentQ.id] === String(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, idx)}
                    className={`w-full p-4 rounded-2xl border text-right transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-white font-bold ring-1 ring-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold font-mono shrink-0 transition ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {optionLetters[idx] || idx + 1}
                      </span>
                      <span className="text-sm font-semibold">{opt}</span>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            {isLastQuestion ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitQuiz}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التسليم...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>إنهاء وتسليم الاختبار ✅</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <span>السؤال التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>

        <footer className="text-center py-3 text-[10px] text-slate-500">
          منصة المايسترو التعليمية • نظام الاختبارات الإلكترونية الذكية
        </footer>
      </div>
    );
  }

  // ===================== RENDER: PHASE 1 - VERIFICATION & ACTIVATION =====================
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-3 sm:p-6" dir="rtl">
      <div className="w-full max-w-xl space-y-5">
        {/* Exam Presentation Card */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 text-center relative overflow-hidden">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 text-amber-400">
            <Zap className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{examData.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              مجموعة: <span className="text-amber-300 font-bold">{examData.group.name}</span>
              {examData.group.stageName ? ` (${examData.group.stageName})` : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400">المدة الزمنية</span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                ⏱️ {examData.duration} دقيقة
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400">عدد الأسئلة</span>
              <span className="text-xs font-bold text-purple-400 font-mono">
                📝 {examData.questionsCount} أسئلة
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400">الدرجة الكلية</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                ⭐ {examData.maxScore} درجات
              </span>
            </div>
          </div>
        </div>

        {/* Verification / Login Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-400" />
              تسجيل الدخول وبدء الاختبار
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              اختر طريقة الدخول المناسبة لك لبدء الكويز فوراً
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setLoginMode('ACTIVATION');
                setVerifyError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                loginMode === 'ACTIVATION'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>تفعيل لأول مرة (بالأرقام)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('CREDENTIALS');
                setVerifyError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                loginMode === 'CREDENTIALS'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>دخول سريع (كود وباسورد)</span>
            </button>
          </div>

          {verifyError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyAndStart} className="space-y-4 text-xs">
            {loginMode === 'ACTIVATION' ? (
              <>
                {/* Step 1: Select Student Name */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    1️⃣ اختر اسمك من قائمة طلاب المجموعة *
                  </label>

                  {/* Search Box */}
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ابحث عن اسمك..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Student Select dropdown */}
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      setVerifyError(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- اضغط لاختيار اسمك من القائمة ({filteredStudents.length} طالب) --</option>
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Student Phone */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    2️⃣ رقم هاتف الطالب المسجل *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="010xxxxxxxx"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white font-mono text-right focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Step 3: Parent Phone */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    3️⃣ رقم هاتف ولي الأمر المسجل *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="011xxxxxxxx"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white font-mono text-right focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* WhatsApp Note */}
                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-200/90 flex items-start gap-2 leading-relaxed">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    فور الضغط على الزر، سيتم التحقق من بياناتك وإرسال <strong>كود الطالب وكلمة المرور</strong> إلى رقم الواتساب المسجل، وستبدأ جلسة الاختبار مباشرة!
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Credentials Login Fields */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    كود الطالب (اسم المستخدم) *
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: 1042 أو كودك المسجل"
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    كلمة المرور *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="أدخل كلمة المرور الخاصة بك"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>إذا نسيت كلمة المرور، يمكنك التبديل لتبويب "تفعيل لأول مرة" واستلامها مجدداً على الواتساب.</span>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black rounded-2xl text-sm shadow-xl shadow-amber-500/10 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق وبدء الاختبار...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>
                    {loginMode === 'ACTIVATION'
                      ? '🚀 تفعيل الحساب وبدء الاختبار الآن'
                      : '🚀 تسجيل الدخول وبدء الاختبار'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        <footer className="text-center text-[10px] text-slate-500">
          منصة المايسترو التعليمية • حماية ونزاهة الاختبارات الذكية
        </footer>
      </div>
    </div>
  );
}
