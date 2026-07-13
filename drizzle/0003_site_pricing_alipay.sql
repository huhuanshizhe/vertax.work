CREATE TABLE IF NOT EXISTS "site_settings" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "payment_sandbox_mode" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_prices" (
  "id" text PRIMARY KEY NOT NULL,
  "module" text NOT NULL,
  "period" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "license_prices_module_period_uidx"
  ON "license_prices" ("module", "period");
--> statement-breakpoint
INSERT INTO "site_settings" ("id", "payment_sandbox_mode", "updated_at")
VALUES ('default', true, now())
ON CONFLICT ("id") DO NOTHING;
