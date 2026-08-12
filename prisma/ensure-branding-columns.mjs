/**
 * prisma/ensure-branding-columns.mjs
 *
 * Safely adds new branding, layout configurations and identity settings
 * columns to SystemSettings using raw SQL.
 * Uses IF NOT EXISTS so it is always idempotent and safe to re-run.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envFiles = ['.env', '.env.local', '.env.development.local', '.env.production.local'];
  for (const file of envFiles) {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  }
}

loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('⚠️ DATABASE_URL is not set. Skipping DB migration step.');
  process.exit(0);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Existing columns
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitBase64" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "logoBase64" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "autoSendCredentials" BOOLEAN DEFAULT true;`);

  // New columns
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "contactWhatsapp" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "motivationQuote" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitOpacity" DOUBLE PRECISION DEFAULT 0.18;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitScale" DOUBLE PRECISION DEFAULT 1.0;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitPosition" TEXT DEFAULT 'side';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "logoScale" DOUBLE PRECISION DEFAULT 1.0;`);
  // Multi-device branding and responsive columns
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitTabletBase64" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitMobileBase64" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitConfig" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Student" ALTER COLUMN "phone" DROP NOT NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "schedule" JSONB;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "passwordPlain" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "passwordPlain" TEXT;`);

  // Generate plain passwords for legacy students who don't have passwordPlain
  const studentsWithoutPlain = await prisma.student.findMany({
    where: { OR: [{ passwordPlain: null }, { passwordPlain: '' }] },
    select: { id: true },
  });

  const bcrypt = require('bcrypt');
  for (const stu of studentsWithoutPlain) {
    const plainPass = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = await bcrypt.hash(plainPass, 10);
    await prisma.student.update({
      where: { id: stu.id },
      data: {
        password: hashed,
        passwordPlain: plainPass,
      },
    });
  }

  // Generate plain passwords for legacy parents who don't have passwordPlain
  const parentsWithoutPlain = await prisma.parent.findMany({
    where: { OR: [{ passwordPlain: null }, { passwordPlain: '' }] },
    select: { id: true },
  });

  for (const pr of parentsWithoutPlain) {
    const plainPass = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = await bcrypt.hash(plainPass, 10);
    await prisma.parent.update({
      where: { id: pr.id },
      data: {
        password: hashed,
        passwordPlain: plainPass,
      },
    });
  }

  console.log('✅ Branding and dynamic columns are ready.');
}

main()
  .catch((e) => {
    console.warn('⚠️ ensure-branding-columns warning:', e.message);
  })
  .finally(() => prisma.$disconnect());
