import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { appendOrderLog, getAdminOrderByNumber } from "@/server/admin/orders";

const patchSchema = z.object({
  status: z.string().optional(),
  refundStatus: z.string().optional(),
  internalNote: z.string().optional(),
});

export async function PATCH(
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

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  const now = new Date();
  const updates: Partial<typeof orders.$inferInsert> = { updatedAt: now };
  const changes: string[] = [];

  if (parsed.data.status && parsed.data.status !== detail.order.status) {
    updates.status = parsed.data.status;
    changes.push(`状态→${parsed.data.status}`);
  }
  if (
    parsed.data.refundStatus &&
    parsed.data.refundStatus !== detail.order.refundStatus
  ) {
    updates.refundStatus = parsed.data.refundStatus;
    changes.push(`退款→${parsed.data.refundStatus}`);
  }
  if (parsed.data.internalNote !== undefined) {
    updates.internalNote = parsed.data.internalNote;
    changes.push("更新内部备注");
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ success: true });
  }

  await db.update(orders).set(updates).where(eq(orders.id, detail.order.id));
  await appendOrderLog({
    orderId: detail.order.id,
    actionType: parsed.data.status ? "status_change" : "note_updated",
    detail: changes.join("；"),
    actorType: "admin",
    actorId: session.user.id,
  });

  return NextResponse.json({ success: true });
}
