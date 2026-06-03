import request from 'supertest';
import { app } from '@/infrastructure/http/app';
import { db } from '@/infrastructure/db/client';
import { factories } from '../helpers/factories';
import { container } from '@/infrastructure/di/container';
import { vehicles } from '@/infrastructure/db/schema';

describe('Vehicles API E2E', () => {
  let tenantId1: string;
  let token1: string;
  let userId: string;
  let vehicleId: string;

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

    const owner = await factories.user();
    await factories.userTenant(owner.id, tenantId1);
    userId = owner.id;
  });

  afterAll(async () => {
    await db.delete(vehicles);
    await container.destroy();
  });

  describe('POST /api/v1/vehicles', () => {
    it('should create a vehicle successfully', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${token1}`)
      .set('x-tenant-id', tenantId1)
      .send({
        userId,
        licensePlate: 'TEST-123',
        make: 'Toyota',
        model: 'Corolla',
        year: 2022
        });

      expect(response.status).toBe(201);
      expect(response.body.licensePlate).toBe('TEST-123');
      vehicleId = response.body.id;
    });

    it('should fail with cross-tenant userId', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({
          userId: '00000000-0000-0000-0000-000000000000', // random uuid
          licensePlate: 'TEST-456',
          make: 'Ford',
          model: 'Focus',
          year: 2021
        });

      expect(response.status).toBe(422); // Unprocessable Exception
    });
  });

  describe('GET /api/v1/vehicles', () => {
    it('should return list of vehicles for user scope', async () => {
      const response = await request(app)
        .get(`/api/v1/vehicles?scope=mine&userId=${userId}`)
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/v1/vehicles/:id', () => {
    it('should update vehicle successfully', async () => {
      const response = await request(app)
        .put(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1)
        .send({
          licensePlate: 'NEW-PLATE',
        });

      expect(response.status).toBe(200);
      expect(response.body.licensePlate).toBe('NEW-PLATE');
    });
  });

  describe('DELETE /api/v1/vehicles/:id', () => {
    it('should delete vehicle successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${token1}`)
        .set('x-tenant-id', tenantId1);

      expect(response.status).toBe(204);
    });
  });
});
