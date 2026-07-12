import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderDetailClient } from "@/components/admin/order-detail-client";
import {
  featuresFromItem,
  getAdminOrderByNumber,
} from "@/server/admin/orders";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const detail = await getAdminOrderByNumber(orderNumber);
  if (!detail) notFound();

  const item = detail.items[0];
  const features = featuresFromItem(item);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";

  return (
    <AdminShell siteUrl={siteUrl}>
      <OrderDetailClient
        orderNumber={detail.order.orderNumber}
        order={{
          status: detail.order.status,
          paymentStatus: detail.order.paymentStatus,
          shippingStatus: detail.order.shippingStatus,
          refundStatus: detail.order.refundStatus,
          paymentMethod: detail.order.paymentMethod,
          currency: detail.order.currency,
          subtotalCents: detail.order.subtotalCents,
          totalAmountCents: detail.order.totalAmountCents,
          contactName: detail.order.contactName,
          companyName: detail.order.companyName,
          contactEmail: detail.order.contactEmail,
          contactPhone: detail.order.contactPhone,
          note: detail.order.note,
          internalNote: detail.order.internalNote,
          paidAt: detail.order.paidAt?.toLocaleString("zh-CN") || null,
          placedAt: (detail.order.placedAt || detail.order.createdAt).toLocaleString(
            "zh-CN"
          ),
          terminatedAt:
            detail.order.terminatedAt?.toLocaleString("zh-CN") || null,
          terminatedBy: detail.order.terminatedBy,
        }}
        item={
          item
            ? {
                productName: item.productName,
                modules: features.modules,
                period: features.period,
                monthlyLeadsLimit: features.monthlyLeadsLimit,
                unitPriceCents: item.unitPriceCents,
                subtotalCents: item.subtotalCents,
              }
            : null
        }
        shipments={detail.shipments.map((s) => ({
          id: s.id,
          trackingNumber: s.trackingNumber,
          shippedAt: s.shippedAt.toLocaleString("zh-CN"),
          note: s.note,
        }))}
        logs={detail.logs.map((l) => ({
          id: l.id,
          actionType: l.actionType,
          detail: l.detail,
          createdAt: l.createdAt.toLocaleString("zh-CN"),
        }))}
      />
    </AdminShell>
  );
}
