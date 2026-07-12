import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, Descriptions, Tag } from "antd";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { AdminShell } from "@/components/admin/admin-shell";
import { CancelOrderButton } from "@/components/admin/cancel-order-button";
import {
  MODULE_LABELS,
  PERIOD_LABELS,
  formatYuanFromCents,
  isLicensePeriod,
  isPaidModule,
  type PaidModule,
} from "@/lib/pricing";

const statusLabel: Record<string, string> = {
  unpaid: "待支付",
  paid: "已支付",
  cancelled: "已取消",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();

  const mods = (JSON.parse(order.modules) as string[]).filter(
    isPaidModule
  ) as PaidModule[];

  return (
    <AdminShell>
      <div style={{ marginBottom: 16 }}>
        <Link href="/admin/orders">← 返回列表</Link>
      </div>
      <Card
        title={order.orderNumber}
        extra={
          order.status === "unpaid" ? (
            <CancelOrderButton orderId={order.id} />
          ) : null
        }
      >
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="状态">
            <Tag>{statusLabel[order.status] || order.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="支付状态">{order.paymentStatus}</Descriptions.Item>
          <Descriptions.Item label="支付方式">{order.paymentMethod}</Descriptions.Item>
          <Descriptions.Item label="模块">
            {mods.map((m) => MODULE_LABELS[m]).join("、")}
          </Descriptions.Item>
          <Descriptions.Item label="时长">
            {isLicensePeriod(order.period)
              ? PERIOD_LABELS[order.period]
              : order.period}
          </Descriptions.Item>
          <Descriptions.Item label="获客上限">
            {order.monthlyLeadsLimit}/月
          </Descriptions.Item>
          <Descriptions.Item label="金额">
            ¥{formatYuanFromCents(order.amountCents)}
          </Descriptions.Item>
          <Descriptions.Item label="公司">{order.companyName}</Descriptions.Item>
          <Descriptions.Item label="联系人">{order.contactName}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{order.contactEmail}</Descriptions.Item>
          <Descriptions.Item label="手机">{order.contactPhone}</Descriptions.Item>
          <Descriptions.Item label="备注">{order.note || "-"}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {order.createdAt.toLocaleString("zh-CN")}
          </Descriptions.Item>
          <Descriptions.Item label="支付时间">
            {order.paidAt ? order.paidAt.toLocaleString("zh-CN") : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </AdminShell>
  );
}
