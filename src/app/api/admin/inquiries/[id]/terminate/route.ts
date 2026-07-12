import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { getInquiryDetail } from "@/server/admin/inquiries";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const detail = await getInquiryDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "询盘不存在" }, { status: 404 });
  }

  const now = new Date();
  await db
    .update(inquiries)
    .set({
      status: "closed",
      awaitingAdmin: false,
      terminatedAt: now,
      updatedAt: now,
    })
    .where(eq(inquiries.id, id));

  return NextResponse.json({ success: true });
}
