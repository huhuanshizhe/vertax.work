ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "radar_monthly_leads_limit" integer DEFAULT 500 NOT NULL;
