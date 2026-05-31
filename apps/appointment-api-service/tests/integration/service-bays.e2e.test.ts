import request from 'supertest';
import { app } from '@/infrastructure/http/app';
import { db } from '@/infrastructure/db/client';
import { factories } from '../helpers/factories';
import { container } from '@/infrastructure/di/container';
import { serviceBays } from '@/infrastructure/db/schema';

describe('Service Bays API Integration', () => {
  let tenantId1: string;
  let token1: string;

  beforeAll(async () => {
    await container.initialize();
    const t1 = await factories.tenant();
    tenantId1 = t1.id;
    const u1 = await factories.user();
    await factories.userTenant(u1.id, tenantId1);

    token1 = container.jwtService.generateAccessToken({
      userId: u1.id,
      tenantId: tenantId1,
      role: 'TenantUser',
      permissions: [],
      isSuperAdmin: false,
    });
  });

  afterAll(async () => {
    await db.delete(serviceBays);
    await container.destroy();
  });

  describe('POST /api/v1/service-bays', () => {
    it('should create a service bay', async () => {
      const response = await request(app)
        .post('/api/v1/service-bays')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({
          name: 'Bay 1',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Bay 1');
    });
  });
});
