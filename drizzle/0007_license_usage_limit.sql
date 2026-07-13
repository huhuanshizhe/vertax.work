ALTER TABLE "site_settings" ADD COLUMN "license_usage_limit_months" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "customer_licenses" ADD COLUMN "usage_limit_months" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "customer_licenses" ADD COLUMN "usage_expires_at" timestamp with time zone;
