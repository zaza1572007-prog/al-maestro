const { Client } = require('pg');

async function inspectAfter2PM() {
  const sourceUrl = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const targetUrl = "postgresql://neondb_owner:npg_1YGVwfTQbep5@ep-square-river-axxc5ghb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require";

  const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
  const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  await source.connect();
  await target.connect();

  console.log('--- Inspecting LessonSessions in Source (ep-crimson-sun) ---');
  const srcSessions = await source.query('SELECT * FROM "LessonSession" ORDER BY date DESC, "createdAt" DESC');
  console.log(`Source has ${srcSessions.rows.length} total sessions:`);
  srcSessions.rows.forEach(s => {
    console.log(`- ID: ${s.id} | Title: ${s.title} | Date: ${s.date} | Start: ${s.startTime} | End: ${s.endTime} | Status: ${s.status} | GroupId: ${s.groupId}`);
  });

  console.log('\n--- Inspecting LessonSessions in Target (ep-square-river) ---');
  const tgtSessions = await target.query('SELECT * FROM "LessonSession" ORDER BY date DESC, "createdAt" DESC');
  console.log(`Target has ${tgtSessions.rows.length} total sessions:`);
  tgtSessions.rows.forEach(s => {
    console.log(`- ID: ${s.id} | Title: ${s.title} | Date: ${s.date} | Start: ${s.startTime} | End: ${s.endTime} | Status: ${s.status} | GroupId: ${s.groupId}`);
  });

  console.log('\n--- Inspecting Attendance in Source created since Aug 17 ---');
  const srcAtt = await source.query('SELECT a.*, s.name as "studentName", s.code as "studentCode" FROM "Attendance" a JOIN "Student" s ON a."studentId" = s.id WHERE a."createdAt" >= \'2026-08-17 00:00:00\' ORDER BY a."createdAt" DESC');
  console.log(`Source has ${srcAtt.rows.length} attendance records since Aug 17:`);
  srcAtt.rows.slice(0, 30).forEach(a => {
    console.log(`- Att ID: ${a.id} | Student: ${a.studentName} (${a.studentCode}) | SessionId: ${a.sessionId} | Status: ${a.status} | CheckIn: ${a.checkInTime} | CreatedAt: ${a.createdAt}`);
  });

  console.log('\n--- Inspecting Students in Source created since Aug 17 ---');
  const srcStudents = await source.query('SELECT * FROM "Student" WHERE "createdAt" >= \'2026-08-17 00:00:00\' ORDER BY "createdAt" DESC');
  console.log(`Source has ${srcStudents.rows.length} new students created since Aug 17:`);
  srcStudents.rows.forEach(s => {
    console.log(`- Student ID: ${s.id} | Name: ${s.name} | Code: ${s.code} | Phone: ${s.phone} | CreatedAt: ${s.createdAt}`);
  });

  await source.end();
  await target.end();
}

inspectAfter2PM().catch(console.error);
