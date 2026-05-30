import request from 'supertest';
import { app } from '../../../../src/infrastructure/http/app';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import Redis from 'ioredis';
import { container } from '../../../../src/infrastructure/di/container';

describe('Appointment API E2E', () => {
  let redisContainer: StartedTestContainer;
  let redisClient: Redis;

  beforeAll(async () => {
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    const host = redisContainer.getHost();
    const port = redisContainer.getMappedPort(6379);

    redisClient = new Redis({ host, port });
    
    // Override DI container with test redis client
    await container.initialize(redisClient);
  }, 30000);

  afterAll(async () => {
    await container.destroy();
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

  describe('POST /api/v1/appointments', () => {
    it('should accept a valid appointment and return 202', async () => {
      const payload = {
        customerId: 'cust-1',
        vehicleId: 'veh-1',
        serviceTypeId: 'srv-1',
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };

      const response = await request(app)
        .post('/api/v1/appointments')
        .set('x-tenant-id', 'tenant-1')
        .send(payload);

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('commandId');
      
      // Verify in redis
      const keys = await redisClient.keys('tenant:tenant-1:appointment:veh-1:pending');
      expect(keys.length).toBe(1);
    });

    it('should reject requests with missing tenant ID (400)', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .send({
          customerId: 'cust-1',
          vehicleId: 'veh-1'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('x-tenant-id');
    });

    it('should reject duplicate submissions (409)', async () => {
      const payload = {
        customerId: 'cust-1',
        vehicleId: 'veh-1',
        serviceTypeId: 'srv-1',
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      // First request
      await request(app)
        .post('/api/v1/appointments')
        .set('x-tenant-id', 'tenant-1')
        .send(payload)
        .expect(202);

      // Second request (duplicate)
      await request(app)
        .post('/api/v1/appointments')
        .set('x-tenant-id', 'tenant-1')
        .send(payload)
        .expect(409);
    });
  });
  
  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', cache: 'connected' });
    });
  });
});
