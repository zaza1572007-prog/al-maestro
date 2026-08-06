const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Testing prisma student creation...');
    const parent = await prisma.parent.findFirst();
    console.log('Found parent:', parent);

    const testStudent = await prisma.student.create({
      data: {
        code: 'TEST-' + Math.floor(Math.random() * 10000),
        name: 'Test Student',
        phone: '010' + Math.floor(Math.random() * 100000000),
        academicStageId: 'non-existent-id', // will fail on FK constraint, but let's see if it parses
        groupId: 'non-existent-id',
        parentId: parent ? parent.id : 'non-existent-id',
        qrCode: 'QR-TEST-' + Math.floor(Math.random() * 10000),
        password: 'password_test',
      }
    });
    console.log('Student created:', testStudent);
  } catch (error) {
    console.error('FULL PRISMA ERROR REPORT:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
