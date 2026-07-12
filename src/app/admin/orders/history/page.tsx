import { AdminShell } from "@/components/admin/admin-shell";
import {
  OrderPaginatedTable,
  type OrderTableRow,
} from "@/components/admin/order-paginated-table";
import { OrderViewSwitch } from "@/components/admin/order-view-switch";
import {
  featuresFromItem,
  formatOrderMoney,
  getOrderItemsMap,
  listHistoryOrders,
  listPendingOrders,
  summarizeFeatures,
} from "@/server/admin/orders";

export const dynamic = "force-dynamic";

export default async function AdminHistoryOrdersPage() {
  const [pending, rows] = await Promise.all([
    listPendingOrders(),
    listHistoryOrders(),
  ]);
  const itemsMap = await getOrderItemsMap(rows.map((r) => r.id));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";

  const dataSource: OrderTableRow[] = rows.map((order) => {
    const summary = summarizeFeatures(
      featuresFromItem(itemsMap.get(order.id)?.[0])
    );
    return {
      key: order.id,
      orderNumber: order.orderNumber,
      contactName: order.contactName,
      contactEmail: order.contactEmail,
      companyName: order.companyName,
      modules: summary.moduleLabels.join("、") || "—",
      period: summary.periodLabel,
      amount: formatOrderMoney(order.totalAmountCents),
      status: order.status,
      paymentStatus: order.paymentStatus,
      refundStatus: order.refundStatus,
      createdAt: order.createdAt.toLocaleString("zh-CN"),
    };
  });

  return (
    <AdminShell siteUrl={siteUrl}>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>订单管理</h2>
        <p style={{ margin: "6px 0 0", color: "#64748b" }}>
          已完成、取消或终止的历史订单。
        </p>
      </div>
      <OrderViewSwitch pendingCount={pending.length} />
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 16,
          border: "1px solid #eef2f7",
        }}
      >
        <OrderPaginatedTable rows={dataSource} />
      </div>
    </AdminShell>
  );
}
