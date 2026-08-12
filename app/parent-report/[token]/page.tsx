import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import crypto from 'crypto';
import { Calendar, CheckCircle2, XCircle, Award, CreditCard, User, GraduationCap, Users, BookOpen } from 'lucide-react';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-maestro-secret-key-12345';

// Verify token on the server
function verifyMagicToken(token: string): { studentId: string; month: number; year: number } | null {
  try {
    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) return null;
    
    const payload = Buffer.from(base64Payload, 'base64url').toString('utf8');
    const [studentId, monthStr, yearStr] = payload.split(':');
    
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);
    if (!studentId || isNaN(month) || isNaN(year)) return null;

    const expectedHash = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    const expectedSignature = expectedHash.slice(0, 16);

    if (signature === expectedSignature) {
      return { studentId, month, year };
    }
  } catch (e) {
    // invalid token
  }
  return null;
}

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ParentReportPage({ params }: PageProps) {
  const { token } = await params;
  const verified = verifyMagicToken(token);

  if (!verified) {
    return notFound();
  }

  const { studentId, month, year } = verified;
  const monthName = arabicMonths[month - 1];

  // Fetch student details
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      academicStage: true,
      group: true,
    },
  });

  if (!student) {
    return notFound();
  }

  // Calculate monthly stats
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Fetch all sessions in the selected month for the student's group
  const sessions = await prisma.lessonSession.findMany({
    where: {
      groupId: student.groupId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    orderBy: { date: 'asc' },
  });

  const totalSessions = sessions.length;

  // Fetch all attendances for the student in this month
  const attendances = await prisma.attendance.findMany({
    where: {
      studentId: student.id,
      session: {
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    },
    include: { session: true },
    orderBy: { session: { date: 'asc' } },
  });

  const presentCount = attendances.filter(
    (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'LEFT_EARLY'
  ).length;
  
  const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;

  const absentDays = attendances
    .filter((a) => a.status === 'ABSENT')
    .map((a) => {
      const date = new Date(a.session.date);
      const dayName = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date);
      const dateStr = date.toISOString().split('T')[0];
      return { date: dateStr, day: dayName, title: a.session.title };
    });

  // Fetch exams taken during the month
  const examResults = await prisma.examResult.findMany({
    where: {
      studentId: student.id,
      exam: {
        examDate: { gte: startOfMonth, lte: endOfMonth },
      },
    },
    include: { exam: true },
    orderBy: { exam: { examDate: 'asc' } },
  });

  // Check subscription paid status for this month
  const subscription = await prisma.subscription.findFirst({
    where: {
      studentId: student.id,
      groupId: student.groupId,
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
    },
    include: {
      payments: true,
    },
  });

  let paymentStatus = 'UNPAID'; // UNPAID, PARTIAL, PAID
  let paidAmount = 0;
  let remainingAmount = 0;
  if (subscription) {
    paidAmount = subscription.payments.reduce((sum, p) => sum + p.paidAmount, 0);
    remainingAmount = subscription.price - paidAmount;
    if (paidAmount >= subscription.price || subscription.payments.some((p) => p.remainingAmount <= 0)) {
      paymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      paymentStatus = 'PARTIAL';
    }
  }

  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-10 px-4" dir="rtl">
      {/* Header Panel */}
      <div className="w-full max-w-4xl glass-panel p-6 rounded-3xl border border-white/10 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/60 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-3xl">
            🎓
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">تقرير المتابعة التفاعلي لولي الأمر</h1>
            <p className="text-xs text-slate-400 mt-1">منصة المايسترو للأستاذ أحمد راضي كحلة</p>
          </div>
        </div>
        <div className="px-5 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl text-sm font-black">
          تقرير شهر {monthName} {year} 📊
        </div>
      </div>

      {/* Main Grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Right Column: Student Info & Payment */}
        <div className="md:col-span-1 space-y-6">
          {/* Student Profile Card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/40">
            <h2 className="font-bold text-white text-md mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <User className="w-4 h-4 text-blue-400" />
              بيانات الطالب
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">اسم الطالب</p>
                <p className="font-bold text-white text-base mt-0.5">{student.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">كود الطالب</p>
                <p className="font-mono text-sm text-slate-300 font-semibold mt-0.5">{student.code}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">المرحلة الدراسية</p>
                <p className="font-bold text-slate-300 mt-0.5">{student.academicStage?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">المجموعة التعليمية</p>
                <p className="font-bold text-slate-300 mt-0.5">{student.group?.name || '—'}</p>
              </div>
            </div>
          </div>

          {/* Payment Status Card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/40">
            <h2 className="font-bold text-white text-md mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              حالة سداد الرسوم
            </h2>
            {paymentStatus === 'PAID' ? (
              <div className="text-center py-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                <p className="font-bold text-lg">مدفوع بالكامل ✅</p>
                <p className="text-xs text-slate-400 mt-1">تم تسوية اشتراك هذا الشهر</p>
              </div>
            ) : paymentStatus === 'PARTIAL' ? (
              <div className="text-center py-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-amber-400" />
                <p className="font-bold text-lg">مدفوع جزئياً ⚠️</p>
                <p className="text-xs text-slate-400 mt-1">المبلغ المدفوع: {paidAmount} ج.م</p>
                <p className="text-xs text-rose-400 font-bold mt-1">المتبقي: {remainingAmount} ج.م</p>
              </div>
            ) : (
              <div className="text-center py-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-400">
                <XCircle className="w-10 h-10 mx-auto mb-2 text-rose-400" />
                <p className="font-bold text-lg">مطلوب السداد ❌</p>
                {subscription ? (
                  <p className="text-xs text-slate-400 mt-1">قيمة الاشتراك: {subscription.price} ج.م</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">لم يتم تفعيل الاشتراك بعد</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Left Column: Attendance & Exams */}
        <div className="md:col-span-2 space-y-6">
          {/* Attendance Card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/40">
            <h2 className="font-bold text-white text-md mb-6 flex items-center gap-2 border-b border-white/5 pb-3">
              <Calendar className="w-4 h-4 text-blue-400" />
              سجل الحضور والغياب للشهـر
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mb-6">
              {/* Circular Gauge */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="50" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                  <circle cx="64" cy="64" r="50" stroke={attendanceRate >= 80 ? '#10b981' : attendanceRate >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="10" fill="transparent"
                          strokeDasharray="314" strokeDashoffset={314 - (314 * attendanceRate) / 100}
                          strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white">{attendanceRate}%</span>
                  <span className="text-[10px] text-slate-400">معدل الحضور</span>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-4 w-full sm:w-auto">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-center min-w-[80px]">
                  <p className="text-2xl font-black text-white">{totalSessions}</p>
                  <p className="text-[10px] text-slate-500 mt-1">حصص الشهر</p>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/10 text-center min-w-[80px]">
                  <p className="text-2xl font-black text-emerald-400">{presentCount}</p>
                  <p className="text-[10px] text-emerald-500 mt-1">حضور</p>
                </div>
                <div className="bg-rose-500/10 p-3 rounded-2xl border border-rose-500/10 text-center min-w-[80px]">
                  <p className="text-2xl font-black text-rose-400">{absentCount}</p>
                  <p className="text-[10px] text-rose-500 mt-1">غياب</p>
                </div>
              </div>
            </div>

            {/* List of absences */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 mb-2">أيام الغياب المسجلة:</h3>
              {absentDays.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {absentDays.map((day, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-xs text-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <div>
                        <p className="font-bold">{day.day} ({day.date})</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{day.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-400 font-semibold bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl">
                  🎉 ممتاز! لم يتم تسجيل أي غياب لهذا الطالب في هذا الشهر.
                </p>
              )}
            </div>
          </div>

          {/* Exams Card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/40">
            <h2 className="font-bold text-white text-md mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <Award className="w-4 h-4 text-amber-400" />
              نتائج الامتحانات والاختبارات القصيرة للشهر
            </h2>
            {examResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-white/5">
                      <th className="py-2.5 font-bold">الامتحان / الاختبار</th>
                      <th className="py-2.5 font-bold text-center">النوع</th>
                      <th className="py-2.5 font-bold text-left">الدرجة</th>
                      <th className="py-2.5 font-bold text-left">النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.map((result) => {
                      const exam = result.exam;
                      const typeStr = exam.type === 'QUIZ' ? 'قصير' : exam.type === 'MONTHLY' ? 'شهري' : exam.type === 'FINAL' ? 'نهائي' : 'عام';
                      return (
                        <tr key={result.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="py-3 font-bold text-white">{exam.title}</td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${exam.type === 'QUIZ' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`}>
                              {typeStr}
                            </span>
                          </td>
                          <td className="py-3 text-left font-mono font-bold text-slate-300">
                            {result.score} <span className="text-slate-600">/ {exam.maxScore}</span>
                          </td>
                          <td className={`py-3 text-left font-mono font-bold ${result.percentage >= 85 ? 'text-emerald-400' : result.percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {result.percentage}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">لا توجد اختبارات مسجلة هذا الشهر.</p>
            )}
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="w-full max-w-4xl text-center mt-10 text-xs text-slate-500 border-t border-white/5 pt-6">
        <p>تقرير إلكتروني موثق من نظام المايسترو لإدارة الطلاب.</p>
        <p className="mt-1">© 2026 جميع الحقوق محفوظة لمنصة المايسترو.</p>
      </div>
    </div>
  );
}
