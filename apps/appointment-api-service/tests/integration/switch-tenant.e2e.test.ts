import request from 'supertest';
import { app } from '../../../src/infrastructure/http/app';
import { db } from '../../../src/infrastructure/db/client';
import { users, userTenants, refreshTokens, tenants } from '../../../src/infrastructure/db/schema';
import { eq } from 'drizzle-orm';
import { container } from '../../../src/infrastructure/di/container';
import { factories } from '../../helpers/factories';

describe('Switch Tenant API E2E', () => {
  let userId: string;
  let tenant1Id: string;
  let tenant2Id: string;
  let oldRefreshToken: string;

  beforeAll(async () => {
    await container.initialize();
    
    // Create tenants
    const t1 = await container.tenantRepository.create({ name: 'Tenant 1' });
    const t2 = await container.tenantRepository.create({ name: 'Tenant 2' });
    tenant1Id = t1.id;
    tenant2Id = t2.id;

    // Create user in t1
    const user = await factories.user();
    userId = user.id;

    await container.userTenantRepository.create({
      userId,
      tenantId: tenant1Id,
      role: 'TenantUser',
    });
    
    await container.userTenantRepository.create({
      userId,
      tenantId: tenant2Id,
      role: 'TenantUser',
    });

    const tokens = await container.refreshTokenRepository.create({
        userId,
        token: 'refresh-switch',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });
    
    oldRefreshToken = tokens.token;
  });

  afterAll(async () => {
    await db.delete(userTenants).where(eq(userTenants.userId, userId));
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(tenants).where(eq(tenants.id, tenant1Id));
    await db.delete(tenants).where(eq(tenants.id, tenant2Id));
    await container.destroy();
  });

  it('should switch tenant and return new tokens', async () => {
    const response = await request(app)
      .post('/api/v1/auth/switch-tenant')
      .send({
        targetTenantId: tenant2Id,
        refreshToken: oldRefreshToken
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.tenantId).toBe(tenant2Id);
  });
});
