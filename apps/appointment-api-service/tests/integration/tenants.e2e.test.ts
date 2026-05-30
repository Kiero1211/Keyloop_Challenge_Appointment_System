import request from 'supertest';
import { app } from '../../../src/infrastructure/http/app';
import { db } from '../../../src/infrastructure/db/client';
import { factories } from '../../helpers/factories';
import { container } from '../../../src/infrastructure/di/container';
import { tenants } from '../../../src/infrastructure/db/schema';
import { eq } from 'drizzle-orm';

describe('Tenants API E2E', () => {
  let tenantId1: string;
  let adminToken: string;
  let userToken: string;
  let createdTenantId: string;

  beforeAll(async () => {
    await container.initialize();
    
    // Create an Admin user
    const u1 = await factories.user();
    adminToken = container.jwtService.generateAccessToken({
      userId: u1.id,
      tenantId: 'system',
      role: 'Admin',
      permissions: [],
      isSuperAdmin: true,
    });

    // Create a normal TenantUser
    const u2 = await factories.user();
    userToken = container.jwtService.generateAccessToken({
      userId: u2.id,
      tenantId: 't2',
      role: 'TenantUser',
      permissions: [],
      isSuperAdmin: false,
    });
  });

  afterAll(async () => {
    if (createdTenantId) {
       await db.delete(tenants).where(eq(tenants.id, createdTenantId));
    }
    await container.destroy();
  });

  describe('POST /api/v1/tenants', () => {
    it('should block non-admin', async () => {
      const response = await request(app)
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'User Tenant' });

      expect(response.status).toBe(403);
    });

    it('should allow Admin to create tenant', async () => {
      const response = await request(app)
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Created Tenant' });

      expect(response.status).toBe(201);
      createdTenantId = response.body.id;
    });

    it('should return 409 for duplicate name', async () => {
      const response = await request(app)
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Created Tenant' });

      expect(response.status).toBe(409);
    });
  });
});
