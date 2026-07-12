import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { orderActionLogs, orders } from "@/db/schema";
import { createId } from "@/lib/ids";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }
  if (order.status !== "unpaid") {
    return NextResponse.json({ error: "仅未支付订单可取消" }, { status: 400 });
  }

  await db
    .update(orders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(orders.id, id));

  await db.insert(orderActionLogs).values({
    id: createId("log"),
    orderId: id,
    action: "cancelled",
    detail: "管理员取消订单",
    actorType: "admin",
    actorId: session.user.id,
  });

  return NextResponse.json({ success: true });
}
