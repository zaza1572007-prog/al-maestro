'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import {
  Award,
  Trophy,
  Zap,
  Timer,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  Loader2
} from 'lucide-react';

interface AvailableQuiz {
  id: string;
  title: string;
  description?: string;
  questionsCount: number;
  duration: number;
  maxScore: number;
  date: string;
}

interface CompletedExam {
  id: string;
  resultId: string;
  title: string;
  description?: string;
  type: string;
  isOnline?: boolean;
  isAutoGraded?: boolean;
  date: string;
  score: number;
  maxScore: number;
  percentage: number;
  rank?: string | null;
  timeSpentSeconds?: number;
  showAnswers?: boolean;
  evaluation: string;
}

export default function StudentExamsPage() {
  const [availableQuizzes, setAvailableQuizzes] = useState<AvailableQuiz[]>([]);
  const [completedExams, setCompletedExams] = useState<CompletedExam[]>([]);
  const [average, setAverage] = useState('0%');
  const [totalGraded, setTotalGraded] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/student-portal/exams');
      const data = await res.json();
      if (data.success) {
        setAvailableQuizzes(data.availableQuizzes || []);
        setCompletedExams(data.completedExams || []);
        setAverage(data.average || '0%');
        setTotalGraded(data.totalGraded || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400">جارٍ تجهيز امتحاناتك وكويزاتك...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <HeroHeader
        title="امتحاناتي وكويزاتي 📝"
        badge="بوابة التعلم الذكي"
        subtitle="أدّ الاختبارات التفاعلية أونلاين، وتابع درجاتك ونتائجك وترتيبك بين زملائك أولاً بأول."
        stats={[
          { label: 'متوسط الدرجات', value: average, color: 'text-purple-400' },
          { label: 'امتحانات تم تقييمها', value: totalGraded, color: 'text-emerald-400' },
          { label: 'كويزات أونلاين بانتظارك', value: availableQuizzes.length, color: 'text-amber-400' },
        ]}
      />

      {/* 1. Active / Available Online Quizzes Section */}
      {availableQuizzes.length > 0 && (
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-purple-600/5 to-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span>كويزات أونلاين متاحة للحل الآن</span>
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {availableQuizzes.length} متاح
                  </span>
                </h2>
                <p className="text-xs text-slate-400">اختبارات تفاعلية بمؤقت زمني وتصحيح فوري</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {availableQuizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                whileHover={{ y: -3 }}
                className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-400 flex flex-col justify-between shadow-xl transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      ⚡ تصحيح ذاتي فوري
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {quiz.date}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-2.5">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{quiz.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800">
                    <span className="flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      المدة: <strong className="text-white">{quiz.duration} دقيقة</strong>
                    </span>
                    <span>•</span>
                    <span>
                      الأسئلة: <strong className="text-white">{quiz.questionsCount} سؤال</strong>
                    </span>
                    <span>•</span>
                    <span>
                      الدرجة: <strong className="text-purple-300">{quiz.maxScore}</strong>
                    </span>
                  </div>
                </div>

                <Link
                  href={`/student-portal/exams/${quiz.id}`}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm text-center flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>بدء الاختبار الآن 🚀</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Past / Completed Exams & Records */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-400" />
          <span>سجل الامتحانات والدرجات السابقة ({completedExams.length})</span>
        </h2>

        {completedExams.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/60 rounded-2xl border border-slate-800">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-400">لا توجد امتحانات مسجلة حتى الآن</p>
            <p className="text-xs text-slate-500 mt-1">ستظهر نتائجك وتقييماتك هنا فور رصدها من قبل الأستاذ.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedExams.map((exam) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{exam.title}</h4>
                    {exam.isOnline && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        ⚡ كويز أونلاين
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1">تاريخ الامتحان: {exam.date}</p>

                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {exam.rank && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30 font-bold flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" /> {exam.rank}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        exam.percentage >= 85
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : exam.percentage >= 60
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {exam.evaluation}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between md:justify-end">
                  {exam.isOnline && (
                    <Link
                      href={`/student-portal/exams/${exam.id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-purple-200 text-xs font-bold transition flex items-center gap-1"
                    >
                      <span>مراجعة الإجابات</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  <div className="text-left bg-purple-950/40 border border-purple-500/20 px-4 py-2 rounded-2xl">
                    <span className="text-xl font-black text-purple-300 font-mono">
                      {exam.score}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">/ {exam.maxScore}</span>
                    <span className="block text-[10px] font-bold text-slate-400 text-center mt-0.5 font-mono">
                      ({exam.percentage}%)
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
