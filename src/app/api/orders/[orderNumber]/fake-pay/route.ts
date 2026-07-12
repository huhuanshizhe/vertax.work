import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { appendOrderLog } from "@/server/admin/orders";

export async function POST(
  _req: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { orderNumber } = await context.params;

  try {
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

    if (order.paymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        orderNumber,
        alreadyPaid: true,
      });
    }

    if (order.status === "cancelled" || order.status === "terminated") {
      return NextResponse.json({ error: "订单已取消" }, { status: 400 });
    }

    const now = new Date();
    await db
      .update(orders)
      .set({
        status: "pending_processing",
        paymentStatus: "paid",
        paymentMethod: "alipay",
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    await appendOrderLog({
      orderId: order.id,
      actionType: "paid",
      detail: "假支付宝支付成功",
      actorType: "user",
      actorId: session.user.id,
    });

    return NextResponse.json({ success: true, orderNumber });
  } catch (error) {
    console.error("Fake pay error:", error);
    return NextResponse.json({ error: "支付失败" }, { status: 500 });
  }
}
