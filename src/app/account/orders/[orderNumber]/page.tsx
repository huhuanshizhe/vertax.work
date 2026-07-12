import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
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

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orderNumber } = await params;
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(eq(orders.orderNumber, orderNumber), eq(orders.userId, session.user.id))
    )
    .limit(1);

  if (!order) notFound();

  const mods = (JSON.parse(order.modules) as string[]).filter(
    isPaidModule
  ) as PaidModule[];

  return (
    <div className="max-w-2xl">
      <Link href="/account/orders" className="text-sm text-slate-500 hover:text-slate-800">
        ← 返回订单列表
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
      <div className="mt-6 space-y-3 rounded-[24px] border border-slate-200 bg-white p-6 text-sm shadow-sm">
        <p>
          <span className="text-slate-500">状态：</span>
          {statusLabel[order.status] || order.status}
        </p>
        <p>
          <span className="text-slate-500">模块：</span>
          {mods.map((m) => MODULE_LABELS[m]).join("、")}
        </p>
        <p>
          <span className="text-slate-500">时长：</span>
          {isLicensePeriod(order.period) ? PERIOD_LABELS[order.period] : order.period}
        </p>
        <p>
          <span className="text-slate-500">获客上限：</span>
          {order.monthlyLeadsLimit}/月
        </p>
        <p>
          <span className="text-slate-500">金额：</span>¥
          {formatYuanFromCents(order.amountCents)}
        </p>
        <p>
          <span className="text-slate-500">联系人：</span>
          {order.contactName} / {order.companyName}
        </p>
        <p>
          <span className="text-slate-500">邮箱 / 手机：</span>
          {order.contactEmail} / {order.contactPhone}
        </p>
        {order.paidAt ? (
          <p>
            <span className="text-slate-500">支付时间：</span>
            {order.paidAt.toLocaleString("zh-CN")}
          </p>
        ) : null}
      </div>

      {order.status === "unpaid" ? (
        <Link
          href={`/pay/${order.orderNumber}`}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#3B82F6] px-5 text-sm font-semibold text-white"
        >
          继续支付
        </Link>
      ) : null}
    </div>
  );
}
