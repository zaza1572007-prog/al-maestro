'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Zap,
  Award,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Check,
  Loader2,
  Clock,
  BookOpen
} from 'lucide-react';

interface QuizQuestion {
  id: string;
  questionText: string;
  image?: string | null;
  type: string;
  options: string[];
  points: number;
}

interface QuestionReview {
  id: string;
  questionText: string;
  type: string;
  options: string[];
  studentAnswer?: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  explanation?: string | null;
}

export default function StudentQuizPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startTime] = useState<Date>(new Date());

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/student-portal/exams/${examId}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'تعذر تحميل الاختبار');
          return;
        }

        if (data.alreadySubmitted) {
          setIsCompleted(true);
          setExam(data.exam);
          setQuizResult(data.result);
          return;
        }

        setExam(data.exam);
        const qs = data.exam.questions || [];
        setQuestions(qs);

        const totalSecs = (data.exam.duration || 15) * 60;
        setSecondsRemaining(totalSecs);
        setTimerActive(true);
      } catch (err: any) {
        console.error(err);
        setError('حدث خطأ في الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    };

    if (examId) fetchQuiz();
  }, [examId]);

  // Countdown Timer Handler
  useEffect(() => {
    if (!timerActive || isCompleted) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, isCompleted]);

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (isCompleted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: String(optionIdx),
    }));
  };

  const handleAutoSubmit = () => {
    handleSubmitQuiz(true);
  };

  const handleSubmitQuiz = async (isTimeOut = false) => {
    if (submitting || isCompleted) return;

    if (!isTimeOut) {
      const answeredCount = Object.keys(answers).length;
      if (answeredCount < questions.length) {
        const confirmSubmit = confirm(
          `لقد قمت بحل ${answeredCount} من أصل ${questions.length} أسئلة.\nهل أنت متأكد من رغبتك في تسليم الاختبار الآن؟`
        );
        if (!confirmSubmit) return;
      }
    }

    setSubmitting(true);
    setTimerActive(false);

    try {
      const timeSpent = Math.max(1, Math.round((new Date().getTime() - startTime.getTime()) / 1000));
      const res = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          startedAt: startTime.toISOString(),
          timeSpentSeconds: timeSpent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setQuizResult(data.result);
        setIsCompleted(true);
      } else {
        alert(data.error || 'حدث خطأ أثناء تسليم الاختبار');
        setTimerActive(true);
      }
    } catch {
      alert('حدث خطأ في الاتصال');
      setTimerActive(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
        <p className="text-base font-bold text-slate-300">جارٍ تهيئة جلسة الاختبار الإلكتروني...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">تعذر فتح الاختبار</h3>
        <p className="text-sm text-slate-400">{error}</p>
        <Link
          href="/student-portal/exams"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لقائمة الامتحانات</span>
        </Link>
      </div>
    );
  }

  // Format timer into MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgentTime = secondsRemaining <= 120 && secondsRemaining > 0;

  // ---------------------------------------------------------------------------------
  // VIEW 1: COMPLETED RESULTS & EXPLANATIONS VIEW
  // ---------------------------------------------------------------------------------
  if (isCompleted && quizResult) {
    const isPassed = quizResult.percentage >= 50;

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* Results Hero Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-8 rounded-3xl border text-center relative overflow-hidden shadow-2xl ${
            isPassed
              ? 'bg-gradient-to-b from-emerald-500/20 via-slate-900 to-slate-950 border-emerald-500/40'
              : 'bg-gradient-to-b from-rose-500/20 via-slate-900 to-slate-950 border-rose-500/40'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-white/10 shadow-lg text-3xl">
            {isPassed ? '🎉' : '📖'}
          </div>

          <h2 className="text-2xl font-black text-white">
            {isPassed ? 'أحسنت! تم إنهاء الاختبار وتصحيحه بنجاح' : 'تم تسليم الاختبار وتصحيحه'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">{exam?.title}</p>

          <div className="my-6 inline-flex items-center gap-4 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
            <div>
              <span className="text-xs text-slate-400 block font-semibold">درجتك النهائية</span>
              <span className="text-3xl font-black text-white font-mono">
                {quizResult.score} <span className="text-sm text-slate-400 font-normal">/ {quizResult.maxScore}</span>
              </span>
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <div>
              <span className="text-xs text-slate-400 block font-semibold">النسبة المئوية</span>
              <span
                className={`text-3xl font-black font-mono ${
                  isPassed ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {quizResult.percentage}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/student-portal/exams"
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition"
            >
              العودة للوحة الامتحانات
            </Link>
          </div>
        </motion.div>

        {/* Detailed Questions & Solutions Review */}
        {quizResult.review && quizResult.review.length > 0 && (
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>مراجعة الإجابات والحل النموذجي المشروح</span>
              </h3>
              <span className="text-xs text-slate-400">
                {quizResult.review.filter((r: any) => r.isCorrect).length} إجابة صحيحة من {quizResult.review.length}
              </span>
            </div>

            <div className="space-y-4">
              {quizResult.review.map((q: QuestionReview, idx: number) => (
                <div
                  key={q.id || idx}
                  className={`p-5 rounded-2xl border space-y-3 ${
                    q.isCorrect
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-rose-500/5 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          q.isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <p className="text-sm font-bold text-white leading-relaxed">{q.questionText}</p>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        q.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {q.isCorrect ? `+${q.points} درجة ✓` : '0 درجة ✕'}
                    </span>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt, optIdx) => {
                      const isStudentPick = q.studentAnswer === String(optIdx);
                      const isCorrectAnswer = q.correctAnswer === String(optIdx);

                      let badgeStyle = 'bg-slate-950/60 border-slate-800 text-slate-400';
                      if (isCorrectAnswer) {
                        badgeStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold';
                      } else if (isStudentPick && !q.isCorrect) {
                        badgeStyle = 'bg-rose-500/20 border-rose-500 text-rose-200 font-bold';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${badgeStyle}`}
                        >
                          <span>{opt}</span>
                          {isCorrectAnswer && <Check className="w-4 h-4 text-emerald-400" />}
                          {isStudentPick && !q.isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Teacher's Solution Explanation */}
                  {q.explanation && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                      <span className="font-bold text-amber-400 block">💡 الشرح وتفسير الحل النموذجي:</span>
                      <p className="text-slate-300 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------------
  // VIEW 2: INTERACTIVE QUIZ PLAYER
  // ---------------------------------------------------------------------------------
  const currentQ = questions[currentIdx];
  if (!currentQ) return null;

  const currentAnswer = answers[currentQ.id];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 select-none">
      {/* Top Floating Quiz Header & Timer */}
      <div className="p-4 md:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 sticky top-4 z-40">
        <div>
          <h2 className="text-sm md:text-base font-black text-white truncate max-w-[200px] md:max-w-xs">
            {exam?.title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تمت الإجابة: <strong className="text-purple-300">{answeredCount}</strong> من {questions.length}
          </p>
        </div>

        {/* Live Countdown Timer Pill */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-bold text-base transition-all ${
            isUrgentTime
              ? 'bg-rose-500/20 text-rose-400 border-rose-500 animate-pulse shadow-lg shadow-rose-500/20'
              : 'bg-slate-950 text-amber-400 border-slate-800'
          }`}
        >
          <Timer className="w-4 h-4" />
          <span>{timeFormatted}</span>
        </div>
      </div>

      {/* Question Stepper & Navigator Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
        {questions.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined;
          const isCurrent = currentIdx === idx;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              className={`w-9 h-9 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center justify-center ${
                isCurrent
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105 ring-2 ring-purple-400'
                  : isAnswered
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Main Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6"
        >
          {/* Question Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              السؤال {currentIdx + 1} من {questions.length}
            </span>
            <span className="text-xs text-slate-400 font-semibold">{currentQ.points} درجات</span>
          </div>

          {/* Question Text */}
          <h3 className="text-base md:text-lg font-bold text-white leading-relaxed">{currentQ.questionText}</h3>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = currentAnswer === String(optIdx);

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(currentQ.id, optIdx)}
                  className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-4 group ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border-purple-500 text-white font-bold shadow-lg shadow-purple-600/15'
                      : 'bg-slate-950/80 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                      }`}
                    >
                      {['أ', 'ب', 'ج', 'د', 'هـ'][optIdx] || optIdx + 1}
                    </span>
                    <span className="text-sm font-semibold">{opt}</span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-600 text-white'
                        : 'border-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation & Submit Buttons */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-purple-600/25"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitQuiz(false)}
                className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/25 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تصحيح الاختبار...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>تسليم الاختبار النهائي 🏁</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
