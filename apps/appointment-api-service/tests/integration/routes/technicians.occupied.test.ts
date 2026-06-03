import request from 'supertest';
import { app } from '@/infrastructure/http/app';
import { container } from '@/infrastructure/di/container';
import { factories } from '@/tests/helpers/factories';

describe('Technicians occupied slots API', () => {
  let tenantId: string;
  let token: string;
  let technicianId: string;

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

    const technician = await factories.technician(tenantId);
    technicianId = technician.id;

    await container.cacheProvider.zadd(
      `tenant:${tenantId}:technician:${technicianId}:occupied`,
      Math.floor(new Date('2026-06-03T10:00:00.000Z').getTime() / 1000),
      'appt-1'
    );
    await container.cacheProvider.hset(`tenant:${tenantId}:occupied_slot:appt-1`, {
      appointment_id: 'appt-1',
      start_time: '2026-06-03T10:00:00.000Z',
      end_time: '2026-06-03T11:00:00.000Z',
    });
  });

  afterAll(async () => {
    await container.destroy();
  });

  it('returns occupied slots for the technician', async () => {
    const response = await request(app)
      .get(`/api/v1/technicians/${technicianId}/occupied?date=2026-06-03`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      technicianId,
      occupiedSlots: [
        {
          appointmentId: 'appt-1',
          startTime: '2026-06-03T10:00:00.000Z',
          endTime: '2026-06-03T11:00:00.000Z',
        },
      ],
    });
  });
});
