import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { users } from "@/db/schema";

const schema = z.object({
  status: z.string().optional(),
  internalNote: z.string().optional(),
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
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  await db
    .update(users)
    .set({
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.internalNote !== undefined
        ? { internalNote: parsed.data.internalNote }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  return NextResponse.json({ success: true });
}
