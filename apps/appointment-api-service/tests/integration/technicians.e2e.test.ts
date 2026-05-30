import request from 'supertest';
import { app } from '../../../src/infrastructure/http/app';
import { db } from '../../../src/infrastructure/db/client';
import { factories } from '../../helpers/factories';
import { container } from '../../../src/infrastructure/di/container';
import { technicians, technicianSkills, serviceTypes } from '../../../src/infrastructure/db/schema';

describe('Technicians API Integration', () => {
  let tenantId1: string;
  let token1: string;
  let serviceTypeId: string;

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

    const st = await factories.serviceType(tenantId1);
    serviceTypeId = st.id;
  });

  afterAll(async () => {
    await db.delete(technicianSkills);
    await db.delete(technicians);
    await db.delete(serviceTypes);
    await container.destroy();
  });

  describe('POST /api/v1/technicians', () => {
    it('should create a technician', async () => {
      const response = await request(app)
        .post('/api/v1/technicians')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({
          firstName: 'Tech',
          lastName: 'One',
          email: 'tech1@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('tech1@example.com');
    });
  });
});
