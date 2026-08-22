const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const student = await prisma.student.findFirst({
    where: { code: 'STU-4947' },
    include: {
      academicStage: true,
      group: true,
      subscriptions: {
        where: { status: 'ACTIVE' },
        orderBy: { endDate: 'desc' },
        take: 1,
      },
      attendances: {
        orderBy: { createdAt: 'desc' },
      },
      submissions: {
        include: { homework: true },
        orderBy: { submittedAt: 'desc' },
      },
      examResults: {
        include: { exam: true },
        orderBy: { gradedAt: 'desc' },
        take: 2,
      },
    },
  });

  console.log('Mahmoud examResults length:', student.examResults.length);
  for (const r of student.examResults) {
    console.log('Exam Result:', r.exam.title, 'Score:', r.score, 'GradedAt:', r.gradedAt);
  }

  const examIds = student.examResults.map((r) => r.examId);
  const allResultsForExams = examIds.length > 0
    ? await prisma.examResult.findMany({
        where: { examId: { in: examIds } },
        select: { examId: true, score: true },
      })
    : [];

  const scoresByExamMap = new Map();
  for (const res of allResultsForExams) {
    if (!scoresByExamMap.has(res.examId)) {
      scoresByExamMap.set(res.examId, []);
    }
    scoresByExamMap.get(res.examId).push(res.score);
  }

  const rankTextMap = new Map();
  for (const [examId, scores] of scoresByExamMap.entries()) {
    const sortedUnique = Array.from(new Set(scores)).sort((a, b) => b - a);
    console.log('ExamId:', examId, 'Sorted Unique Scores:', sortedUnique);
    rankTextMap.set(examId, (score) => {
      const idx = sortedUnique.indexOf(score);
      console.log('Score:', score, 'idx in sortedUnique:', idx);
      if (idx === 0) return 'المركز الأول على المجموعة 🥇';
      if (idx === 1) return 'المركز الثاني على المجموعة 🥈';
      if (idx === 2) return 'المركز الثالث على المجموعة 🥉';
      return null;
    });
  }

  const latestResult = student.examResults[0];
  const latestExamRank = latestResult
    ? rankTextMap.get(latestResult.examId)?.(latestResult.score) || null
    : null;

  console.log('Calculated latestExamRank:', latestExamRank);
}

main().finally(() => prisma.$disconnect());
