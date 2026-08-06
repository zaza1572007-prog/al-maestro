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

  // New columns
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "contactWhatsapp" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "motivationQuote" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitOpacity" DOUBLE PRECISION DEFAULT 0.18;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitScale" DOUBLE PRECISION DEFAULT 1.0;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitPosition" TEXT DEFAULT 'side';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "logoScale" DOUBLE PRECISION DEFAULT 1.0;`);

  console.log('✅ Branding and dynamic columns are ready.');
}

main()
  .catch((e) => {
    console.warn('⚠️ ensure-branding-columns warning:', e.message);
  })
  .finally(() => prisma.$disconnect());
