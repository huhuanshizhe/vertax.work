CREATE TABLE "customer_licenses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"modules" jsonb NOT NULL,
	"period" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"monthly_leads_limit" integer DEFAULT 500 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"payload_json" jsonb,
	"admin_id" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_licenses" ADD CONSTRAINT "customer_licenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "customer_licenses" ADD CONSTRAINT "customer_licenses_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "customer_licenses_code_uidx" ON "customer_licenses" USING btree ("code");
--> statement-breakpoint
CREATE INDEX "customer_licenses_user_id_idx" ON "customer_licenses" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "customer_licenses_created_at_idx" ON "customer_licenses" USING btree ("created_at");
