import { count, desc, eq } from "drizzle-orm";
import { Card, Col, Row, Statistic } from "antd";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { AdminShell } from "@/components/admin/admin-shell";
import { formatYuanFromCents } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [total] = await db.select({ value: count() }).from(orders);
  const [paid] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.status, "paid"));
  const [unpaid] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.status, "unpaid"));

  const recentPaid = await db
    .select()
    .from(orders)
    .where(eq(orders.status, "paid"))
    .orderBy(desc(orders.paidAt))
    .limit(50);

  const revenueCents = recentPaid.reduce((s, o) => s + o.amountCents, 0);

  return (
    <AdminShell>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="订单总数" value={total?.value ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="已支付" value={paid?.value ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="待支付" value={unpaid?.value ?? 0} />
          </Card>
        </Col>
        <Col xs={24}>
          <Card>
            <Statistic
              title="已支付金额（抽样最近 50 笔合计）"
              prefix="¥"
              value={formatYuanFromCents(revenueCents)}
            />
          </Card>
        </Col>
      </Row>
    </AdminShell>
  );
}
