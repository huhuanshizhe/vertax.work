import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { createId, createOrderNumber } from "@/lib/ids";
import {
  isLicensePeriod,
  isPaidModule,
  type PaidModule,
} from "@/lib/pricing";
import { appendOrderLog } from "@/server/admin/orders";
import { calcOrderAmountFromDb } from "@/server/site/license-prices";
import { getRadarMonthlyLeadsLimit } from "@/server/site/settings";

const schema = z.object({
  modules: z.array(z.string()).min(1),
  period: z.string(),
  contactName: z.string().min(1),
  companyName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  note: z.string().optional(),
  paymentMethod: z.enum(["alipay"]).default("alipay"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "订单信息不完整" }, { status: 400 });
    }

    if (!isLicensePeriod(parsed.data.period)) {
      return NextResponse.json({ error: "无效的授权时长" }, { status: 400 });
    }

    const modules = [...new Set(parsed.data.modules)].filter(
      isPaidModule
    ) as PaidModule[];
    if (modules.length === 0) {
      return NextResponse.json({ error: "请至少选择一个模块" }, { status: 400 });
    }

    const amountCents = await calcOrderAmountFromDb(
      modules,
      parsed.data.period
    );
    const monthlyLeadsLimit = await getRadarMonthlyLeadsLimit();
    const id = createId("ord");
    const orderNumber = createOrderNumber();
    const now = new Date();

    await db.insert(orders).values({
      id,
      orderNumber,
      userId: session.user.id,
      status: "unpaid",
      paymentStatus: "unpaid",
      shippingStatus: "unshipped",
      refundStatus: "none",
      paymentMethod: parsed.data.paymentMethod,
      subtotalCents: amountCents,
      totalAmountCents: amountCents,
      currency: "CNY",
      contactName: parsed.data.contactName.trim(),
      companyName: parsed.data.companyName.trim(),
      contactEmail: parsed.data.contactEmail.trim().toLowerCase(),
      contactPhone: parsed.data.contactPhone.trim(),
      note: parsed.data.note?.trim() || null,
      placedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(orderItems).values({
      id: createId("oit"),
      orderId: id,
      productName: "VertaX 模块授权",
      featureSelections: {
        modules,
        period: parsed.data.period,
        monthlyLeadsLimit,
      },
      quantity: 1,
      unitPriceCents: amountCents,
      subtotalCents: amountCents,
      createdAt: now,
    });

    await appendOrderLog({
      orderId: id,
      actionType: "created",
      detail: "用户提交订单",
      actorType: "user",
      actorId: session.user.id,
    });

    return NextResponse.json(
      { success: true, orderNumber, id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
