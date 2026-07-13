import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import {
  createPagePayForm,
  newOutTradeNo,
} from "@/lib/alipay/client";
import { formatYuanFromCents } from "@/lib/pricing";
import { resolvePaymentMode } from "@/server/site/settings";
import { isAlipayConfigured } from "@/lib/alipay/config";

export async function POST(
  _req: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { orderNumber } = await context.params;
  const mode = await resolvePaymentMode();

  if (!isAlipayConfigured(mode)) {
    return NextResponse.json(
      {
        error:
          mode === "test"
            ? "支付宝沙盒未配置，请在环境变量填写 ALIPAY_SANDBOX_*"
            : "支付宝 Live 未配置，请填写 ALIPAY_LIVE_*",
        mode,
      },
      { status: 503 }
    );
  }

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
        alreadyPaid: true,
        orderNumber,
        mode,
      });
    }

    if (order.status === "cancelled" || order.status === "terminated") {
      return NextResponse.json({ error: "订单已取消" }, { status: 400 });
    }

    const outTradeNo = newOutTradeNo(order.orderNumber);
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";
    const returnUrl = `${siteUrl}/pay/${encodeURIComponent(order.orderNumber)}?returning=1`;

    const { formHtml, outTradeNo: tradeNo, gateway, payParams } =
      await createPagePayForm({
        mode,
        outTradeNo,
        totalAmountYuan: formatYuanFromCents(order.totalAmountCents),
        subject: `VertaX 授权 ${order.orderNumber}`,
        returnUrl,
      });

    return NextResponse.json({
      formHtml,
      outTradeNo: tradeNo,
      gateway,
      payParams,
      mode,
      amountYuan: formatYuanFromCents(order.totalAmountCents),
    });
  } catch (error) {
    console.error("Alipay create error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "创建支付宝订单失败",
        mode,
      },
      { status: 500 }
    );
  }
}
