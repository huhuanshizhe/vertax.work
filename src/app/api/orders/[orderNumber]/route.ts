import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import {
  MODULE_LABELS,
  PERIOD_LABELS,
  type LicensePeriod,
  type PaidModule,
} from "@/lib/pricing";
import { resolvePaymentMode } from "@/server/site/settings";
import { isAlipayConfigured } from "@/lib/alipay/config";

export async function GET(
  _req: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { orderNumber } = await context.params;

  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.orderNumber, orderNumber),
        eq(orders.userId, session.user.id)
      )
    )
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  const [item] = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .limit(1);

  const features = item?.featureSelections;
  const modules = (features?.modules ?? []) as PaidModule[];
  const period = (features?.period ?? "month") as LicensePeriod;
  const monthlyLeadsLimit =
    typeof features?.monthlyLeadsLimit === "number"
      ? features.monthlyLeadsLimit
      : null;
  const mode = await resolvePaymentMode();

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    totalAmountCents: order.totalAmountCents,
    currency: order.currency,
    contactName: order.contactName,
    companyName: order.companyName,
    modules: modules.map((m) => ({
      id: m,
      label: MODULE_LABELS[m] ?? m,
    })),
    period,
    periodLabel: PERIOD_LABELS[period] ?? period,
    quantity: item?.quantity ?? 1,
    monthlyLeadsLimit,
    paymentMode: mode,
    alipayConfigured: isAlipayConfigured(mode),
  });
}
