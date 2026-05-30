import request from 'supertest';
import { app } from '../../src/infrastructure/http/app';
import { db } from '../../src/infrastructure/db/client';
import { factories } from '../helpers/factories';
import { container } from '../../src/infrastructure/di/container';
import { customers } from '../../src/infrastructure/db/schema';

describe('Customers API E2E', () => {
  let tenantId1: string;
  let token1: string;
  let customerId: string;

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
    await db.delete(customers);
    await container.destroy();
  });

  describe('POST /api/v1/customers', () => {
    it('should create a customer successfully', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890'
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('john.doe@example.com');
      customerId = response.body.id;
    });

    it('should block duplicate email within tenant', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'john.doe@example.com', // same email
        });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/v1/customers', () => {
    it('should return list of customers', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/v1/customers/:id', () => {
    it('should update customer successfully', async () => {
      const response = await request(app)
        .put(`/api/v1/customers/${customerId}`)
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({
          firstName: 'Johnny',
        });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe('Johnny');
    });
  });

  describe('DELETE /api/v1/customers/:id', () => {
    it('should delete customer successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/customers/${customerId}`)
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1);

      expect(response.status).toBe(204);
    });
  });
});
