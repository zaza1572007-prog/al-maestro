const { Client } = require('pg');

async function mergeFast() {
  const sourceUrl = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const targetUrl = "postgresql://neondb_owner:npg_1YGVwfTQbep5@ep-square-river-axxc5ghb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require";

  console.log('⚡ [Fast Merge] Connecting to databases...');
  const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
  const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  await source.connect();
  await target.connect();
  console.log('✅ Connected!');

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

  let totalInserted = 0;

  for (const table of tables) {
    try {
      // Find IDs that exist in source but not in target
      const { rows: missingRows } = await source.query(`
        SELECT s.* FROM "${table}" s
        LEFT JOIN "${table}" t ON s.id = t.id
        WHERE t.id IS NULL
      `);

      if (missingRows.length === 0) {
        console.log(`📦 [${table}]: 0 new records to insert.`);
        continue;
      }

      console.log(`📦 [${table}]: Found ${missingRows.length} new records. Inserting...`);

      const columns = Object.keys(missingRows[0]);
      const colNames = columns.map((c) => `"${c}"`).join(', ');

      let count = 0;
      for (const row of missingRows) {
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

        await target.query(insertQuery, values);
        count++;
      }

      console.log(`✅ [${table}]: Inserted ${count} records!`);
      totalInserted += count;
    } catch (err) {
      console.error(`⚠️ [${table}] Error:`, err.message);
    }
  }

  console.log(`\n🎉 MERGE COMPLETE! ${totalInserted} total new records merged into Main Server.`);

  const stud = await target.query('SELECT count(*) FROM "Student"');
  const sess = await target.query('SELECT count(*) FROM "LessonSession"');
  const att = await target.query('SELECT count(*) FROM "Attendance"');
  const pay = await target.query('SELECT count(*) FROM "Payment"');
  console.log(`📊 Final Main Server Totals: Students = ${stud.rows[0].count}, Sessions = ${sess.rows[0].count}, Attendance = ${att.rows[0].count}, Payments = ${pay.rows[0].count}`);

  await source.end();
  await target.end();
}

mergeFast().catch(console.error);
