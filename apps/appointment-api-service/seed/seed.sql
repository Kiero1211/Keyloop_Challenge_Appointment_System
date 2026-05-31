-- Create Tables

CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"service_type_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"service_bay_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"notes" text,
	"actual_start_time" timestamp with time zone,
	"actual_end_time" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_revoked" boolean DEFAULT false,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);

CREATE TABLE IF NOT EXISTS "service_bays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "service_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"estimated_duration_minutes" integer NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "technician_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"service_type_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "technicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_name_unique" UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "user_tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" text DEFAULT 'TenantUser' NOT NULL,
	"permissions" text[] DEFAULT '{}'::text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" text NOT NULL,
	"permissions" text[] DEFAULT '{}'::text[],
	"is_active" boolean DEFAULT true,
	"is_super_admin" boolean DEFAULT false,
	"last_login_at" timestamp with time zone,
	"last_active_tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"vin" text,
	"license_plate" text,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_id" ON "appointments" ("tenant_id","id");
CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_tech_time" ON "appointments" ("tenant_id","technician_id","start_time","end_time");
CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_bay_time" ON "appointments" ("tenant_id","service_bay_id","start_time","end_time");
CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_status" ON "appointments" ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_start_time" ON "appointments" ("tenant_id","start_time");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_customers_tenant_email" ON "customers" ("tenant_id","email");
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_id" ON "customers" ("tenant_id","id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_token" ON "refresh_tokens" ("token");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_tenant_id" ON "refresh_tokens" ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_service_bays_tenant_name" ON "service_bays" ("tenant_id","name");
CREATE INDEX IF NOT EXISTS "idx_service_bays_tenant_id" ON "service_bays" ("tenant_id","id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_service_types_tenant_name" ON "service_types" ("tenant_id","name");
CREATE INDEX IF NOT EXISTS "idx_service_types_tenant_id" ON "service_types" ("tenant_id","id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_technician_skills_unique" ON "technician_skills" ("tenant_id","technician_id","service_type_id");
CREATE INDEX IF NOT EXISTS "idx_technician_skills_tenant_technician" ON "technician_skills" ("tenant_id","technician_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_technicians_tenant_email" ON "technicians" ("tenant_id","email");
CREATE INDEX IF NOT EXISTS "idx_technicians_tenant_id" ON "technicians" ("tenant_id","id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_tenants_unique" ON "user_tenants" ("user_id","tenant_id");
CREATE INDEX IF NOT EXISTS "idx_user_tenants_tenant_id" ON "user_tenants" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_users_last_active_tenant_id" ON "users" ("last_active_tenant_id");
CREATE INDEX IF NOT EXISTS "idx_vehicles_tenant_customer" ON "vehicles" ("tenant_id","customer_id");
CREATE INDEX IF NOT EXISTS "idx_vehicles_tenant_id" ON "vehicles" ("tenant_id","id");

-- Seed Data

-- 1. Create a Tenant
INSERT INTO "tenants" ("id", "name", "is_active", "created_at", "updated_at")
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Keyloop Dealership', true, now(), now())
ON CONFLICT ("name") DO NOTHING;

-- 2. Create Users
INSERT INTO "users" ("id", "email", "password_hash", "first_name", "last_name", "role", "permissions", "is_active", "is_super_admin", "last_active_tenant_id", "created_at", "updated_at")
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'admin@keyloop.test', 'fakehash_for_testing', 'Admin', 'User', 'Admin', '{}'::text[], true, true, '11111111-1111-1111-1111-111111111111', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'staff@keyloop.test', 'fakehash_for_testing', 'Staff', 'User', 'TenantUser', '{}'::text[], true, false, '11111111-1111-1111-1111-111111111111', now(), now())
ON CONFLICT ("email") DO NOTHING;

-- 3. Associate Users with Tenant
INSERT INTO "user_tenants" ("id", "user_id", "tenant_id", "role", "permissions", "is_active", "created_at", "updated_at")
VALUES 
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Admin', '{}'::text[], true, now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'TenantUser', '{}'::text[], true, now(), now());

-- 4. Create Customers
INSERT INTO "customers" ("id", "tenant_id", "first_name", "last_name", "email", "phone", "created_at", "updated_at")
VALUES 
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'John', 'Doe', 'john.doe@example.com', '555-0100', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Jane', 'Smith', 'jane.smith@example.com', '555-0101', now(), now());

-- 5. Create Vehicles
INSERT INTO "vehicles" ("id", "tenant_id", "customer_id", "vin", "license_plate", "make", "model", "year", "created_at", "updated_at")
VALUES 
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '1HGCM82633A', 'ABC-1234', 'Honda', 'Accord', 2018, now(), now()),
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'WMWJJ53444T', 'XYZ-9876', 'Mini', 'Cooper', 2021, now(), now());

-- 6. Create Service Types
INSERT INTO "service_types" ("id", "tenant_id", "name", "estimated_duration_minutes", "created_at", "updated_at")
VALUES 
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Oil Change', 30, now(), now()),
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Tire Rotation', 45, now(), now());

-- 7. Create Technicians
INSERT INTO "technicians" ("id", "tenant_id", "first_name", "last_name", "email", "is_active", "created_at", "updated_at")
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Mike', 'Mechanic', 'mike@keyloop.test', true, now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Sarah', 'Wrench', 'sarah@keyloop.test', true, now(), now());

-- 8. Create Service Bays
INSERT INTO "service_bays" ("id", "tenant_id", "name", "created_at", "updated_at")
VALUES 
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Bay 1', now(), now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Bay 2', now(), now());

