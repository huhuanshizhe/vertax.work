import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { inquiries, inquiryMessages } from "@/db/schema";
import { createId } from "@/lib/ids";
import { getInquiryDetail } from "@/server/admin/inquiries";

const schema = z.object({
  body: z.string().min(1),
});

export async function POST(
  req: Request,
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

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入回复内容" }, { status: 400 });
  }

  const now = new Date();
  await db.insert(inquiryMessages).values({
    id: createId("msg"),
    inquiryId: id,
    senderType: "admin",
    adminId: session.user.id,
    body: parsed.data.body.trim(),
    createdAt: now,
  });

  await db
    .update(inquiries)
    .set({
      awaitingAdmin: false,
      status: "contacted",
      lastMessageAt: now,
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(inquiries.id, id));

  return NextResponse.json({ success: true });
}
