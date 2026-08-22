const { Client } = require('pg');

async function syncUltraFast() {
  const sourceUrl = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const targetUrl = "postgresql://neondb_owner:npg_1YGVwfTQbep5@ep-square-river-axxc5ghb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require";

  console.log('⚡ [Ultra-Fast Sync] Connecting to both databases...');
  const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
  const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  await source.connect();
  await target.connect();
  console.log('✅ Connected!');

  // 1. Sync Parents
  console.log('🔄 Checking Parents...');
  const tgtParentIds = new Set((await target.query('SELECT id FROM "Parent"')).rows.map(r => r.id));
  const srcParents = (await source.query('SELECT * FROM "Parent"')).rows.filter(p => !tgtParentIds.has(p.id));
  if (srcParents.length > 0) {
    for (const p of srcParents) {
      await target.query(`
        INSERT INTO "Parent" (id, name, phone, relation, whatsapp, "extraPhone", "qrCode", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
      `, [p.id, p.name, p.phone, p.relation, p.whatsapp, p.extraPhone, p.qrCode, p.createdAt, p.updatedAt]);
    }
    console.log(`✅ Inserted ${srcParents.length} Parents.`);
  } else {
    console.log('ℹ️ Parents up to date.');
  }

  // 2. Sync Students
  console.log('🔄 Checking Students...');
  const tgtStudentIds = new Set((await target.query('SELECT id FROM "Student"')).rows.map(r => r.id));
  const srcStudents = (await source.query('SELECT * FROM "Student"')).rows.filter(s => !tgtStudentIds.has(s.id));
  if (srcStudents.length > 0) {
    for (const s of srcStudents) {
      await target.query(`
        INSERT INTO "Student" (id, code, name, phone, password, "profileImage", "academicStageId", "groupId", "parentId", "qrCode", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
      `, [s.id, s.code, s.name, s.phone, s.password, s.profileImage, s.academicStageId, s.groupId, s.parentId, s.qrCode, s.notes, s.createdAt, s.updatedAt]);
    }
    console.log(`✅ Inserted ${srcStudents.length} Students.`);
  } else {
    console.log('ℹ️ Students up to date.');
  }

  // 3. Sync LessonSessions
  console.log('🔄 Checking LessonSessions...');
  const tgtSessionIds = new Set((await target.query('SELECT id FROM "LessonSession"')).rows.map(r => r.id));
  const srcSessions = (await source.query('SELECT * FROM "LessonSession"')).rows.filter(s => !tgtSessionIds.has(s.id));
  if (srcSessions.length > 0) {
    for (const sess of srcSessions) {
      await target.query(`
        INSERT INTO "LessonSession" (id, title, "groupId", date, "startTime", "endTime", status, type, location, "assistantId", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
      `, [sess.id, sess.title, sess.groupId, sess.date, sess.startTime, sess.endTime, sess.status, sess.type, sess.location, sess.assistantId, sess.notes, sess.createdAt, sess.updatedAt]);
    }
    console.log(`✅ Inserted ${srcSessions.length} LessonSessions.`);
  } else {
    console.log('ℹ️ LessonSessions up to date.');
  }

  // 4. Sync Attendance
  console.log('🔄 Checking Attendance...');
  const tgtAttIds = new Set((await target.query('SELECT id FROM "Attendance"')).rows.map(r => r.id));
  const srcAtt = (await source.query('SELECT * FROM "Attendance"')).rows.filter(a => !tgtAttIds.has(a.id));
  if (srcAtt.length > 0) {
    // Refresh student and session sets
    const validStudentIds = new Set((await target.query('SELECT id FROM "Student"')).rows.map(r => r.id));
    const validSessionIds = new Set((await target.query('SELECT id FROM "LessonSession"')).rows.map(r => r.id));

    let attInserted = 0;
    for (const att of srcAtt) {
      if (validStudentIds.has(att.studentId) && validSessionIds.has(att.sessionId)) {
        await target.query(`
          INSERT INTO "Attendance" (id, "studentId", "sessionId", status, "recordedById", notes, "checkInTime", "checkOutTime", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT DO NOTHING
        `, [att.id, att.studentId, att.sessionId, att.status, att.recordedById, att.notes, att.checkInTime, att.checkOutTime, att.createdAt, att.updatedAt]);
        attInserted++;
      }
    }
    console.log(`✅ Inserted ${attInserted} Attendance records (out of ${srcAtt.length} missing checked).`);
  } else {
    console.log('ℹ️ Attendance up to date.');
  }

  // 5. Final Totals
  console.log('\n--- Final Totals in Main Target DB (ep-square-river) ---');
  const stud = await target.query('SELECT count(*) FROM "Student"');
  const sess = await target.query('SELECT count(*) FROM "LessonSession"');
  const att = await target.query('SELECT count(*) FROM "Attendance"');
  const pay = await target.query('SELECT count(*) FROM "Payment"');
  console.log(`Students: ${stud.rows[0].count} | Sessions: ${sess.rows[0].count} | Attendance: ${att.rows[0].count} | Payments: ${pay.rows[0].count}`);

  await source.end();
  await target.end();
}

syncUltraFast().catch(console.error);
