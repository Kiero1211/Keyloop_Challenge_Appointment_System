-- Create Tables

CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("tenant_id", "id")
) PARTITION BY HASH ("tenant_id");

CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("tenant_id", "id")
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
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("tenant_id", "id")
);

CREATE TABLE IF NOT EXISTS "service_types" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"estimated_duration_minutes" integer NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("tenant_id", "id")
);

CREATE TABLE IF NOT EXISTS "technician_skills" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"service_type_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("tenant_id", "id")
);

CREATE TABLE IF NOT EXISTS "technicians" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("tenant_id", "id")
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
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" text DEFAULT 'TenantUser' NOT NULL,
	"permissions" text[] DEFAULT '{}'::text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("tenant_id", "id")
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
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"vin" text,
	"license_plate" text,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("tenant_id", "id")
);


CREATE TABLE IF NOT EXISTS "appointment_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"sent_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_appointment_reminders_tenant_appointment" ON "appointment_reminders" ("tenant_id", "appointment_id");

-- Indices
CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_id" ON "appointments" ("tenant_id","id");
CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_tech_time" ON "appointments" ("tenant_id","technician_id","start_time","end_time");
CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_bay_time" ON "appointments" ("tenant_id","service_bay_id","start_time","end_time");
CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_status" ON "appointments" ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_start_time" ON "appointments" ("tenant_id","start_time","end_time");
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


-- Create 64 Partitions for appointments
DO $$
DECLARE
    i INTEGER;
    partition_name TEXT;
BEGIN
    FOR i IN 0..63 LOOP
        partition_name := 'appointments_p' || LPAD(i::TEXT, 3, '0');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF appointments FOR VALUES WITH (MODULUS 64, REMAINDER %s);',
            partition_name,
            i
        );
    END LOOP;
END $$;

-- Create Tables for Audit Logs

CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"result" jsonb NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"user_id" text,
	PRIMARY KEY ("tenant_id", "id")
) PARTITION BY HASH ("tenant_id");

-- Indices for Audit Logs
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_entity" ON "audit_logs" ("tenant_id", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_timestamp" ON "audit_logs" ("tenant_id", "timestamp");

-- Create 64 Partitions for audit_logs
DO $$
DECLARE
    i INTEGER;
    partition_name TEXT;
BEGIN
    FOR i IN 0..63 LOOP
        partition_name := 'audit_logs_p' || LPAD(i::TEXT, 3, '0');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES WITH (MODULUS 64, REMAINDER %s);',
            partition_name,
            i
        );
    END LOOP;
END $$;


-- Appointment Reminders Table and View
CREATE OR REPLACE VIEW "appointment_reminder_view" AS
SELECT 
    a.tenant_id,
    a.id AS appointment_id,
    a.start_time AS appointment_start_time,
    a.status AS appointment_status,
    c.id AS customer_id,
    c.email AS customer_email,
    c.first_name || ' ' || c.last_name AS customer_name,
    v.id AS vehicle_id,
    v.make AS vehicle_make,
    v.model AS vehicle_model,
    CASE WHEN ar.id IS NOT NULL THEN true ELSE false END AS reminder_sent
FROM appointments a
JOIN customers c ON a.tenant_id = c.tenant_id AND a.customer_id = c.id
JOIN vehicles v ON a.tenant_id = v.tenant_id AND a.vehicle_id = v.id
LEFT JOIN appointment_reminders ar ON a.tenant_id = ar.tenant_id AND a.id = ar.appointment_id;
