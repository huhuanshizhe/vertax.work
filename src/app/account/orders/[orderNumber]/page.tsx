import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth/user-auth";
import { LicenseDeliveryCard } from "@/components/account/license-delivery-card";
import { OrderFulfillmentProgress } from "@/components/account/order-fulfillment-progress";
import { db } from "@/db";
import { orderItems, orders, orderShipments } from "@/db/schema";
import {
  getCustomerOrderBadge,
  getCustomerOrderDetailCopy,
} from "@/lib/admin-display";
import { tryDecodeLicensePayload } from "@/lib/license/crypto";
import {
  MODULE_LABELS,
  PERIOD_LABELS,
  formatYuanFromCents,
  isLicensePeriod,
  isPaidModule,
  type PaidModule,
} from "@/lib/pricing";
import { featuresFromItem } from "@/server/admin/orders";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orderNumber } = await params;
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.orderNumber, orderNumber),
        eq(orders.userId, session.user.id)
      )
    )
    .limit(1);

  if (!order) notFound();

  const [item] = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .limit(1);

  const shipments = await db
    .select()
    .from(orderShipments)
    .where(eq(orderShipments.orderId, order.id))
    .orderBy(desc(orderShipments.shippedAt));

  const features = featuresFromItem(item);
  const mods = features.modules.filter(isPaidModule) as PaidModule[];
  const badge = getCustomerOrderBadge(order);
  const detailCopy = getCustomerOrderDetailCopy(order);
  const paid = order.paymentStatus === "paid";
  const delivered = shipments.length > 0 || order.shippingStatus === "shipped";
  const configuring = paid && !delivered;
  const latest = shipments[0];
  const payload = latest
    ? tryDecodeLicensePayload(latest.trackingNumber)
    : null;

  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/account/orders"
        className="text-sm text-slate-500 hover:text-slate-800"
      >
        ← 返回订单列表
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {order.orderNumber}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{detailCopy}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {badge.badge}
        </span>
      </div>

      <div className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-6 text-sm shadow-sm">
        <p>
          <span className="text-slate-500">模块：</span>
          {mods.map((m) => MODULE_LABELS[m]).join("、") || "—"}
        </p>
        <p>
          <span className="text-slate-500">时长：</span>
          {isLicensePeriod(features.period)
            ? PERIOD_LABELS[features.period]
            : features.period}
        </p>
        <p>
          <span className="text-slate-500">获客上限：</span>
          {features.monthlyLeadsLimit}/月
        </p>
        <p>
          <span className="text-slate-500">金额：</span>¥
          {formatYuanFromCents(order.totalAmountCents)}
        </p>
        <p>
          <span className="text-slate-500">联系人：</span>
          {order.contactName} / {order.companyName}
        </p>
        {order.paidAt ? (
          <p>
            <span className="text-slate-500">支付时间：</span>
            {order.paidAt.toLocaleString("zh-CN")}
          </p>
        ) : null}
      </div>

      {paid ? (
        <OrderFulfillmentProgress
          paid={paid}
          configuring={configuring}
          delivered={delivered}
        />
      ) : null}

      {latest ? (
        <LicenseDeliveryCard
          code={latest.trackingNumber}
          shippedAtLabel={latest.shippedAt.toLocaleString("zh-CN")}
          moduleLabels={
            payload
              ? payload.modules.map(
                  (m) => MODULE_LABELS[m as PaidModule] || m
                )
              : mods.map((m) => MODULE_LABELS[m])
          }
          expiresAtLabel={
            payload
              ? new Date(payload.expires_at).toLocaleString("zh-CN")
              : null
          }
        />
      ) : null}

      {order.paymentStatus === "unpaid" && order.status === "unpaid" ? (
        <Link
          href={`/pay/${order.orderNumber}`}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#3B82F6] px-5 text-sm font-semibold text-white"
        >
          继续支付
        </Link>
      ) : null}
    </div>
  );
}
