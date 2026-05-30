import { RedisStreamPublisher } from '../../../../src/infrastructure/messaging/redis-stream.publisher';
import Redis from 'ioredis';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

describe('RedisStreamPublisher Integration', () => {
  let redisContainer: StartedTestContainer;
  let redisClient: Redis;
  let publisher: RedisStreamPublisher;

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

    publisher = new RedisStreamPublisher(redisClient);
  }, 30000);

  afterAll(async () => {
    if (redisClient) {
      await redisClient.quit();
    }
    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  it('should publish a message to the stream successfully', async () => {
    const payload = {
      commandId: 'cmd-123',
      tenantId: 'tenant-1',
      vehicleId: 'veh-1',
    };

    const messageId = await publisher.publish('test_stream', payload);

    expect(messageId).toBeDefined();
    expect(typeof messageId).toBe('string');

    // Verify it actually went to Redis
    const messages = await redisClient.xread('STREAMS', 'test_stream', '0-0');
    expect(messages).toBeDefined();
    
    const stream = messages![0];
    expect(stream[0]).toBe('test_stream');
    
    const events = stream[1];
    expect(events.length).toBe(1);
    
    const event = events[0];
    // event[0] is the auto-generated id
    const data = event[1];
    // data is an array like ['commandId', 'cmd-123', 'tenantId', 'tenant-1', ...]
    const parsedData: Record<string, string> = {};
    for (let i = 0; i < data.length; i += 2) {
      parsedData[data[i]] = data[i + 1];
    }
    
    expect(parsedData).toEqual(payload);
  });
});
