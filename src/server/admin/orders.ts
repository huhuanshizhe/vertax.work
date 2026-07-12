import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  orderActionLogs,
  orderItems,
  orders,
  orderShipments,
  type Order,
  type OrderActionLog,
  type OrderItem,
  type OrderItemFeatures,
  type OrderShipment,
} from "@/db/schema";
import { createId } from "@/lib/ids";
import {
  MODULE_LABELS,
  PERIOD_LABELS,
  formatYuanFromCents,
  isLicensePeriod,
  isPaidModule,
  type PaidModule,
} from "@/lib/pricing";
import {
  isHistoryOrder,
  isProcessedOrder,
  isRefundOrder,
} from "@/lib/admin-display";

export type AdminOrderDetail = {
  order: Order;
  items: OrderItem[];
  shipments: OrderShipment[];
  logs: OrderActionLog[];
};

export function featuresFromItem(
  item: OrderItem | undefined
): OrderItemFeatures {
  if (!item?.featureSelections) {
    return { modules: [], period: "month", monthlyLeadsLimit: 500 };
  }
  return item.featureSelections;
}

export function summarizeFeatures(features: OrderItemFeatures) {
  const modules = features.modules.filter(isPaidModule) as PaidModule[];
  return {
    modules,
    moduleLabels: modules.map((m) => MODULE_LABELS[m]),
    periodLabel: isLicensePeriod(features.period)
      ? PERIOD_LABELS[features.period]
      : features.period,
    monthlyLeadsLimit: features.monthlyLeadsLimit,
    amountLabel: "",
  };
}

export async function getAdminOrderByNumber(
  orderNumber: string
): Promise<AdminOrderDetail | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  if (!order) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.createdAt));

  const shipments = await db
    .select()
    .from(orderShipments)
    .where(eq(orderShipments.orderId, order.id))
    .orderBy(desc(orderShipments.shippedAt));

  const logs = await db
    .select()
    .from(orderActionLogs)
    .where(eq(orderActionLogs.orderId, order.id))
    .orderBy(desc(orderActionLogs.createdAt));

  return { order, items, shipments, logs };
}

export async function listPendingOrders() {
  return db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending_processing"),
        eq(orders.paymentStatus, "paid")
      )
    )
    .orderBy(desc(orders.paidAt), desc(orders.createdAt))
    .limit(200);
}

export async function listProcessedOrders() {
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        inArray(orders.status, ["partially_shipped", "shipped"]),
        ne(orders.refundStatus, "pending")
      )
    )
    .orderBy(desc(orders.updatedAt))
    .limit(200);
  return rows.filter(isProcessedOrder);
}

export async function listRefundOrders() {
  return db
    .select()
    .from(orders)
    .where(
      inArray(orders.refundStatus, [
        "pending",
        "refunded",
        "partially_refunded",
      ])
    )
    .orderBy(desc(orders.updatedAt))
    .limit(200);
}

export async function listHistoryOrders() {
  const rows = await db
    .select()
    .from(orders)
    .where(
      or(
        inArray(orders.status, ["completed", "cancelled", "terminated"]),
        inArray(orders.refundStatus, [
          "refunded",
          "partially_refunded",
          "refund_rejected",
        ])
      )
    )
    .orderBy(desc(orders.updatedAt))
    .limit(200);
  return rows.filter(isHistoryOrder);
}

export async function getOrderItemsMap(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, OrderItem[]>();
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));
  const map = new Map<string, OrderItem[]>();
  for (const item of items) {
    const list = map.get(item.orderId) || [];
    list.push(item);
    map.set(item.orderId, list);
  }
  return map;
}

export async function getShipmentCountMap(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, number>();
  const rows = await db
    .select({
      orderId: orderShipments.orderId,
      count: sql<number>`count(*)::int`,
    })
    .from(orderShipments)
    .where(inArray(orderShipments.orderId, orderIds))
    .groupBy(orderShipments.orderId);
  return new Map(rows.map((r) => [r.orderId, r.count]));
}

export function formatOrderMoney(cents: number) {
  return `¥${formatYuanFromCents(cents)}`;
}

export async function appendOrderLog(input: {
  orderId: string;
  actionType: string;
  detail?: string;
  actorType: string;
  actorId?: string | null;
}) {
  await db.insert(orderActionLogs).values({
    id: createId("log"),
    orderId: input.orderId,
    actionType: input.actionType,
    detail: input.detail || null,
    actorType: input.actorType,
    actorId: input.actorId || null,
  });
}
