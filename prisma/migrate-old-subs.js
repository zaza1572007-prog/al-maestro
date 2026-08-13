const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// 1. Load environment variables from .env
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        let value = trimmed.slice(index + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.warn('⚠️ [Migration] Could not load .env file:', e.message);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ [Migration] DATABASE_URL is not defined in process.env');
  process.exit(1);
}

// 2. Initialize Prisma Client with PostgreSQL adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🤖 [Migration] Starting database migration for old subscriptions and payments...');

  // 1. Migrate subscriptions (set month and year from startDate)
  const subsToMigrate = await prisma.subscription.findMany({
    where: {
      OR: [
        { month: null },
        { year: null }
      ]
    }
  });

  console.log(`🤖 [Migration] Found ${subsToMigrate.length} subscriptions with empty month/year fields.`);

  let migratedSubsCount = 0;
  for (const sub of subsToMigrate) {
    const date = new Date(sub.startDate);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    try {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          month,
          year,
          paidAt: sub.paidAt || (sub.status === 'PAID' ? sub.updatedAt : null)
        }
      });
      migratedSubsCount++;
    } catch (err) {
      console.error(`❌ [Migration] Failed to migrate subscription ${sub.id}:`, err.message);
    }
  }

  console.log(`🤖 [Migration] Successfully migrated ${migratedSubsCount} subscriptions.`);

  // 2. Migrate payments (set month, year and paidAt from subscription and createdAt)
  const paymentsToMigrate = await prisma.payment.findMany({
    where: {
      OR: [
        { month: null },
        { year: null }
      ]
    },
    include: {
      subscription: true
    }
  });

  console.log(`🤖 [Migration] Found ${paymentsToMigrate.length} payments with empty month/year fields.`);

  let migratedPaymentsCount = 0;
  for (const pay of paymentsToMigrate) {
    if (pay.subscription) {
      const month = pay.subscription.month || new Date(pay.subscription.startDate).getMonth() + 1;
      const year = pay.subscription.year || new Date(pay.subscription.startDate).getFullYear();

      try {
        await prisma.payment.update({
          where: { id: pay.id },
          data: {
            month,
            year,
            paidAt: pay.paidAt || pay.createdAt
          }
        });
        migratedPaymentsCount++;
      } catch (err) {
        console.error(`❌ [Migration] Failed to migrate payment ${pay.id}:`, err.message);
      }
    }
  }

  console.log(`🤖 [Migration] Successfully migrated ${migratedPaymentsCount} payments.`);
}

main()
  .catch((e) => {
    console.error('❌ [Migration Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
