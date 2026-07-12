-- Align schema with vexmotor-admin patterns (SaaS adapted)
--> statement-breakpoint

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "internal_note" text;
--> statement-breakpoint

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_status" text DEFAULT 'unshipped' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refund_status" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "subtotal_cents" integer;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "total_amount_cents" integer;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "internal_note" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "terminated_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "terminated_by" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "placed_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint

UPDATE "orders"
SET
  "subtotal_cents" = COALESCE("subtotal_cents", "amount_cents"),
  "total_amount_cents" = COALESCE("total_amount_cents", "amount_cents"),
  "placed_at" = COALESCE("placed_at", "created_at"),
  "status" = CASE
    WHEN "status" = 'paid' THEN 'pending_processing'
    ELSE "status"
  END,
  "shipping_status" = CASE
    WHEN "status" IN ('shipped', 'partially_shipped', 'completed') THEN 'shipped'
    ELSE COALESCE("shipping_status", 'unshipped')
  END
WHERE "subtotal_cents" IS NULL OR "total_amount_cents" IS NULL OR "status" = 'paid';
--> statement-breakpoint

UPDATE "orders"
SET
  "subtotal_cents" = COALESCE("subtotal_cents", 0),
  "total_amount_cents" = COALESCE("total_amount_cents", 0),
  "placed_at" = COALESCE("placed_at", "created_at");
--> statement-breakpoint

ALTER TABLE "orders" ALTER COLUMN "subtotal_cents" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "total_amount_cents" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "placed_at" SET NOT NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_name" text NOT NULL,
	"feature_selections" jsonb NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" USING btree ("order_id");
--> statement-breakpoint

INSERT INTO "order_items" (
  "id", "order_id", "product_name", "feature_selections", "quantity", "unit_price_cents", "subtotal_cents", "created_at"
)
SELECT
  'oit_' || substr(md5(o.id), 1, 16),
  o.id,
  'VertaX 模块授权',
  jsonb_build_object(
    'modules', COALESCE(o.modules::jsonb, '[]'::jsonb),
    'period', o.period,
    'monthlyLeadsLimit', COALESCE(o.monthly_leads_limit, 500)
  ),
  1,
  COALESCE(o.total_amount_cents, o.amount_cents, 0),
  COALESCE(o.total_amount_cents, o.amount_cents, 0),
  o.created_at
FROM "orders" o
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'orders' AND column_name = 'modules'
)
AND NOT EXISTS (
  SELECT 1 FROM "order_items" oi WHERE oi.order_id = o.id
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "order_shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"tracking_number" text NOT NULL,
	"shipped_at" timestamp with time zone NOT NULL,
	"note" text,
	"admin_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_shipments" ADD CONSTRAINT "order_shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_shipments" ADD CONSTRAINT "order_shipments_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_shipments_order_id_idx" ON "order_shipments" USING btree ("order_id");
--> statement-breakpoint

ALTER TABLE "order_action_logs" ADD COLUMN IF NOT EXISTS "action_type" text;
--> statement-breakpoint
UPDATE "order_action_logs" SET "action_type" = COALESCE("action_type", "action") WHERE "action_type" IS NULL;
--> statement-breakpoint
ALTER TABLE "order_action_logs" ALTER COLUMN "action_type" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "sales_status" text DEFAULT 'unset' NOT NULL;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "awaiting_admin" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "queue_kind" text DEFAULT 'new_inquiry' NOT NULL;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "rfq_payload" jsonb;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "internal_note" text;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "last_message_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "terminated_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inquiries_awaiting_admin_idx" ON "inquiries" USING btree ("awaiting_admin");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inquiry_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"inquiry_id" text NOT NULL,
	"sender_type" text NOT NULL,
	"admin_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inquiry_messages_inquiry_id_idx" ON "inquiry_messages" USING btree ("inquiry_id");
--> statement-breakpoint

INSERT INTO "inquiry_messages" ("id", "inquiry_id", "sender_type", "body", "created_at")
SELECT
  'msg_' || substr(md5(i.id), 1, 16),
  i.id,
  'customer',
  COALESCE(i.message, '（客户提交询盘）'),
  i.created_at
FROM "inquiries" i
WHERE i.message IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM "inquiry_messages" m WHERE m.inquiry_id = i.id
);
--> statement-breakpoint

UPDATE "inquiries"
SET
  "rfq_payload" = COALESCE(
    "rfq_payload",
    jsonb_build_object('message', COALESCE("message", ''))
  ),
  "last_message_at" = COALESCE("last_message_at", "created_at"),
  "internal_note" = COALESCE("internal_note", "note");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "orders_payment_status_idx" ON "orders" USING btree ("payment_status");
--> statement-breakpoint

ALTER TABLE "orders" DROP COLUMN IF EXISTS "modules";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN IF EXISTS "period";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN IF EXISTS "monthly_leads_limit";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN IF EXISTS "amount_cents";
--> statement-breakpoint
ALTER TABLE "order_action_logs" DROP COLUMN IF EXISTS "action";
