ALTER TABLE "customer_licenses" ADD COLUMN "usage_status" text DEFAULT 'unused' NOT NULL;
--> statement-breakpoint
ALTER TABLE "customer_licenses" ADD COLUMN "used_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "order_shipments" ADD COLUMN "usage_status" text DEFAULT 'unused' NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_shipments" ADD COLUMN "used_at" timestamp with time zone;
