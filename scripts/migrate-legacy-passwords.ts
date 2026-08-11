import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting legacy password migration...');

  // 1. Migrate Students
  const studentsWithoutPass = await prisma.student.findMany({
    where: {
      OR: [
        { passwordPlain: null },
        { passwordPlain: '' },
        { password: null },
        { password: '' }
      ]
    }
  });

  console.log(`🔍 Found ${studentsWithoutPass.length} students missing plain or hashed passwords.`);

  for (const student of studentsWithoutPass) {
    try {
      const studentPass = Math.floor(100000 + Math.random() * 900000).toString();
      const hashed = await bcrypt.hash(studentPass, 10);
      await prisma.student.update({
        where: { id: student.id },
        data: {
          password: hashed,
          passwordPlain: studentPass
        }
      });
      console.log(`✅ Updated password for student: ${student.name} (Code: ${student.code})`);
    } catch (err: any) {
      console.error(`❌ Failed to update password for student ${student.name}:`, err.message);
    }
  }

  // 2. Migrate Parents
  const parentsWithoutPass = await prisma.parent.findMany({
    where: {
      OR: [
        { passwordPlain: null },
        { passwordPlain: '' },
        { password: null },
        { password: '' }
      ]
    }
  });

  console.log(`\n🔍 Found ${parentsWithoutPass.length} parents missing plain or hashed passwords.`);

  for (const parent of parentsWithoutPass) {
    try {
      const parentPass = Math.floor(100000 + Math.random() * 900000).toString();
      const hashed = await bcrypt.hash(parentPass, 10);
      await prisma.parent.update({
        where: { id: parent.id },
        data: {
          password: hashed,
          passwordPlain: parentPass
        }
      });
      console.log(`✅ Updated password for parent: ${parent.name} (Phone: ${parent.phone})`);
    } catch (err: any) {
      console.error(`❌ Failed to update password for parent ${parent.name}:`, err.message);
    }
  }

  console.log('\n🎉 Migration complete!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
