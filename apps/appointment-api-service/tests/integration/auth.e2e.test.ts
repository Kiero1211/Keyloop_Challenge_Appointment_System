import request from 'supertest';
import { app } from '../../../src/infrastructure/http/app';
import { db } from '../../../src/infrastructure/db/client';
import { users, userTenants, refreshTokens, tenants } from '../../../src/infrastructure/db/schema';
import { eq } from 'drizzle-orm';
import { container } from '../../../src/infrastructure/di/container';

describe('Auth API E2E', () => {
  let createdUserId: string;
  let createdTenantId: string;

  beforeAll(async () => {
    await container.initialize();
  });

  afterAll(async () => {
    if (createdUserId) await db.delete(userTenants).where(eq(userTenants.userId, createdUserId));
    if (createdUserId) await db.delete(refreshTokens).where(eq(refreshTokens.userId, createdUserId));
    if (createdUserId) await db.delete(users).where(eq(users.id, createdUserId));
    if (createdTenantId) await db.delete(tenants).where(eq(tenants.id, createdTenantId));
    await container.destroy();
  });

  it('should register a new user', async () => {
    // Create a tenant first
    const t = await container.tenantRepository.create({ name: 'Auth Tenant' });
    createdTenantId = t.id;

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'testauth@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Auth',
        tenantId: createdTenantId
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    createdUserId = response.body.user.id;
  });

  it('should login an existing user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'testauth@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });
});
