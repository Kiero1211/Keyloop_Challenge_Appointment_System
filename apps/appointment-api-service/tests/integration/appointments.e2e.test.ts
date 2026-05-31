import request from 'supertest';
import { app } from '@/infrastructure/http/app';
import { db } from '@/infrastructure/db/client';
import { factories } from '../helpers/factories';
import { container } from '@/infrastructure/di/container';
import { appointments, customers, vehicles, serviceTypes, technicians, serviceBays } from '@/infrastructure/db/schema';

describe('Appointments API Integration', () => {
  let tenantId1: string;
  let token1: string;
  let customerId: string;
  let vehicleId: string;
  let serviceTypeId: string;
  let technicianId: string;
  let serviceBayId: string;

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
    customerId = c.id;
    const v = await factories.vehicle(tenantId1, c.id);
    vehicleId = v.id;
    const st = await factories.serviceType(tenantId1);
    serviceTypeId = st.id;
    const t = await factories.technician(tenantId1);
    technicianId = t.id;
    const sb = await factories.serviceBay(tenantId1);
    serviceBayId = sb.id;
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

  describe('POST /api/v1/crud-appointments', () => {
    it('should create an appointment successfully', async () => {
      const response = await request(app)
        .post('/api/v1/crud-appointments')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({
          customerId,
          vehicleId,
          serviceTypeId,
          technicianId,
          serviceBayId,
          scheduledStartTime: new Date().toISOString(),
          scheduledEndTime: new Date(Date.now() + 3600000).toISOString(),
          notes: 'Test Appt',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('Scheduled');
    });
  });
});
