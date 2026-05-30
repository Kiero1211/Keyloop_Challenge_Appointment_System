import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

beforeAll(async () => {
  // Start PostgreSQL container
  pgContainer = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('appointments_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  process.env.DATABASE_URL = pgContainer.getConnectionUri();

  // Start Redis container
  redisContainer = await new RedisContainer('redis:7-alpine').start();
  process.env.REDIS_URL = redisContainer.getConnectionUrl();

  // Run migrations
  await execAsync('npx drizzle-kit push', {
    cwd: process.cwd(),
    env: { ...process.env },
  });
});

afterAll(async () => {
  if (pgContainer) {
    await pgContainer.stop();
  }
  if (redisContainer) {
    await redisContainer.stop();
  }
});
