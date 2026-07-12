import { AdminShell } from "@/components/admin/admin-shell";
import { OrderPendingCard } from "@/components/admin/order-pending-card";
import { OrderViewSwitch } from "@/components/admin/order-view-switch";
import {
  featuresFromItem,
  formatOrderMoney,
  getOrderItemsMap,
  listPendingOrders,
  summarizeFeatures,
} from "@/server/admin/orders";

export const dynamic = "force-dynamic";

export default async function AdminPendingOrdersPage() {
  const rows = await listPendingOrders();
  const itemsMap = await getOrderItemsMap(rows.map((r) => r.id));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";

  return (
    <AdminShell siteUrl={siteUrl}>
      <div style={{ marginBottom: 8 }}>
        <h2 className="admin-page-title">订单管理</h2>
        <p className="admin-page-desc">
          查看已付款待处理订单，跟进授权开通与履约。
        </p>
      </div>
      <OrderViewSwitch pendingCount={rows.length} />
      <div className="info-grid">
        {rows.length === 0 ? (
          <div
            className="info-card"
            style={{
              gridColumn: "1 / -1",
              padding: 40,
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            暂无待处理订单
          </div>
        ) : (
          rows.map((order) => {
            const item = itemsMap.get(order.id)?.[0];
            const features = featuresFromItem(item);
            const summary = summarizeFeatures(features);
            return (
              <OrderPendingCard
                key={order.id}
                order={{
                  orderNumber: order.orderNumber,
                  contactName: order.contactName,
                  contactEmail: order.contactEmail,
                  amountLabel: formatOrderMoney(order.totalAmountCents),
                  moduleLabels: summary.moduleLabels,
                  periodLabel: summary.periodLabel,
                  paymentMethod: order.paymentMethod,
                  placedAtLabel: (
                    order.placedAt || order.createdAt
                  ).toLocaleString("zh-CN"),
                }}
              />
            );
          })
        )}
      </div>
    </AdminShell>
  );
}
