const { Client } = require('pg');

async function mergeData() {
  const sourceUrl = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const targetUrl = "postgresql://neondb_owner:npg_1YGVwfTQbep5@ep-square-river-axxc5ghb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require";

  console.log('==================================================');
  console.log('🚀 Merging Yesterday\'s Data into Main Server');
  console.log('==================================================');
  console.log('Source (Temp Server):', sourceUrl.replace(/:[^:@]+@/, ':****@'));
  console.log('Target (Main Server):', targetUrl.replace(/:[^:@]+@/, ':****@'));

  const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
  const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  await source.connect();
  await target.connect();
  console.log('✅ Connected to both databases successfully!');

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
      const { rows } = await source.query(`SELECT * FROM "${table}"`);
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const colNames = columns.map((c) => `"${c}"`).join(', ');

      let insertedCount = 0;
      for (const row of rows) {
        const values = columns.map((c) => {
          const val = row[c];
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

        const res = await target.query(insertQuery, values);
        if (res.rowCount > 0) {
          insertedCount++;
        }
      }

      console.log(`📦 Table "${table}": inserted ${insertedCount} new records (out of ${rows.length} checked).`);
      totalMigratedRows += insertedCount;
    } catch (err) {
      console.error(`⚠️ Error merging table "${table}":`, err.message);
    }
  }

  // Count final statistics on Main Server
  console.log('\n--- Final Main Server Statistics ---');
  const stud = await target.query('SELECT count(*) FROM "Student"');
  const sess = await target.query('SELECT count(*) FROM "LessonSession"');
  const att = await target.query('SELECT count(*) FROM "Attendance"');
  const pay = await target.query('SELECT count(*) FROM "Payment"');
  console.log(`Main Server Data: Students = ${stud.rows[0].count}, LessonSessions = ${sess.rows[0].count}, Attendance = ${att.rows[0].count}, Payments = ${pay.rows[0].count}`);

  await source.end();
  await target.end();

  console.log('\n==================================================');
  console.log(`🎉 MERGE COMPLETE! Integrated ${totalMigratedRows} new rows into Main Server.`);
  console.log('==================================================\n');
}

mergeData().catch((err) => {
  console.error('❌ Merge failed:', err);
  process.exit(1);
});
