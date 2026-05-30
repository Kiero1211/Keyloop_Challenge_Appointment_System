import request from 'supertest';
import { app } from '../../src/infrastructure/http/app';
import { db } from '../../src/infrastructure/db/client';
import { container } from '../../src/infrastructure/di/container';
import { factories } from '../helpers/factories';
import { appointments } from '../../src/infrastructure/db/schema';
import { eq } from 'drizzle-orm';

describe('Appointments List API E2E', () => {
  let tenantId: string;
  let adminToken: string;

  beforeAll(async () => {
    await container.initialize();
    const t = await container.tenantRepository.create({ name: 'List Tenant' });
    tenantId = t.id;

    const u1 = await factories.user();
    adminToken = container.jwtService.generateAccessToken({
      userId: u1.id,
      tenantId: tenantId,
      role: 'Admin',
      permissions: [],
      isSuperAdmin: false,
    });
  });

  afterAll(async () => {
    await container.destroy();
  });

  it('should filter appointments', async () => {
    const response = await request(app)
      .get('/api/v1/appointments?date=2026-06-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
