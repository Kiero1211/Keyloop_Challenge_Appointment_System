import type { Config } from 'drizzle-kit';

export default {
  schema: './src/infrastructure/db/schema.ts',
  out: './src/infrastructure/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/appointments',
  },
} satisfies Config;
