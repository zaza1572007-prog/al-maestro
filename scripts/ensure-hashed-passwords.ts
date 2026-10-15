import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

// Load .env manually if not already populated
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

function isBcryptHash(str: string | null | undefined): boolean {
  if (!str) return false;
  return /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
}

async function main() {
  console.log('🔒 [Security Pre-Check] Verifying bcrypt password hashes across all accounts...');

  // 1. Check Users (Admins / Assistants)
  const users = await prisma.user.findMany();
  console.log(`\n📋 Checking ${users.length} User records...`);
  let usersFixed = 0;
  for (const u of users) {
    if (!isBcryptHash(u.password)) {
      const source = (u as any).passwordPlain || u.password || '123456';
      const hash = await bcrypt.hash(source, SALT_ROUNDS);
      await prisma.user.update({
        where: { id: u.id },
        data: { password: hash },
      });
      usersFixed++;
      console.log(`  ✅ Fixed User hash for: ${u.name} (${u.phone})`);
    }
  }
  console.log(`   Users check complete: ${usersFixed} updated, ${users.length - usersFixed} already secured.`);

  // 2. Check Students
  const students = await prisma.student.findMany();
  console.log(`\n📋 Checking ${students.length} Student records...`);
  let studentsFixed = 0;
  for (const s of students) {
    if (!isBcryptHash(s.password)) {
      const source = (s as any).passwordPlain || s.password || Math.floor(100000 + Math.random() * 900000).toString();
      const hash = await bcrypt.hash(source, SALT_ROUNDS);
      await prisma.student.update({
        where: { id: s.id },
        data: { password: hash },
      });
      studentsFixed++;
    }
  }
  console.log(`   Students check complete: ${studentsFixed} updated, ${students.length - studentsFixed} already secured.`);

  // 3. Check Parents
  const parents = await prisma.parent.findMany();
  console.log(`\n📋 Checking ${parents.length} Parent records...`);
  let parentsFixed = 0;
  for (const p of parents) {
    if (!isBcryptHash(p.password)) {
      const source = (p as any).passwordPlain || p.password || Math.floor(100000 + Math.random() * 900000).toString();
      const hash = await bcrypt.hash(source, SALT_ROUNDS);
      await prisma.parent.update({
        where: { id: p.id },
        data: { password: hash },
      });
      parentsFixed++;
    }
  }
  console.log(`   Parents check complete: ${parentsFixed} updated, ${parents.length - parentsFixed} already secured.`);

  console.log('\n🎉 [Success] All Student, Parent, and User accounts have valid bcrypt password hashes!');
}

main()
  .catch((err) => {
    console.error('❌ Error during password pre-check:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
