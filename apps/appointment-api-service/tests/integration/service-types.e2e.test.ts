import request from 'supertest';
import { app } from '../../src/infrastructure/http/app';
import { db } from '../../src/infrastructure/db/client';
import { factories } from '../helpers/factories';
import { JwtService } from '../../src/infrastructure/auth/jwt.service';
import { container } from '../../src/infrastructure/di/container';
import { serviceTypes } from '../../src/infrastructure/db/schema';
import { eq } from 'drizzle-orm';

describe('Service Types API Integration', () => {
  let tenantId1: string;
  let tenantId2: string;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    // We mock the JwtService if we don't want to use the container one, 
    // but the app is using container.jwtService. 
    // We can just get the container's jwtService or instantiate a new one.
    await container.initialize();

    const t1 = await factories.tenant();
    const t2 = await factories.tenant();
    tenantId1 = t1.id;
    tenantId2 = t2.id;

    const u1 = await factories.user();
    const u2 = await factories.user();

    await factories.userTenant(u1.id, tenantId1);
    await factories.userTenant(u2.id, tenantId2);

    token1 = container.jwtService.generateAccessToken({
      userId: u1.id,
      tenantId: tenantId1,
      role: 'TenantUser',
      permissions: [],
      isSuperAdmin: false,
    });

    token2 = container.jwtService.generateAccessToken({
      userId: u2.id,
      tenantId: tenantId2,
      role: 'TenantUser',
      permissions: [],
      isSuperAdmin: false,
    });
  });

  afterAll(async () => {
    await db.delete(serviceTypes);
    await container.destroy();
  });

  describe('POST /api/v1/service-types', () => {
    it('should create a service type', async () => {
      const response = await request(app)
        .post('/api/v1/service-types')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({
          name: 'Tire Rotation',
          estimatedDurationMinutes: 45,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Tire Rotation');
      expect(response.body.tenantId).toBe(tenantId1);
    });

    it('should return 403 on cross-tenant request', async () => {
      const response = await request(app)
        .post('/api/v1/service-types')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId2) // user 1 trying to access tenant 2
        .send({
          name: 'Oil Change',
          estimatedDurationMinutes: 30,
        });

      expect(response.status).toBe(403);
    });
  });
});
