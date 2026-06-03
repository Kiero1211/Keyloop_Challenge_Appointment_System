import { pgTable, uuid, text, boolean, timestamp, integer, uniqueIndex, index, jsonb } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role').notNull(),
  permissions: text('permissions').array().default(sql`'{}'::text[]`),
  isActive: boolean('is_active').default(true),
  isSuperAdmin: boolean('is_super_admin').default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastActiveTenantId: uuid('last_active_tenant_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  lastActiveTenantIdx: index('idx_users_last_active_tenant_id').on(table.lastActiveTenantId),
}));

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isRevoked: boolean('is_revoked').default(false),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('idx_refresh_tokens_token').on(table.token),
  userIdIdx: index('idx_refresh_tokens_user_id').on(table.userId),
  tenantIdIdx: index('idx_refresh_tokens_tenant_id').on(table.tenantId),
}));

export const userTenants = pgTable('user_tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  role: text('role').notNull().default('TenantUser'),
  permissions: text('permissions').array().default(sql`'{}'::text[]`),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userTenantIdx: uniqueIndex('idx_user_tenants_unique').on(table.userId, table.tenantId),
  tenantIdIdx: index('idx_user_tenants_tenant_id').on(table.tenantId),
}));

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  vin: text('vin'),
  licensePlate: text('license_plate'),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantUserIdx: index('idx_vehicles_tenant_user').on(table.tenantId, table.userId),
  tenantIdIdx: index('idx_vehicles_tenant_id').on(table.tenantId, table.id),
}));

export const serviceTypes = pgTable('service_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  estimatedDurationMinutes: integer('estimated_duration_minutes').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantNameIdx: uniqueIndex('idx_service_types_tenant_name').on(table.tenantId, table.name),
  tenantIdIdx: index('idx_service_types_tenant_id').on(table.tenantId, table.id),
}));

export const technicians = pgTable('technicians', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantEmailIdx: uniqueIndex('idx_technicians_tenant_email').on(table.tenantId, table.email),
  tenantIdIdx: index('idx_technicians_tenant_id').on(table.tenantId, table.id),
}));

export const technicianSkills = pgTable('technician_skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  technicianId: uuid('technician_id').notNull().references(() => technicians.id),
  serviceTypeId: uuid('service_type_id').notNull().references(() => serviceTypes.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueSkillIdx: uniqueIndex('idx_technician_skills_unique').on(table.tenantId, table.technicianId, table.serviceTypeId),
  tenantTechnicianIdx: index('idx_technician_skills_tenant_technician').on(table.tenantId, table.technicianId),
}));

export const serviceBays = pgTable('service_bays', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantNameIdx: uniqueIndex('idx_service_bays_tenant_name').on(table.tenantId, table.name),
  tenantIdIdx: index('idx_service_bays_tenant_id').on(table.tenantId, table.id),
}));

export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  serviceTypeId: uuid('service_type_id').notNull().references(() => serviceTypes.id),
  technicianId: uuid('technician_id').notNull().references(() => technicians.id),
  serviceBayId: uuid('service_bay_id').notNull().references(() => serviceBays.id),
  scheduledStartTime: timestamp('start_time', { withTimezone: true }).notNull(),
  scheduledEndTime: timestamp('end_time', { withTimezone: true }).notNull(),
  actualStartTime: timestamp('actual_start_time', { withTimezone: true }),
  actualEndTime: timestamp('actual_end_time', { withTimezone: true }),
  status: text('status').notNull().default('Scheduled'),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('idx_appointments_tenant_id').on(table.tenantId, table.id),
  tenantUserIdx: index('idx_appointments_tenant_user').on(table.tenantId, table.userId),
  tenantTechnicianTimeIdx: index('idx_appointments_tenant_tech_time').on(table.tenantId, table.technicianId, table.scheduledStartTime, table.scheduledEndTime),
  tenantBayTimeIdx: index('idx_appointments_tenant_bay_time').on(table.tenantId, table.serviceBayId, table.scheduledStartTime, table.scheduledEndTime),
  tenantStatusIdx: index('idx_appointments_tenant_status').on(table.tenantId, table.status),
  tenantStartTimeIdx: index('idx_appointments_tenant_start_time').on(table.tenantId, table.scheduledStartTime),
}));

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  userTenants: many(userTenants),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  userTenants: many(userTenants),
  vehicles: many(vehicles),
  serviceTypes: many(serviceTypes),
  technicians: many(technicians),
  serviceBays: many(serviceBays),
  appointments: many(appointments),
}));

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  result: jsonb('result').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  userId: text('user_id'),
}, (table) => ({
  tenantEntityIdx: index('idx_audit_logs_tenant_entity').on(table.tenantId, table.entityType, table.entityId),
  tenantTimestampIdx: index('idx_audit_logs_tenant_timestamp').on(table.tenantId, table.timestamp),
}));
