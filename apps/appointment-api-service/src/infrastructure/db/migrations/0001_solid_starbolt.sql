ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'Scheduled';--> statement-breakpoint
ALTER TABLE "user_tenants" ALTER COLUMN "permissions" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "permissions" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "actual_start_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "actual_end_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" DROP COLUMN IF EXISTS "is_active";