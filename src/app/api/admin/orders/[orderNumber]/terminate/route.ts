import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { appendOrderLog, getAdminOrderByNumber } from "@/server/admin/orders";

export async function POST(
  _req: Request,
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

  const now = new Date();
  await db
    .update(orders)
    .set({
      status: "terminated",
      terminatedAt: now,
      terminatedBy: session.user.email || session.user.id,
      updatedAt: now,
    })
    .where(eq(orders.id, detail.order.id));

  await appendOrderLog({
    orderId: detail.order.id,
    actionType: "terminated",
    detail: "管理员标记终止",
    actorType: "admin",
    actorId: session.user.id,
  });

  return NextResponse.json({ success: true });
}
