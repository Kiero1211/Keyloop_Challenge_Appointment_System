import cluster from 'cluster';
import os from 'os';
import { startServer } from '@/infrastructure/http/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/infrastructure/db/client';
import { sql } from 'drizzle-orm';

async function initDb() {
  if (process.env.INIT_DB_ON_STARTUP === 'true') {
    console.log('Initializing database tables and seed data...');
    try {
      const tablesSql = fs.readFileSync(path.join(__dirname, '../../../seed/tables.sql'), 'utf-8');
      const seedSql = fs.readFileSync(path.join(__dirname, '../../../seed/seed.sql'), 'utf-8');
      await db.execute(sql.raw(tablesSql));
      await db.execute(sql.raw(seedSql));
      console.log('Database initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    }
  }
}

if (cluster.isPrimary) {
  initDb().then(() => {
    const numCPUs = os.cpus().length;
    console.log(`Primary ${process.pid} is running`);
    console.log(`Forking for ${numCPUs} CPUs\n`);

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
      console.log('Starting a new worker');
      cluster.fork();
    });
  });
} else {
  startServer();
}
