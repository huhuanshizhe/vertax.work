import { and, count, desc, eq, sql } from "drizzle-orm";
import { Card, Col, Row, Statistic } from "antd";
import { AdminShell } from "@/components/admin/admin-shell";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { formatYuanFromCents } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";
  const [total] = await db.select({ value: count() }).from(orders);
  const [paid] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.paymentStatus, "paid"));
  const [pending] = await db
    .select({ value: count() })
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending_processing"),
        eq(orders.paymentStatus, "paid")
      )
    );
  const [unpaid] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.paymentStatus, "unpaid"));

  const [revenue] = await db
    .select({
      value: sql<number>`coalesce(sum(${orders.totalAmountCents}), 0)::int`,
    })
    .from(orders)
    .where(eq(orders.paymentStatus, "paid"));

  const recent = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(8);

  return (
    <AdminShell siteUrl={siteUrl}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="订单总数" value={total?.value ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="已付款" value={paid?.value ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="待处理" value={pending?.value ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="待支付" value={unpaid?.value ?? 0} />
          </Card>
        </Col>
        <Col xs={24}>
          <Card>
            <Statistic
              title="已付金额合计"
              prefix="¥"
              value={formatYuanFromCents(revenue?.value ?? 0)}
            />
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="最近订单">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {recent.map((o) => (
                <li key={o.id}>
                  <a href={`/admin/orders/${o.orderNumber}`}>
                    {o.orderNumber}
                  </a>{" "}
                  · {o.contactName} · ¥
                  {formatYuanFromCents(o.totalAmountCents)} · {o.status}
                </li>
              ))}
            </ul>
          </Card>
        </Col>
      </Row>
    </AdminShell>
  );
}
