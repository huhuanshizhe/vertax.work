import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { orderActionLogs, orders } from "@/db/schema";
import { createId, createOrderNumber } from "@/lib/ids";
import {
  DEFAULT_MONTHLY_LEADS_LIMIT,
  calcOrderAmountCents,
  isLicensePeriod,
  isPaidModule,
  type PaidModule,
} from "@/lib/pricing";

const schema = z.object({
  modules: z.array(z.string()).min(1),
  period: z.string(),
  contactName: z.string().min(1),
  companyName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  note: z.string().optional(),
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

    const modules = [...new Set(parsed.data.modules)].filter(isPaidModule) as PaidModule[];
    if (modules.length === 0) {
      return NextResponse.json({ error: "请至少选择一个模块" }, { status: 400 });
    }

    const amountCents = calcOrderAmountCents(modules, parsed.data.period);
    const id = createId("ord");
    const orderNumber = createOrderNumber();
    const now = new Date();

    await db.insert(orders).values({
      id,
      orderNumber,
      userId: session.user.id,
      status: "unpaid",
      paymentStatus: "unpaid",
      paymentMethod: "alipay",
      modules: JSON.stringify(modules),
      period: parsed.data.period,
      monthlyLeadsLimit: DEFAULT_MONTHLY_LEADS_LIMIT,
      amountCents,
      currency: "CNY",
      contactName: parsed.data.contactName.trim(),
      companyName: parsed.data.companyName.trim(),
      contactEmail: parsed.data.contactEmail.trim().toLowerCase(),
      contactPhone: parsed.data.contactPhone.trim(),
      note: parsed.data.note?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(orderActionLogs).values({
      id: createId("log"),
      orderId: id,
      action: "created",
      detail: "用户提交订单",
      actorType: "user",
      actorId: session.user.id,
    });

    return NextResponse.json({ success: true, orderNumber, id }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
