import { desc, sql } from "drizzle-orm";
import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerListClient } from "@/components/admin/customer-list-client";
import { db } from "@/db";
import { orders, users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));

  const counts = await db
    .select({
      userId: orders.userId,
      value: sql<number>`count(*)::int`,
    })
    .from(orders)
    .groupBy(orders.userId);
  const countMap = new Map(counts.map((c) => [c.userId, c.value]));

  return (
    <AdminShell siteUrl={siteUrl}>
      <CustomerListClient
        rows={rows.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          company: u.company,
          phone: u.phone,
          status: u.status,
          internalNote: u.internalNote,
          orderCount: countMap.get(u.id) || 0,
          createdAt: u.createdAt.toLocaleString("zh-CN"),
        }))}
      />
    </AdminShell>
  );
}
