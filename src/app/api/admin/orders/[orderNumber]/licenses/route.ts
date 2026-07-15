import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { orderShipments, orders } from "@/db/schema";
import { createId } from "@/lib/ids";
import { issueLicenseCode } from "@/server/admin/issue-license";
import { appendOrderLog, getAdminOrderByNumber } from "@/server/admin/orders";
import {
  LICENSE_TYPE_ORDER,
  LICENSE_USAGE_UNUSED,
} from "@/lib/license/usage";

const schema = z.object({
  modules: z.array(z.string()).min(1),
  period: z.string(),
  monthlyLeadsLimit: z.union([z.number(), z.null(), z.string()]).optional(),
  usageLimitMonths: z.union([z.number(), z.null(), z.string()]).optional(),
  expiresAt: z.string().optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { orderNumber } = await context.params;
  const detail = await getAdminOrderByNumber(orderNumber);
  if (!detail) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

    const orderUserId = String(detail.order.userId || "").trim();
    if (!orderUserId) {
      return NextResponse.json(
        { error: "订单缺少所属用户，无法签发授权码" },
        { status: 400 }
      );
    }

    const customerName =
      detail.order.companyName.trim() || detail.order.contactName.trim();

    const now = new Date();
    const shipmentId = createId("shp");
    const issued = issueLicenseCode({
      userId: orderUserId,
      licenseType: LICENSE_TYPE_ORDER,
      licenseId: shipmentId,
      customerName,
      modules: parsed.data.modules,
      period: parsed.data.period,
      monthlyLeadsLimit: parsed.data.monthlyLeadsLimit,
      usageLimitMonths: parsed.data.usageLimitMonths,
      expiresAt: parsed.data.expiresAt,
    });

    await db.insert(orderShipments).values({
      id: shipmentId,
      orderId: detail.order.id,
      trackingNumber: issued.code,
      shippedAt: now,
      note: `modules=${issued.modules.join(",")}; period=${issued.period}`,
      usageStatus: LICENSE_USAGE_UNUSED,
      usedAt: null,
      adminId: session.user.id,
      createdAt: now,
    });

    await db
      .update(orders)
      .set({
        shippingStatus: "shipped",
        status:
          detail.order.status === "pending_processing" ||
          detail.order.status === "partially_shipped"
            ? "shipped"
            : detail.order.status,
        updatedAt: now,
      })
      .where(eq(orders.id, detail.order.id));

    await appendOrderLog({
      orderId: detail.order.id,
      actionType: "shipment_added",
      detail: "生成授权码并回填",
      actorType: "admin",
      actorId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      code: issued.code,
      shipmentId,
      expiresAt: issued.expiresAtIso,
      usageStatus: LICENSE_USAGE_UNUSED,
    });
  } catch (error) {
    console.error("Generate license error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成授权码失败",
      },
      { status: 500 }
    );
  }
}
