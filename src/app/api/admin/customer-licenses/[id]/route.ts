import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { customerLicenses } from "@/db/schema";

const patchSchema = z.object({
  enabled: z.boolean(),
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
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

    const [updated] = await db
      .update(customerLicenses)
      .set({ enabled: parsed.data.enabled })
      .where(eq(customerLicenses.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "授权码不存在" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      id: updated.id,
      enabled: updated.enabled,
    });
  } catch (error) {
    console.error("Patch customer license error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const [deleted] = await db
      .delete(customerLicenses)
      .where(eq(customerLicenses.id, id))
      .returning({ id: customerLicenses.id });

    if (!deleted) {
      return NextResponse.json({ error: "授权码不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete customer license error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
