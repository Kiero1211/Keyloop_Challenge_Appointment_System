import { RedisCacheAdapter } from '../../../../src/infrastructure/cache/redis-cache.adapter';
import Redis from 'ioredis';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

describe('RedisCacheAdapter Integration', () => {
  let redisContainer: StartedTestContainer;
  let redisClient: Redis;
  let cacheAdapter: RedisCacheAdapter;

  beforeAll(async () => {
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    const host = redisContainer.getHost();
    const port = redisContainer.getMappedPort(6379);

    redisClient = new Redis({
      host,
      port,
      retryStrategy: () => null, // Fail fast in tests
    });

    cacheAdapter = new RedisCacheAdapter(redisClient);
  }, 30000);

  afterAll(async () => {
    if (redisClient) {
      await redisClient.quit();
    }
    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  beforeEach(async () => {
    await redisClient.flushdb();
  });

  it('should successfully ping', async () => {
    const isAlive = await cacheAdapter.ping();
    expect(isAlive).toBe(true);
  });

  it('should set and check existence', async () => {
    const key = 'test:key';
    
    let exists = await cacheAdapter.exists(key);
    expect(exists).toBe(false);

    await cacheAdapter.hset(key, { field1: 'value1', field2: 'value2' });
    
    exists = await cacheAdapter.exists(key);
    expect(exists).toBe(true);
  });

  it('should retrieve all fields', async () => {
    const key = 'test:key2';
    const data = { fieldA: 'A', fieldB: 'B' };
    
    await cacheAdapter.hset(key, data);
    
    const retrieved = await cacheAdapter.hgetall(key);
    expect(retrieved).toEqual(data);
  });

  it('should delete keys', async () => {
    const key = 'test:key3';
    
    await cacheAdapter.hset(key, { field: 'value' });
    expect(await cacheAdapter.exists(key)).toBe(true);
    
    await cacheAdapter.del(key);
    expect(await cacheAdapter.exists(key)).toBe(false);
  });
});
