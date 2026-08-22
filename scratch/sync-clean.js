const { Client } = require('pg');

async function syncClean() {
  const sourceUrl = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const targetUrl = "postgresql://neondb_owner:npg_1YGVwfTQbep5@ep-square-river-axxc5ghb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require";

  console.log('⚡ [Clean Sync] Connecting...');
  const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
  const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  await source.connect();
  await target.connect();
  console.log('✅ Connected!');

  // 1. Sync Parents
  const tgtParentIds = new Set((await target.query('SELECT id FROM "Parent"')).rows.map(r => r.id));
  const srcParents = (await source.query('SELECT * FROM "Parent"')).rows.filter(p => !tgtParentIds.has(p.id));
  console.log(`Parents to sync: ${srcParents.length}`);
  for (const p of srcParents) {
    try {
      await target.query(`
        INSERT INTO "Parent" (id, name, phone, relation, whatsapp, "extraPhone", "qrCode", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
      `, [p.id, p.name, p.phone || `010${Math.floor(10000000 + Math.random() * 90000000)}`, p.relation, p.whatsapp, p.extraPhone, p.qrCode || `PQR-${p.id}`, p.createdAt, p.updatedAt]);
    } catch (e) {
      // If phone/qrCode collides, randomize phone/qrCode to ensure foreign key parent exists
      await target.query(`
        INSERT INTO "Parent" (id, name, phone, relation, whatsapp, "extraPhone", "qrCode", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
      `, [p.id, p.name, `010${Math.floor(10000000 + Math.random() * 90000000)}`, p.relation, p.whatsapp, p.extraPhone, `PQR-${p.id}`, p.createdAt, p.updatedAt]);
    }
  }
  console.log('✅ Parents sync complete.');

  // Refresh Parent IDs in Target
  const allTgtParentIds = new Set((await target.query('SELECT id FROM "Parent"')).rows.map(r => r.id));

  // 2. Sync Students
  const tgtStudentIds = new Set((await target.query('SELECT id FROM "Student"')).rows.map(r => r.id));
  const srcStudents = (await source.query('SELECT * FROM "Student"')).rows.filter(s => !tgtStudentIds.has(s.id));
  console.log(`Students to sync: ${srcStudents.length}`);
  let addedStudents = 0;
  for (const s of srcStudents) {
    try {
      // Ensure parent ID exists in Target
      let parentIdToUse = s.parentId;
      if (!allTgtParentIds.has(s.parentId)) {
        const dummyParentId = s.parentId || `P-${s.id}`;
        await target.query(`
          INSERT INTO "Parent" (id, name, phone, relation, "qrCode", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [dummyParentId, `ولي أمر ${s.name}`, `010${Math.floor(10000000 + Math.random() * 90000000)}`, 'Father', `PQR-${dummyParentId}`, new Date(), new Date()]);
        parentIdToUse = dummyParentId;
        allTgtParentIds.add(dummyParentId);
      }

      await target.query(`
        INSERT INTO "Student" (id, code, name, phone, password, "profileImage", "academicStageId", "groupId", "parentId", "qrCode", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
      `, [s.id, s.code, s.name, s.phone, s.password, s.profileImage, s.academicStageId, s.groupId, parentIdToUse, s.qrCode, s.notes, s.createdAt, s.updatedAt]);
      addedStudents++;
    } catch (e) {
      console.warn(`  ⚠️ Student insert warning (${s.name}):`, e.message);
    }
  }
  console.log(`✅ Synced ${addedStudents} Students.`);

  // 3. Sync LessonSessions
  const tgtSessionIds = new Set((await target.query('SELECT id FROM "LessonSession"')).rows.map(r => r.id));
  const srcSessions = (await source.query('SELECT * FROM "LessonSession"')).rows.filter(s => !tgtSessionIds.has(s.id));
  console.log(`LessonSessions to sync: ${srcSessions.length}`);
  for (const sess of srcSessions) {
    try {
      await target.query(`
        INSERT INTO "LessonSession" (id, title, "groupId", date, "startTime", "endTime", status, type, location, "assistantId", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
      `, [sess.id, sess.title, sess.groupId, sess.date, sess.startTime, sess.endTime, sess.status, sess.type, sess.location, sess.assistantId, sess.notes, sess.createdAt, sess.updatedAt]);
    } catch (e) {
      console.warn(`  ⚠️ Session insert warning:`, e.message);
    }
  }
  console.log('✅ LessonSessions sync complete.');

  // 4. Sync Attendance
  const tgtAttIds = new Set((await target.query('SELECT id FROM "Attendance"')).rows.map(r => r.id));
  const srcAtt = (await source.query('SELECT * FROM "Attendance"')).rows.filter(a => !tgtAttIds.has(a.id));
  console.log(`Attendance records to sync: ${srcAtt.length}`);
  const validStudentIds = new Set((await target.query('SELECT id FROM "Student"')).rows.map(r => r.id));
  const validSessionIds = new Set((await target.query('SELECT id FROM "LessonSession"')).rows.map(r => r.id));

  let attAdded = 0;
  for (const att of srcAtt) {
    if (validStudentIds.has(att.studentId) && validSessionIds.has(att.sessionId)) {
      try {
        await target.query(`
          INSERT INTO "Attendance" (id, "studentId", "sessionId", status, "recordedById", notes, "checkInTime", "checkOutTime", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT DO NOTHING
        `, [att.id, att.studentId, att.sessionId, att.status, att.recordedById, att.notes, att.checkInTime, att.checkOutTime, att.createdAt, att.updatedAt]);
        attAdded++;
      } catch (e) {
        console.warn(`  ⚠️ Attendance insert warning:`, e.message);
      }
    }
  }
  console.log(`✅ Synced ${attAdded} Attendance records.`);

  // Final Totals
  console.log('\n--- Final Totals in Target DB (ep-square-river) ---');
  const stud = await target.query('SELECT count(*) FROM "Student"');
  const sess = await target.query('SELECT count(*) FROM "LessonSession"');
  const att = await target.query('SELECT count(*) FROM "Attendance"');
  console.log(`Students: ${stud.rows[0].count} | Sessions: ${sess.rows[0].count} | Attendance: ${att.rows[0].count}`);

  await source.end();
  await target.end();
}

syncClean().catch(console.error);
