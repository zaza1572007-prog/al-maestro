const { Client } = require('pg');

async function syncAllMissing() {
  const sourceUrl = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const targetUrl = "postgresql://neondb_owner:npg_1YGVwfTQbep5@ep-square-river-axxc5ghb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require";

  const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
  const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  await source.connect();
  await target.connect();

  console.log('--- Step 1: Merging Students from Source to Target ---');
  const srcStudents = await source.query('SELECT * FROM "Student"');
  let newStudentsCount = 0;
  for (const s of srcStudents.rows) {
    // Check if student exists by ID or code
    const tgtCheck = await target.query('SELECT id FROM "Student" WHERE id = $1 OR code = $2', [s.id, s.code]);
    if (tgtCheck.rows.length === 0) {
      // Ensure Parent exists
      if (s.parentId) {
        const pCheck = await target.query('SELECT id FROM "Parent" WHERE id = $1', [s.parentId]);
        if (pCheck.rows.length === 0) {
          const srcParent = await source.query('SELECT * FROM "Parent" WHERE id = $1', [s.parentId]);
          if (srcParent.rows.length > 0) {
            const p = srcParent.rows[0];
            await target.query(`
              INSERT INTO "Parent" (id, name, phone, relation, whatsapp, "extraPhone", "qrCode", "createdAt", "updatedAt")
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT DO NOTHING
            `, [p.id, p.name, p.phone, p.relation, p.whatsapp, p.extraPhone, p.qrCode, p.createdAt, p.updatedAt]);
          }
        }
      }

      // Insert Student
      await target.query(`
        INSERT INTO "Student" (id, code, name, phone, password, "profileImage", "academicStageId", "groupId", "parentId", "qrCode", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
      `, [s.id, s.code, s.name, s.phone, s.password, s.profileImage, s.academicStageId, s.groupId, s.parentId, s.qrCode, s.notes, s.createdAt, s.updatedAt]);
      newStudentsCount++;
    }
  }
  console.log(`✅ Synced ${newStudentsCount} missing Students.`);

  console.log('\n--- Step 2: Merging LessonSessions from Source to Target ---');
  const srcSessions = await source.query('SELECT * FROM "LessonSession"');
  let newSessionsCount = 0;
  for (const sess of srcSessions.rows) {
    const tgtCheck = await target.query('SELECT id FROM "LessonSession" WHERE id = $1', [sess.id]);
    if (tgtCheck.rows.length === 0) {
      await target.query(`
        INSERT INTO "LessonSession" (id, title, "groupId", date, "startTime", "endTime", status, type, location, "assistantId", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
      `, [sess.id, sess.title, sess.groupId, sess.date, sess.startTime, sess.endTime, sess.status, sess.type, sess.location, sess.assistantId, sess.notes, sess.createdAt, sess.updatedAt]);
      newSessionsCount++;
    }
  }
  console.log(`✅ Synced ${newSessionsCount} missing LessonSessions.`);

  console.log('\n--- Step 3: Merging Attendance from Source to Target ---');
  const srcAtt = await source.query('SELECT * FROM "Attendance"');
  let newAttCount = 0;
  for (const att of srcAtt.rows) {
    const tgtCheck = await target.query('SELECT id FROM "Attendance" WHERE id = $1', [att.id]);
    if (tgtCheck.rows.length === 0) {
      // Ensure student and session exist in target
      const stCheck = await target.query('SELECT id FROM "Student" WHERE id = $1', [att.studentId]);
      const seCheck = await target.query('SELECT id FROM "LessonSession" WHERE id = $1', [att.sessionId]);

      if (stCheck.rows.length > 0 && seCheck.rows.length > 0) {
        await target.query(`
          INSERT INTO "Attendance" (id, "studentId", "sessionId", status, "recordedById", notes, "checkInTime", "checkOutTime", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT DO NOTHING
        `, [att.id, att.studentId, att.sessionId, att.status, att.recordedById, att.notes, att.checkInTime, att.checkOutTime, att.createdAt, att.updatedAt]);
        newAttCount++;
      } else {
        console.warn(`  ⚠️ Skipping Attendance ${att.id}: Student or Session missing in target.`);
      }
    }
  }
  console.log(`✅ Synced ${newAttCount} missing Attendance records.`);

  console.log('\n--- Step 4: Merging Payments & Subscriptions ---');
  const srcSubs = await source.query('SELECT * FROM "Subscription"');
  let newSubsCount = 0;
  for (const sub of srcSubs.rows) {
    const tgtCheck = await target.query('SELECT id FROM "Subscription" WHERE id = $1', [sub.id]);
    if (tgtCheck.rows.length === 0) {
      await target.query(`
        INSERT INTO "Subscription" (id, "studentId", "groupId", "startDate", "endDate", "totalSessions", "usedSessions", price, status, "isExempt", month, year, "paidAt", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT DO NOTHING
      `, [sub.id, sub.studentId, sub.groupId, sub.startDate, sub.endDate, sub.totalSessions, sub.usedSessions, sub.price, sub.status, sub.isExempt, sub.month, sub.year, sub.paidAt, sub.createdAt, sub.updatedAt]);
      newSubsCount++;
    }
  }
  console.log(`✅ Synced ${newSubsCount} missing Subscriptions.`);

  const srcPayments = await source.query('SELECT * FROM "Payment"');
  let newPayCount = 0;
  for (const pay of srcPayments.rows) {
    const tgtCheck = await target.query('SELECT id FROM "Payment" WHERE id = $1', [pay.id]);
    if (tgtCheck.rows.length === 0) {
      await target.query(`
        INSERT INTO "Payment" (id, "studentId", "subscriptionId", "totalAmount", "paidAmount", "remainingAmount", "paymentMethod", "recordedById", notes, month, year, "paidAt", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT DO NOTHING
      `, [pay.id, pay.studentId, pay.subscriptionId, pay.totalAmount, pay.paidAmount, pay.remainingAmount, pay.paymentMethod, pay.recordedById, pay.notes, pay.month, pay.year, pay.paidAt, pay.createdAt, pay.updatedAt]);
      newPayCount++;
    }
  }
  console.log(`✅ Synced ${newPayCount} missing Payments.`);

  console.log('\n--- Final Totals in Target (ep-square-river) ---');
  const stud = await target.query('SELECT count(*) FROM "Student"');
  const sess = await target.query('SELECT count(*) FROM "LessonSession"');
  const att = await target.query('SELECT count(*) FROM "Attendance"');
  console.log(`Students: ${stud.rows[0].count} | Sessions: ${sess.rows[0].count} | Attendance: ${att.rows[0].count}`);

  await source.end();
  await target.end();
}

syncAllMissing().catch(console.error);
