ALTER TABLE "license_prices"
  ADD COLUMN IF NOT EXISTS "auto_from_monthly" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE "license_prices"
SET "auto_from_monthly" = false
WHERE "period" = 'month';
