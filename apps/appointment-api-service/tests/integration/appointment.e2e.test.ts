import request from 'supertest';
import { app } from '@/infrastructure/http/app';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import Redis from 'ioredis';
import { container } from '@/infrastructure/di/container';

describe('Appointment API E2E', () => {
  let redisContainer: StartedTestContainer;
  let redisClient: Redis;

  let token: string;
  let tenantId: string;

  let user: any;
  let vehicle: any;
  let serviceType: any;
  let tech1: any;
  let tech2: any;
  let bay1: any;
  let bay2: any;

  beforeAll(async () => {
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    const host = redisContainer.getHost();
    const port = redisContainer.getMappedPort(6379);

    redisClient = new Redis({ host, port });

    await container.initialize(redisClient);

    const { factories } = await import('../helpers/factories');
    const t1 = await factories.tenant();
    tenantId = t1.id;
    user = await factories.user();
    await factories.userTenant(user.id, tenantId);

    token = container.jwtService.generateAccessToken({
      userId: user.id,
      tenantId,
      role: 'TenantUser',
      permissions: [],
      isSuperAdmin: false,
    });
  }, 30000);

  afterAll(async () => {
    await container.destroy();

    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  beforeEach(async () => {
    await redisClient.flushdb();

    const { factories } = await import('../helpers/factories');
    vehicle = await factories.vehicle(tenantId, user.id);
    serviceType = await factories.serviceType(tenantId);
    tech1 = await factories.technician(tenantId);
    tech2 = await factories.technician(tenantId);
    bay1 = await factories.serviceBay(tenantId);
    bay2 = await factories.serviceBay(tenantId);
  });

  describe('POST /api/v1/appointments', () => {
    it('should accept a valid appointment request and return 202', async () => {
      const payload = {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        technicianId: tech1.id,
        serviceBayId: bay1.id,
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenantId)
        .send(payload);

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('commandId');
    });

    it('should reject requests with missing tenant ID (400)', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('x-tenant-id');
    });

    it('should reject booking with missing required fields', async () => {
      const payload = {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenantId)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should allow booking the same vehicle twice without idempotency conflict', async () => {
      const payload1 = {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        technicianId: tech1.id,
        serviceBayId: bay1.id,
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenantId)
        .send(payload1)
        .expect(202);

      const payload2 = {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        technicianId: tech2.id,
        serviceBayId: bay2.id,
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenantId)
        .send(payload2)
        .expect(202);
    });
  });

  describe('POST /api/v1/appointments/hold', () => {
    it('should create a temporary hold and return 201', async () => {
      const payload = {
        technicianId: tech1.id,
        serviceBayId: bay1.id,
      };

      const response = await request(app)
        .post('/api/v1/appointments/hold')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenantId)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('holdId');
      expect(response.body).toHaveProperty('expiresAt');
    });

    it('should reject concurrent hold for same technician/bay (409)', async () => {
      const payload = {
        technicianId: tech1.id,
        serviceBayId: bay1.id,
      };

      await request(app)
        .post('/api/v1/appointments/hold')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenantId)
        .send(payload)
        .expect(201);

      const response = await request(app)
        .post('/api/v1/appointments/hold')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', tenantId)
        .send(payload);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('held by another user');
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
