const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const s = await prisma.student.findFirst({
    where: { code: 'STU-4947' },
    include: {
      group: true,
      examResults: { include: { exam: true } }
    }
  });

  if (!s) {
    console.log('Student STU-4947 not found!');
    return;
  }

  console.log('STUDENT:', s.name, 'Code:', s.code, 'Group:', s.group?.name);
  for (const r of s.examResults) {
    const all = await prisma.examResult.findMany({
      where: { examId: r.examId },
      include: { student: true }
    });
    console.log('\n--- EXAM:', r.exam.title, '---');
    console.log('Mahmoud score:', r.score, '/', r.exam.maxScore, 'Percentage:', r.percentage);
    console.log('Total results in DB for this exam:', all.length);
    console.log('All scores recorded for this exam:', all.map(a => ({ name: a.student.name, code: a.student.code, score: a.score })));
  }
}

main().finally(() => prisma.$disconnect());
