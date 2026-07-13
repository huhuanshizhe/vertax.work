import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { isTradePaid, newOutTradeNo, queryTrade } from "@/lib/alipay/client";
import { isAlipayConfigured } from "@/lib/alipay/config";
import { appendOrderLog } from "@/server/admin/orders";
import { resolvePaymentMode } from "@/server/site/settings";

export async function GET(
  _req: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { orderNumber } = await context.params;
  const mode = await resolvePaymentMode();

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
        paid: true,
        paymentStatus: order.paymentStatus,
        mode,
      });
    }

    if (!isAlipayConfigured(mode)) {
      return NextResponse.json({
        paid: false,
        paymentStatus: order.paymentStatus,
        mode,
        error: "支付宝未配置",
      });
    }

    const outTradeNo = newOutTradeNo(order.orderNumber);
    const query = await queryTrade({ mode, outTradeNo });

    if (isTradePaid(query.tradeStatus)) {
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
        detail: `支付宝支付成功（${mode}）${query.tradeNo ? ` trade_no=${query.tradeNo}` : ""}`,
        actorType: "user",
        actorId: session.user.id,
      });

      return NextResponse.json({
        paid: true,
        paymentStatus: "paid",
        mode,
        tradeStatus: query.tradeStatus,
        tradeNo: query.tradeNo,
      });
    }

    return NextResponse.json({
      paid: false,
      paymentStatus: order.paymentStatus,
      mode,
      tradeStatus: query.tradeStatus || null,
      alipayCode: query.code,
      alipayMsg: query.msg,
    });
  } catch (error) {
    console.error("Alipay status error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "查询支付状态失败",
        paid: false,
        mode,
      },
      { status: 500 }
    );
  }
}
