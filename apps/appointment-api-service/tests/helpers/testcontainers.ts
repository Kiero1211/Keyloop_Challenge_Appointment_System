import { GenericContainer, Wait } from 'testcontainers';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let pgContainer: any;
let redisContainer: any;

beforeAll(async () => {
  // Start PostgreSQL container
  pgContainer = await new GenericContainer('postgres:15-alpine')
    .withEnvironment({
      POSTGRES_DB: 'appointments_test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const pgHost = pgContainer.getHost();
  const pgPort = pgContainer.getMappedPort(5432);
  process.env.DATABASE_URL = `postgres://test:test@${pgHost}:${pgPort}/appointments_test`;

  // Start Redis container
  redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  const redisHost = redisContainer.getHost();
  const redisPort = redisContainer.getMappedPort(6379);
  process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;

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
