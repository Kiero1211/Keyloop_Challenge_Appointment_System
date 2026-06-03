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
  ('33333333-3333-3333-3333-333333333333', 'manager@keyloop.test', 'fakehash_for_testing', 'Manager', 'User', 'TenantManager', '{}'::text[], true, false, '11111111-1111-1111-1111-111111111111', now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'staff@keyloop.test', 'fakehash_for_testing', 'Staff', 'User', 'TenantUser', '{}'::text[], true, false, '11111111-1111-1111-1111-111111111111', now(), now())
ON CONFLICT ("email") DO NOTHING;

-- 3. Associate Users with Tenant
INSERT INTO "user_tenants" ("id", "user_id", "tenant_id", "role", "permissions", "is_active", "created_at", "updated_at")
VALUES 
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Admin', '{}'::text[], true, now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'TenantManager', '{}'::text[], true, now(), now()),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'TenantUser', '{}'::text[], true, now(), now())
ON CONFLICT ("user_id", "tenant_id") DO NOTHING;

-- 4. Create Vehicles
INSERT INTO "vehicles" ("id", "tenant_id", "user_id", "vin", "license_plate", "make", "model", "year", "created_at", "updated_at")
VALUES 
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '1HGCM82633A', 'ABC-1234', 'Honda', 'Accord', 2018, now(), now()),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'WMWJJ53444T', 'XYZ-9876', 'Mini', 'Cooper', 2021, now(), now());

-- 5. Create Service Types
INSERT INTO "service_types" ("id", "tenant_id", "name", "estimated_duration_minutes", "created_at", "updated_at")
VALUES 
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Oil Change', 30, now(), now()),
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Tire Rotation', 45, now(), now());

-- 6. Create Technicians
INSERT INTO "technicians" ("id", "tenant_id", "first_name", "last_name", "email", "is_active", "created_at", "updated_at")
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Mike', 'Mechanic', 'mike@keyloop.test', true, now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Sarah', 'Wrench', 'sarah@keyloop.test', true, now(), now());

-- 7. Create Service Bays
INSERT INTO "service_bays" ("id", "tenant_id", "name", "created_at", "updated_at")
VALUES 
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Bay 1', now(), now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Bay 2', now(), now());

-- 8. Create Appointments
INSERT INTO "appointments" ("id", "tenant_id", "user_id", "vehicle_id", "service_type_id", "technician_id", "service_bay_id", "start_time", "end_time", "status", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', '88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', now() + interval '1 day', now() + interval '1 day 30 minutes', 'Scheduled', now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', '99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now() + interval '2 days', now() + interval '2 days 45 minutes', 'Scheduled', now(), now());

-- 9. Create Technician Skills
INSERT INTO "technician_skills" ("id", "tenant_id", "technician_id", "service_type_id", "created_at")
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '88888888-8888-8888-8888-888888888888', now());
