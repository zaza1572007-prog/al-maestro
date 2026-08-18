const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const equalsIdx = trimmed.indexOf('=');
        const key = trimmed.slice(0, equalsIdx).trim();
        let value = trimmed.slice(equalsIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

async function checkSync() {
  const sourceUrl = process.env.OLD_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  console.log('--- Database Connection Check ---');
  console.log('Source (OLD_DATABASE_URL):', sourceUrl ? sourceUrl.replace(/:[^:@]+@/, ':****@') : 'Not defined');
  console.log('Target (DATABASE_URL):', targetUrl ? targetUrl.replace(/:[^:@]+@/, ':****@') : 'Not defined');

  if (!targetUrl) {
    console.error('DATABASE_URL is missing!');
    process.exit(1);
  }

  const target = new Client({
    connectionString: targetUrl,
    ssl: { rejectUnauthorized: false }
  });
  await target.connect();

  const targetAttRes = await target.query('SELECT count(*) FROM "Attendance"');
  const targetSessRes = await target.query('SELECT count(*) FROM "LessonSession"');
  const targetStudRes = await target.query('SELECT count(*) FROM "Student"');
  console.log(`Target DB: Students = ${targetStudRes.rows[0].count}, LessonSessions = ${targetSessRes.rows[0].count}, Attendance = ${targetAttRes.rows[0].count}`);

  if (sourceUrl) {
    try {
      const source = new Client({
        connectionString: sourceUrl,
        ssl: { rejectUnauthorized: false }
      });
      await source.connect();

      const sourceAttRes = await source.query('SELECT count(*) FROM "Attendance"');
      const sourceSessRes = await source.query('SELECT count(*) FROM "LessonSession"');
      const sourceStudRes = await source.query('SELECT count(*) FROM "Student"');
      console.log(`Source DB: Students = ${sourceStudRes.rows[0].count}, LessonSessions = ${sourceSessRes.rows[0].count}, Attendance = ${sourceAttRes.rows[0].count}`);

      // Find any Attendance records in Source that are not in Target
      const diffAttRes = await source.query(`
        SELECT a.* FROM "Attendance" a
        LEFT JOIN "Attendance" t ON a.id = t.id
        WHERE t.id IS NULL
      `);
      console.log(`Missing Attendance records in Target DB: ${diffAttRes.rows.length}`);

      const diffSessRes = await source.query(`
        SELECT s.* FROM "LessonSession" s
        LEFT JOIN "LessonSession" t ON s.id = t.id
        WHERE t.id IS NULL
      `);
      console.log(`Missing LessonSession records in Target DB: ${diffSessRes.rows.length}`);

      await source.end();
    } catch (err) {
      console.error('Could not connect to source DB:', err.message);
    }
  }

  await target.end();
}

checkSync().catch(console.error);
