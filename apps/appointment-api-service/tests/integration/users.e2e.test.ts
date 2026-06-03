import request from 'supertest';
import { app } from '@/infrastructure/http/app';
import { container } from '@/infrastructure/di/container';
import { factories } from '../helpers/factories';

describe('Users API E2E', () => {
  let tenantId: string;
  let managerToken: string;
  let userToken: string;

  beforeAll(async () => {
    await container.initialize();

    const tenant = await factories.tenant();
    tenantId = tenant.id;

    const manager = await factories.user({ role: 'TenantManager' });
    await factories.userTenant(manager.id, tenantId, 'TenantManager');
    managerToken = container.jwtService.generateAccessToken({
      userId: manager.id,
      tenantId,
      role: 'TenantManager',
      permissions: [],
      isSuperAdmin: false,
    });

    const user = await factories.user();
    await factories.userTenant(user.id, tenantId, 'TenantUser');
    userToken = container.jwtService.generateAccessToken({
      userId: user.id,
      tenantId,
      role: 'TenantUser',
      permissions: [],
      isSuperAdmin: false,
    });
  });

  afterAll(async () => {
    await container.destroy();
  });

  it('should list tenant users for TenantManager with x-tenant-id', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should forbid TenantUser from listing tenant users', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(403);
  });
});
