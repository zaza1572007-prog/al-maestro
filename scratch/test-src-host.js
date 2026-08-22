const { Client } = require('pg');

async function testSource() {
  const url1 = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const url2 = "postgresql://neondb_owner:npg_YU9ajeK4hFbD@ep-crimson-sun-ayn3131o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

  console.log('Testing url1 (without pooler)...');
  try {
    const c1 = new Client({ connectionString: url1, ssl: { rejectUnauthorized: false } });
    await c1.connect();
    console.log('✅ URL 1 CONNECTED!');
    await c1.end();
  } catch (e) {
    console.error('URL 1 error:', e.message);
  }

  console.log('Testing url2 (with pooler)...');
  try {
    const c2 = new Client({ connectionString: url2, ssl: { rejectUnauthorized: false } });
    await c2.connect();
    console.log('✅ URL 2 CONNECTED!');
    await c2.end();
  } catch (e) {
    console.error('URL 2 error:', e.message);
  }
}

testSource();
