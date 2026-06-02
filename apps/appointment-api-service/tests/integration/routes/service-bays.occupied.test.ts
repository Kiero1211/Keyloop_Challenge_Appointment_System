import request from 'supertest';
import { app } from '@/infrastructure/http/app';
import { container } from '@/infrastructure/di/container';
import { factories } from '@/tests/helpers/factories';

describe('Service bays occupied slots API', () => {
  let tenantId: string;
  let token: string;
  let serviceBayId: string;

  beforeAll(async () => {
    await container.initialize();

    const tenant = await factories.tenant();
    tenantId = tenant.id;
    const user = await factories.user();
    await factories.userTenant(user.id, tenantId);

    token = container.jwtService.generateAccessToken({
      userId: user.id,
      tenantId,
      role: 'TenantUser',
      permissions: [],
      isSuperAdmin: false,
    });

    const bay = await factories.serviceBay(tenantId);
    serviceBayId = bay.id;

    await container.cacheProvider.zadd(
      `tenant:${tenantId}:bay:${serviceBayId}:occupied`,
      Math.floor(new Date('2026-06-03T12:00:00.000Z').getTime() / 1000),
      'appt-2'
    );
    await container.cacheProvider.hset(`tenant:${tenantId}:occupied_slot:appt-2`, {
      appointment_id: 'appt-2',
      start_time: '2026-06-03T12:00:00.000Z',
      end_time: '2026-06-03T13:00:00.000Z',
    });
  });

  afterAll(async () => {
    await container.destroy();
  });

  it('returns occupied slots for the service bay', async () => {
    const response = await request(app)
      .get(`/api/v1/service-bays/${serviceBayId}/occupied?date=2026-06-03`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      serviceBayId,
      occupiedSlots: [
        {
          appointmentId: 'appt-2',
          startTime: '2026-06-03T12:00:00.000Z',
          endTime: '2026-06-03T13:00:00.000Z',
        },
      ],
    });
  });
});
