const { Client } = require('pg');

async function testConn() {
  const mainDbUrl = "postgresql://neondb_owner:npg_1YGVwfTQbep5@ep-square-river-axxc5ghb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const yesterdayDbUrl = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

  console.log('--- Testing Main Server (ep-square-river) ---');
  const mainClient = new Client({ connectionString: mainDbUrl, ssl: { rejectUnauthorized: false } });
  await mainClient.connect();
  console.log('✅ Connected to Main Server!');

  const stud1 = await mainClient.query('SELECT count(*) FROM "Student"');
  const sess1 = await mainClient.query('SELECT count(*) FROM "LessonSession"');
  const att1 = await mainClient.query('SELECT count(*) FROM "Attendance"');
  const pay1 = await mainClient.query('SELECT count(*) FROM "Payment"');
  console.log(`Main Server Data: Students = ${stud1.rows[0].count}, LessonSessions = ${sess1.rows[0].count}, Attendance = ${att1.rows[0].count}, Payments = ${pay1.rows[0].count}`);
  await mainClient.end();

  console.log('\n--- Testing Yesterday Temp Server (ep-crimson-sun) ---');
  const yestClient = new Client({ connectionString: yesterdayDbUrl, ssl: { rejectUnauthorized: false } });
  await yestClient.connect();
  console.log('✅ Connected to Yesterday Temp Server!');

  const stud2 = await yestClient.query('SELECT count(*) FROM "Student"');
  const sess2 = await yestClient.query('SELECT count(*) FROM "LessonSession"');
  const att2 = await yestClient.query('SELECT count(*) FROM "Attendance"');
  const pay2 = await yestClient.query('SELECT count(*) FROM "Payment"');
  console.log(`Yesterday Server Data: Students = ${stud2.rows[0].count}, LessonSessions = ${sess2.rows[0].count}, Attendance = ${att2.rows[0].count}, Payments = ${pay2.rows[0].count}`);
  await yestClient.end();
}

testConn().catch((err) => {
  console.error('❌ Connection error:', err);
});
