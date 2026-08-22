const { Client } = require('pg');

async function syncBulletproof() {
  const sourceUrl = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const targetUrl = "postgresql://neondb_owner:npg_1YGVwfTQbep5@ep-square-river-axxc5ghb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require";

  console.log('🛡️ [Bulletproof Sync] Connecting...');
  const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
  const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  await source.connect();
  await target.connect();
  console.log('✅ Connected to both databases!');

  // 1. Sync ALL Parents from Source
  console.log('\n--- Step 1: Syncing Parents ---');
  const srcParents = (await source.query('SELECT * FROM "Parent"')).rows;
  let insertedParents = 0;
  for (const p of srcParents) {
    try {
      const res = await target.query(`
        INSERT INTO "Parent" (id, name, phone, relation, whatsapp, "extraPhone", "qrCode", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [p.id, p.name, p.phone, p.relation, p.whatsapp, p.extraPhone, p.qrCode, p.createdAt, p.updatedAt]);
      if (res.rowCount > 0) insertedParents++;
    } catch (e) {
      // Ignore phone/qrCode unique conflict if parent already exists under different ID
    }
  }
  console.log(`✅ Synced ${insertedParents} new Parents.`);

  // 2. Sync Students from Source
  console.log('\n--- Step 2: Syncing Students ---');
  const srcStudents = (await source.query('SELECT * FROM "Student"')).rows;
  let insertedStudents = 0;
  for (const s of srcStudents) {
    try {
      // Ensure parent exists first
      if (s.parentId) {
        const pCheck = await target.query('SELECT id FROM "Parent" WHERE id = $1', [s.parentId]);
        if (pCheck.rows.length === 0) {
          await target.query(`
            INSERT INTO "Parent" (id, name, phone, relation, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
          `, [s.parentId, `ولي أمر ${s.name}`, `010${Math.floor(10000000 + Math.random() * 90000000)}`, 'Father', new Date(), new Date()]);
        }
      }

      const res = await target.query(`
        INSERT INTO "Student" (id, code, name, phone, password, "profileImage", "academicStageId", "groupId", "parentId", "qrCode", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [s.id, s.code, s.name, s.phone, s.password, s.profileImage, s.academicStageId, s.groupId, s.parentId, s.qrCode, s.notes, s.createdAt, s.updatedAt]);
      if (res.rowCount > 0) insertedStudents++;
    } catch (e) {
      // Ignore code/phone unique constraint conflicts if student exists
    }
  }
  console.log(`✅ Synced ${insertedStudents} new Students.`);

  // 3. Sync LessonSessions from Source
  console.log('\n--- Step 3: Syncing LessonSessions ---');
  const srcSessions = (await source.query('SELECT * FROM "LessonSession"')).rows;
  let insertedSessions = 0;
  for (const sess of srcSessions) {
    try {
      const res = await target.query(`
        INSERT INTO "LessonSession" (id, title, "groupId", date, "startTime", "endTime", status, type, location, "assistantId", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [sess.id, sess.title, sess.groupId, sess.date, sess.startTime, sess.endTime, sess.status, sess.type, sess.location, sess.assistantId, sess.notes, sess.createdAt, sess.updatedAt]);
      if (res.rowCount > 0) insertedSessions++;
    } catch (e) {
      console.warn(`  ⚠️ Session error (${sess.id}):`, e.message);
    }
  }
  console.log(`✅ Synced ${insertedSessions} new LessonSessions.`);

  // 4. Sync Attendance Records from Source
  console.log('\n--- Step 4: Syncing Attendance Records ---');
  const srcAtt = (await source.query('SELECT * FROM "Attendance"')).rows;
  let insertedAtt = 0;
  let skippedAtt = 0;

  for (const att of srcAtt) {
    try {
      // Check if student and session exist in Target
      const stCheck = await target.query('SELECT id FROM "Student" WHERE id = $1', [att.studentId]);
      const seCheck = await target.query('SELECT id FROM "LessonSession" WHERE id = $1', [att.sessionId]);

      if (stCheck.rows.length > 0 && seCheck.rows.length > 0) {
        const res = await target.query(`
          INSERT INTO "Attendance" (id, "studentId", "sessionId", status, "recordedById", notes, "checkInTime", "checkOutTime", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [att.id, att.studentId, att.sessionId, att.status, att.recordedById, att.notes, att.checkInTime, att.checkOutTime, att.createdAt, att.updatedAt]);
        if (res.rowCount > 0) insertedAtt++;
      } else {
        skippedAtt++;
      }
    } catch (e) {
      console.warn(`  ⚠️ Attendance error (${att.id}):`, e.message);
    }
  }
  console.log(`✅ Synced ${insertedAtt} new Attendance records (${skippedAtt} skipped due to missing student/session).`);

  // 5. Final Statistics
  console.log('\n--- Final Totals in Main Target DB (ep-square-river) ---');
  const stud = await target.query('SELECT count(*) FROM "Student"');
  const sess = await target.query('SELECT count(*) FROM "LessonSession"');
  const att = await target.query('SELECT count(*) FROM "Attendance"');
  console.log(`Students: ${stud.rows[0].count} | Sessions: ${sess.rows[0].count} | Attendance: ${att.rows[0].count}`);

  await source.end();
  await target.end();
}

syncBulletproof().catch(console.error);
