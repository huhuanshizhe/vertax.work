import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { getInquiryDetail } from "@/server/admin/inquiries";

const schema = z.object({
  salesStatus: z.string().optional(),
  internalNote: z.string().optional(),
  status: z.string().optional(),
});

export async function PATCH(
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
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  await db
    .update(inquiries)
    .set({
      ...(parsed.data.salesStatus
        ? { salesStatus: parsed.data.salesStatus }
        : {}),
      ...(parsed.data.internalNote !== undefined
        ? { internalNote: parsed.data.internalNote }
        : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(inquiries.id, id));

  return NextResponse.json({ success: true });
}
