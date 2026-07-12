import { desc } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminOrdersTable } from "@/components/admin/admin-orders-table";
import {
  MODULE_LABELS,
  PERIOD_LABELS,
  formatYuanFromCents,
  isLicensePeriod,
  isPaidModule,
  type PaidModule,
} from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);

  const dataSource = rows.map((order) => {
    const mods = (JSON.parse(order.modules) as string[]).filter(
      isPaidModule
    ) as PaidModule[];
    return {
      key: order.id,
      id: order.id,
      orderNumber: order.orderNumber,
      modules: mods.map((m) => MODULE_LABELS[m]).join("、"),
      period: isLicensePeriod(order.period)
        ? PERIOD_LABELS[order.period]
        : order.period,
      amount: `¥${formatYuanFromCents(order.amountCents)}`,
      status: order.status,
      company: order.companyName,
      contact: order.contactName,
      createdAt: order.createdAt.toLocaleString("zh-CN"),
    };
  });

  return (
    <AdminShell>
      <AdminOrdersTable rows={dataSource} />
    </AdminShell>
  );
}
