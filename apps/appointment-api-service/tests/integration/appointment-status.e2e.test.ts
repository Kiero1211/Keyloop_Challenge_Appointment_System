import request from 'supertest';
import { app } from '@/infrastructure/http/app';
import { db } from '@/infrastructure/db/client';
import { factories } from '../helpers/factories';
import { container } from '@/infrastructure/di/container';
import { appointments, customers, vehicles, serviceTypes, technicians, serviceBays } from '@/infrastructure/db/schema';

describe('Appointment Status E2E', () => {
  let tenantId1: string;
  let token1: string;
  let appointmentId: string;

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

    const c = await factories.customer(tenantId1);
    const v = await factories.vehicle(tenantId1, c.id);
    const st = await factories.serviceType(tenantId1);
    const t = await factories.technician(tenantId1);
    const sb = await factories.serviceBay(tenantId1);

    const appt = await db.insert(appointments).values({
      tenantId: tenantId1,
      customerId: c.id,
      vehicleId: v.id,
      serviceTypeId: st.id,
      technicianId: t.id,
      serviceBayId: sb.id,
      scheduledStartTime: new Date(),
      scheduledEndTime: new Date(Date.now() + 3600000),
      status: 'PENDING'
    }).returning();
    appointmentId = appt[0].id;
  });

  afterAll(async () => {
    await db.delete(appointments);
    await db.delete(serviceBays);
    await db.delete(technicians);
    await db.delete(serviceTypes);
    await db.delete(vehicles);
    await db.delete(customers);
    await container.destroy();
  });

  describe('PATCH /api/v1/appointments/:id/status', () => {
    it('should transition to CONFIRMED successfully', async () => {
      const response = await request(app)
        .patch(`/api/v1/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({ status: 'CONFIRMED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should transition to COMPLETED successfully', async () => {
      const response = await request(app)
        .patch(`/api/v1/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('COMPLETED');
    });

    it('should block transition from COMPLETED to CANCELLED (422)', async () => {
      const response = await request(app)
        .patch(`/api/v1/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({ status: 'CANCELLED' });

      expect(response.status).toBe(422);
    });
  });
});
