import { Pool } from 'pg';
import { execSync } from 'child_process';
import fs from 'fs';

async function resetDb() {
  let logStr = '';
  const log = (msg: string) => { console.log(msg); logStr += msg + '\n'; };
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/appointments',
  });

  try {
    log('Connecting to database...');
    const res = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);

    log('Tables found: ' + res.rows.map(r => r.tablename).join(', '));

    for (const row of res.rows) {
      log('Dropping table ' + row.tablename);
      await pool.query(`DROP TABLE IF EXISTS "public"."${row.tablename}" CASCADE;`);
    }
    log('Test database reset successfully.');
    
    log('Running drizzle-kit push:pg...');
    const out = execSync('npx drizzle-kit push:pg', { encoding: 'utf-8', stdio: 'pipe' });
    log('Drizzle output:\n' + out);

    const postRes = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    log('Tables after push: ' + postRes.rows.map(r => r.tablename).join(', '));

    log('Finished successfully!');
  } catch (error: any) {
    log('Failed: ' + (error.message || error));
    if (error.stdout) log('STDOUT: ' + error.stdout.toString());
    if (error.stderr) log('STDERR: ' + error.stderr.toString());
    process.exit(1);
  } finally {
    await pool.end();
    fs.writeFileSync('db-reset.log', logStr);
  }
}

resetDb();
