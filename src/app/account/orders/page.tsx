import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { orderItems, orders, orderShipments } from "@/db/schema";
import { getCustomerOrderBadge } from "@/lib/admin-display";
import {
  MODULE_LABELS,
  PERIOD_LABELS,
  formatYuanFromCents,
  isLicensePeriod,
  isPaidModule,
  type PaidModule,
} from "@/lib/pricing";
import { featuresFromItem } from "@/server/admin/orders";

export default async function AccountOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/orders");

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt));

  const orderIds = rows.map((r) => r.id);
  const items =
    orderIds.length === 0
      ? []
      : await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds));
  const shipments =
    orderIds.length === 0
      ? []
      : await db
          .select()
          .from(orderShipments)
          .where(inArray(orderShipments.orderId, orderIds));

  const itemMap = new Map<string, (typeof items)[number]>();
  for (const item of items) {
    if (!itemMap.has(item.orderId)) itemMap.set(item.orderId, item);
  }
  const shipmentSet = new Set(shipments.map((s) => s.orderId));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">我的订单</h1>
      <p className="mt-2 text-sm text-slate-500">
        查看购买记录、开通进度与授权码。
      </p>

      <div className="mt-8 space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
            暂无订单。{" "}
            <Link href="/plans" className="text-[#2563EB]">
              去购买
            </Link>
          </div>
        ) : (
          rows.map((order) => {
            const features = featuresFromItem(itemMap.get(order.id));
            const mods = features.modules.filter(isPaidModule) as PaidModule[];
            const badge = getCustomerOrderBadge(order);
            const hasLicense = shipmentSet.has(order.id);
            const toneClass =
              badge.tone === "success"
                ? "bg-emerald-50 text-emerald-700"
                : badge.tone === "warning"
                  ? "bg-amber-50 text-amber-700"
                  : badge.tone === "info"
                    ? "bg-sky-50 text-sky-700"
                    : badge.tone === "danger"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-slate-100 text-slate-600";

            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.orderNumber}`}
                className="block rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {order.orderNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {mods.map((m) => MODULE_LABELS[m]).join("、") || "—"} ·{" "}
                      {isLicensePeriod(features.period)
                        ? PERIOD_LABELS[features.period]
                        : features.period}
                    </p>
                    {hasLicense ? (
                      <p className="mt-2 text-sm font-medium text-emerald-700">
                        授权码已就绪 · 查看
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      ¥{formatYuanFromCents(order.totalAmountCents)}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}
                    >
                      {badge.badge}
                    </span>
                    <p className="mt-2 text-xs text-slate-400">
                      {order.createdAt.toLocaleString("zh-CN")}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
