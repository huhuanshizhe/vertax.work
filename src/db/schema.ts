import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

/** Order status aligned with vexmotor-admin (SaaS adapted). */
export const ORDER_STATUSES = [
  "unpaid",
  "pending_processing",
  "partially_shipped",
  "shipped",
  "completed",
  "cancelled",
  "terminated",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SHIPPING_STATUSES = ["unshipped", "shipped", "delivered"] as const;
export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

export const REFUND_STATUSES = [
  "none",
  "pending",
  "refunded",
  "partially_refunded",
  "refund_rejected",
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const ORDER_ACTION_TYPES = [
  "created",
  "paid",
  "status_change",
  "shipment_added",
  "terminated",
  "note_updated",
  "completed",
  "cancelled",
  "refund_updated",
] as const;
export type OrderActionType = (typeof ORDER_ACTION_TYPES)[number];

export const INQUIRY_STATUSES = ["new", "contacted", "quoted", "closed"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_QUEUE_KINDS = ["new_inquiry", "customer_replied"] as const;
export type InquiryQueueKind = (typeof INQUIRY_QUEUE_KINDS)[number];

export const INQUIRY_SALES_STATUSES = [
  "unset",
  "following",
  "negotiating",
  "won",
  "lost",
] as const;
export type InquirySalesStatus = (typeof INQUIRY_SALES_STATUSES)[number];

export type OrderItemFeatures = {
  modules: string[];
  period: string;
  monthlyLeadsLimit: number;
};

export type InquiryRfqPayload = {
  industry?: string;
  market?: string;
  priority?: string;
  message?: string;
  [key: string]: unknown;
};

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    company: text("company"),
    phone: text("phone"),
    status: text("status").notNull().default("active"),
    internalNote: text("internal_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_uidx").on(table.email)]
);

export const admins = pgTable(
  "admins",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("admins_email_uidx").on(table.email)]
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("unpaid"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    shippingStatus: text("shipping_status").notNull().default("unshipped"),
    refundStatus: text("refund_status").notNull().default("none"),
    paymentMethod: text("payment_method").notNull().default("alipay"),
    subtotalCents: integer("subtotal_cents").notNull(),
    totalAmountCents: integer("total_amount_cents").notNull(),
    currency: text("currency").notNull().default("CNY"),
    contactName: text("contact_name").notNull(),
    companyName: text("company_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    note: text("note"),
    internalNote: text("internal_note"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    terminatedAt: timestamp("terminated_at", { withTimezone: true }),
    terminatedBy: text("terminated_by"),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_order_number_uidx").on(table.orderNumber),
    index("orders_user_id_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
    index("orders_payment_status_idx").on(table.paymentStatus),
    index("orders_created_at_idx").on(table.createdAt),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productName: text("product_name").notNull(),
    featureSelections: jsonb("feature_selections")
      .$type<OrderItemFeatures>()
      .notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)]
);

/** trackingNumber stores VERTAX1 license code (SaaS fulfillment). */
export const orderShipments = pgTable(
  "order_shipments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    trackingNumber: text("tracking_number").notNull(),
    shippedAt: timestamp("shipped_at", { withTimezone: true }).notNull(),
    note: text("note"),
    adminId: text("admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("order_shipments_order_id_idx").on(table.orderId)]
);

/**
 * Manual / customer-service licenses, independent of orders.
 * Shares the same VERTAX1 signing logic as order_shipments.
 */
export const customerLicenses = pgTable(
  "customer_licenses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    modules: jsonb("modules").$type<string[]>().notNull(),
    period: text("period").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    monthlyLeadsLimit: integer("monthly_leads_limit").notNull().default(500),
    /** 使用时限（月）；-1 = 不限制 */
    usageLimitMonths: integer("usage_limit_months").notNull().default(1),
    /** 使用时限截止；不限制时为 null */
    usageExpiresAt: timestamp("usage_expires_at", { withTimezone: true }),
    enabled: boolean("enabled").notNull().default(true),
    payloadJson: jsonb("payload_json").$type<Record<string, unknown>>(),
    adminId: text("admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("customer_licenses_code_uidx").on(table.code),
    index("customer_licenses_user_id_idx").on(table.userId),
    index("customer_licenses_created_at_idx").on(table.createdAt),
  ]
);

export const orderActionLogs = pgTable(
  "order_action_logs",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    detail: text("detail"),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("order_action_logs_order_id_idx").on(table.orderId)]
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    company: text("company").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message"),
    status: text("status").notNull().default("new"),
    salesStatus: text("sales_status").notNull().default("unset"),
    awaitingAdmin: boolean("awaiting_admin").notNull().default(true),
    queueKind: text("queue_kind").notNull().default("new_inquiry"),
    rfqPayload: jsonb("rfq_payload").$type<InquiryRfqPayload>(),
    internalNote: text("internal_note"),
    note: text("note"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    terminatedAt: timestamp("terminated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("inquiries_status_idx").on(table.status),
    index("inquiries_awaiting_admin_idx").on(table.awaitingAdmin),
    index("inquiries_created_at_idx").on(table.createdAt),
  ]
);

export const inquiryMessages = pgTable(
  "inquiry_messages",
  {
    id: text("id").primaryKey(),
    inquiryId: text("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    senderType: text("sender_type").notNull(),
    adminId: text("admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("inquiry_messages_inquiry_id_idx").on(table.inquiryId)]
);

export type Inquiry = typeof inquiries.$inferSelect;
export type InquiryMessage = typeof inquiryMessages.$inferSelect;
export type User = typeof users.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderShipment = typeof orderShipments.$inferSelect;
export type CustomerLicense = typeof customerLicenses.$inferSelect;
export type OrderActionLog = typeof orderActionLogs.$inferSelect;

export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("default"),
  paymentSandboxMode: boolean("payment_sandbox_mode").notNull().default(true),
  /** 获客雷达：每月获客数量上限（前台展示 & 下单写入订单） */
  radarMonthlyLeadsLimit: integer("radar_monthly_leads_limit")
    .notNull()
    .default(500),
  /** 授权码使用时限（月）；-1 = 不限制；默认 1 */
  licenseUsageLimitMonths: integer("license_usage_limit_months")
    .notNull()
    .default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const licensePrices = pgTable(
  "license_prices",
  {
    id: text("id").primaryKey(),
    module: text("module").notNull(),
    period: text("period").notNull(),
    amountCents: integer("amount_cents").notNull(),
    /** 非月周期：是否按「月价 × 月数」自动计价 */
    autoFromMonthly: boolean("auto_from_monthly").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("license_prices_module_period_uidx").on(
      table.module,
      table.period
    ),
  ]
);

export type SiteSettings = typeof siteSettings.$inferSelect;
export type LicensePrice = typeof licensePrices.$inferSelect;
