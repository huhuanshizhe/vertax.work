import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
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

export default async function AccountOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/orders");

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">我的订单</h1>
      <p className="mt-2 text-sm text-slate-500">查看授权购买记录与支付状态。</p>

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
            const mods = (JSON.parse(order.modules) as string[]).filter(
              isPaidModule
            ) as PaidModule[];
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.orderNumber}`}
                className="block rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {mods.map((m) => MODULE_LABELS[m]).join("、")} ·{" "}
                      {isLicensePeriod(order.period)
                        ? PERIOD_LABELS[order.period]
                        : order.period}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      ¥{formatYuanFromCents(order.amountCents)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {statusLabel[order.status] || order.status}
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
