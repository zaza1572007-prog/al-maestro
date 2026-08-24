import { prisma } from '../lib/prisma';

async function main() {
  const student = await prisma.student.findFirst({
    where: { code: 'STU-4947' },
    include: {
      group: {
        include: {
          students: true
        }
      },
      examResults: {
        include: { exam: true }
      }
    }
  });

  if (!student) {
    console.log('Student not found');
    return;
  }

  console.log('STUDENT:', student.name, student.code, 'Group:', student.group?.name);
  console.log('Total students in group:', student.group?.students.length);

  for (const er of student.examResults) {
    console.log('Exam Result:', er.exam.title, 'Score:', er.score, 'MaxScore:', er.exam.maxScore, 'Percentage:', er.percentage, 'Rank field in DB:', er.rank);
    const allResults = await prisma.examResult.findMany({
      where: { examId: er.examId },
      include: { student: { select: { name: true, code: true } } }
    });
    console.log('All Results for this Exam count:', allResults.length);
    console.log('All Results details:', allResults.map(r => ({ name: r.student.name, score: r.score })));
  }
}

main().finally(() => prisma.$disconnect());
