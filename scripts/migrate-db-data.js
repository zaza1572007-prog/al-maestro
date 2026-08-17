const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env if present
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalsIdx = trimmed.indexOf('=');
      if (equalsIdx !== -1) {
        const key = trimmed.slice(0, equalsIdx).trim();
        let value = trimmed.slice(equalsIdx + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

async function migrate() {
  const sourceUrl = process.env.OLD_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  console.log('--------------------------------------------------');
  console.log('🚀 Starting Data Migration to New Neon Database');
  console.log('--------------------------------------------------');

  if (!sourceUrl) {
    console.error('❌ Error: OLD_DATABASE_URL is missing in environment or .env file.');
    console.error('   Please set OLD_DATABASE_URL="postgresql://..." in your .env file.');
    process.exit(1);
  }

  if (!targetUrl || targetUrl.includes('YOUR_NEW_DATABASE_URL')) {
    console.error('❌ Error: DATABASE_URL is not configured with your new Neon connection string.');
    console.error('   Please update DATABASE_URL in your .env file with your actual Neon database URL.');
    process.exit(1);
  }

  console.log('🔗 Source Database URL:', sourceUrl.replace(/:[^:@]+@/, ':****@'));
  console.log('🔗 Target Database URL:', targetUrl.replace(/:[^:@]+@/, ':****@'));
  console.log('--------------------------------------------------');

  const source = new Client({
    connectionString: sourceUrl,
    ssl: sourceUrl.includes('localhost') || sourceUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });

  const target = new Client({
    connectionString: targetUrl,
    ssl: targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });

  try {
    console.log('⌛ Connecting to Source Database...');
    await source.connect();
    console.log('✅ Connected to Source Database!');

    console.log('⌛ Connecting to Target Database...');
    await target.connect();
    console.log('✅ Connected to Target Database!');
  } catch (connErr) {
    console.error('❌ Database connection error:', connErr.message);
    process.exit(1);
  }

  // Order of tables to respect foreign key constraints
  const tables = [
    'User',
    'AcademicStage',
    'Parent',
    'Group',
    'Student',
    'RegistrationRequest',
    'LessonSession',
    'Attendance',
    'Homework',
    'HomeworkSubmission',
    'Exam',
    'ExamResult',
    'Subscription',
    'Payment',
    'Task',
    'ParentCommunication',
    'StaffAttendance',
    'ActivityLog',
    'File',
    'Notification',
    'SystemSettings',
    'Vacation',
  ];

  let totalMigratedRows = 0;

  for (const table of tables) {
    try {
      console.log(`\n📦 Table "${table}": fetching records...`);
      const { rows } = await source.query(`SELECT * FROM "${table}"`);

      if (rows.length === 0) {
        console.log(`  ℹ️ Table "${table}" has 0 records, skipping.`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const colNames = columns.map((c) => `"${c}"`).join(', ');

      let migratedCount = 0;
      for (const row of rows) {
        const values = columns.map((c) => {
          const val = row[c];
          // Handle object values for JSON columns
          if (val !== null && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val)) {
            return JSON.stringify(val);
          }
          return val;
        });

        const valuePlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        const insertQuery = `
          INSERT INTO "${table}" (${colNames})
          VALUES (${valuePlaceholders})
          ON CONFLICT DO NOTHING
        `;

        await target.query(insertQuery, values);
        migratedCount++;
      }

      console.log(`  ✅ Successfully migrated ${migratedCount}/${rows.length} rows for "${table}".`);
      totalMigratedRows += migratedCount;
    } catch (err) {
      console.error(`  ⚠️ Warning migrating table "${table}":`, err.message);
    }
  }

  await source.end();
  await target.end();

  console.log('\n==================================================');
  console.log(`🎉 DATA MIGRATION COMPLETE! Migrated ${totalMigratedRows} total rows.`);
  console.log('==================================================\n');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
