const { Client } = require('pg');

async function testConn() {
  const url1 = "postgresql://neondb_owner:npg_1YGVwFTQbep5@ep-square-river-axxc5ghb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const url2 = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

  console.log('Testing Connection 1 (ep-square-river-pooler)...');
  const c1 = new Client({ connectionString: url1, ssl: { rejectUnauthorized: false } });
  await c1.connect();
  console.log('✅ Connection 1 SUCCESS!');

  const stud1 = await c1.query('SELECT count(*) FROM "Student"');
  const sess1 = await c1.query('SELECT count(*) FROM "LessonSession"');
  const att1 = await c1.query('SELECT count(*) FROM "Attendance"');
  console.log(`DB 1 (ep-square-river): Students = ${stud1.rows[0].count}, LessonSessions = ${sess1.rows[0].count}, Attendance = ${att1.rows[0].count}`);
  await c1.end();

  console.log('\nTesting Connection 2 (ep-crimson-sun-pooler)...');
  const c2 = new Client({ connectionString: url2, ssl: { rejectUnauthorized: false } });
  await c2.connect();
  console.log('✅ Connection 2 SUCCESS!');

  const stud2 = await c2.query('SELECT count(*) FROM "Student"');
  const sess2 = await c2.query('SELECT count(*) FROM "LessonSession"');
  const att2 = await c2.query('SELECT count(*) FROM "Attendance"');
  console.log(`DB 2 (ep-crimson-sun): Students = ${stud2.rows[0].count}, LessonSessions = ${sess2.rows[0].count}, Attendance = ${att2.rows[0].count}`);
  await c2.end();
}

testConn().catch((err) => {
  console.error('❌ Connection error:', err);
});
