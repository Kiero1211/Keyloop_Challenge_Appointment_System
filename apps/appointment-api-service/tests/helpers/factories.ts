import { db } from '@/infrastructure/db/client';
import { users, tenants, userTenants, vehicles, serviceTypes, technicians, serviceBays, appointments } from '@/infrastructure/db/schema';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

export const factories = {
  tenant: async (overrides = {}) => {
    const [tenant] = await db.insert(tenants).values({
      name: `Tenant ${uuidv4()}`,
      ...overrides,
    }).returning();
    return tenant;
  },

  user: async (overrides = {}) => {
    const passwordHash = await bcrypt.hash('password123', 10);
    const [user] = await db.insert(users).values({
      email: `user-${uuidv4()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'TenantUser',
      passwordHash,
      ...overrides,
    }).returning();
    return user;
  },

  userTenant: async (userId: string, tenantId: string, role = 'TenantUser') => {
    const [ut] = await db.insert(userTenants).values({
      userId,
      tenantId,
      role,
    }).returning();
    return ut;
  },

  vehicle: async (tenantId: string, userId: string, overrides = {}) => {
    const [vehicle] = await db.insert(vehicles).values({
      tenantId,
      userId,
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      licensePlate: `LP-${uuidv4()}`,
      ...overrides,
    }).returning();
    return vehicle;
  },

  serviceType: async (tenantId: string, overrides = {}) => {
    const [serviceType] = await db.insert(serviceTypes).values({
      tenantId,
      name: `Oil Change ${uuidv4()}`,
      estimatedDurationMinutes: 30,
      ...overrides,
    }).returning();
    return serviceType;
  },

  technician: async (tenantId: string, overrides = {}) => {
    const [tech] = await db.insert(technicians).values({
      tenantId,
      firstName: 'Tech',
      lastName: 'Name',
      email: `tech-${uuidv4()}@example.com`,
      ...overrides,
    }).returning();
    return tech;
  },

  serviceBay: async (tenantId: string, overrides = {}) => {
    const [bay] = await db.insert(serviceBays).values({
      tenantId,
      name: `Bay ${uuidv4()}`,
      ...overrides,
    }).returning();
    return bay;
  },

  appointment: async (tenantId: string, userId: string, vehicleId: string, serviceTypeId: string, technicianId: string, serviceBayId: string, overrides = {}) => {
    const now = new Date();
    const scheduledStartTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const scheduledEndTime = new Date(scheduledStartTime.getTime() + 30 * 60 * 1000);

    const [app] = await db.insert(appointments).values({
      tenantId,
      userId,
      vehicleId,
      serviceTypeId,
      technicianId,
      serviceBayId,
      scheduledStartTime,
      scheduledEndTime,
      status: 'Scheduled',
      ...overrides,
    }).returning();
    return app;
  },
};
